#!/usr/bin/env bash
set -euo pipefail

archive="$1"
port="$2"
release_id="$3"
app_root="/opt/ringstorp-run"
release_dir="$app_root/releases/$release_id"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"; rm -f "$archive" "$0"' EXIT

tar -xzf "$archive" -C "$staging"
test -f "$staging/dist/index.html"
test -f "$staging/deploy/static_server.py"
test -f "$staging/deploy/ringstorp-run.service"

install -d -m 0755 "$app_root/releases" "$release_dir/public"
cp -a "$staging/dist/." "$release_dir/public/"
install -m 0755 "$staging/deploy/static_server.py" "$release_dir/server.py"
chmod -R u=rwX,go=rX "$release_dir"
ln -sfn "$release_dir" "$app_root/current.next"
mv -Tf "$app_root/current.next" "$app_root/current"

sed "s/__PORT__/$port/g" "$staging/deploy/ringstorp-run.service" \
    | install -m 0644 /dev/stdin /etc/systemd/system/ringstorp-run.service
install -m 0755 "$staging/deploy/ringstorp-run-cert-renewal.sh" \
    /etc/letsencrypt/renewal-hooks/deploy/ringstorp-run.sh

systemctl daemon-reload
systemctl enable --now ringstorp-run.service
systemctl restart ringstorp-run.service

curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 \
    --resolve "dproxy.okab.tech:$port:127.0.0.1" \
    "https://dproxy.okab.tech:$port/" > /dev/null

find "$app_root/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr | tail -n +4 | cut -d' ' -f2- | xargs -r rm -rf

systemctl --no-pager --full status ringstorp-run.service