[CmdletBinding()]
param(
    [string]$HostName = "dproxy.okab.tech",
    [string]$SshUser = "azureuser",
    [string]$KeyPath = (Join-Path $PSScriptRoot "ssh\dproxy_key.pem"),
    [ValidateRange(1, 65535)]
    [int]$Port = 1998
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$remote = "${SshUser}@${HostName}"
$releaseId = Get-Date -Format "yyyyMMddHHmmss"
$remoteArchive = "/tmp/ringstorp-run-$releaseId.tar.gz"
$remoteInstaller = "/tmp/ringstorp-run-install-$releaseId.sh"
$localArchive = Join-Path ([System.IO.Path]::GetTempPath()) "ringstorp-run-$releaseId.tar.gz"
$sshArgs = @("-i", $KeyPath, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes")

foreach ($command in @("npm", "ssh", "scp", "tar")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command '$command' was not found."
    }
}

if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) {
    throw "SSH key not found: $KeyPath"
}

try {
    Push-Location $projectRoot
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Production build failed."
    }

    & tar -czf $localArchive dist deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create deployment archive."
    }

    & scp @sshArgs $localArchive (Join-Path $projectRoot "deploy\install.sh") "${remote}:/tmp/"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not upload deployment files."
    }

    & ssh @sshArgs $remote "mv /tmp/install.sh '$remoteInstaller' && sudo bash '$remoteInstaller' '$remoteArchive' '$Port' '$releaseId'"
    if ($LASTEXITCODE -ne 0) {
        throw "Remote deployment failed."
    }

    $response = Invoke-WebRequest -Uri "https://${HostName}:$Port/" -UseBasicParsing -TimeoutSec 20
    if ($response.StatusCode -ne 200) {
        throw "Public health check returned HTTP $($response.StatusCode)."
    }

    Write-Host "Deployed Ringstorp Run to https://${HostName}:$Port/"
}
finally {
    Pop-Location
    Remove-Item -LiteralPath $localArchive -Force -ErrorAction SilentlyContinue
}