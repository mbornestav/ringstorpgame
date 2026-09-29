import { readdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url), results = new URL('test-results/', root);
const directory = (await readdir(results)).find(name => name.startsWith('phaser-native-resolution-p-'));
if (!directory) throw new Error('Run the Phaser browser comparisons first.');
const actual = new URL(`${directory}/`, results), reference = new URL('tests/fixtures/corridor/', root);
const metrics = JSON.parse(await readFile(new URL('comparison.json', actual), 'utf8'));
const sections = [];
for (const m of metrics) {
  const before = (await readFile(new URL(`${m.name}.png`, reference))).toString('base64');
  const after = (await readFile(new URL(`${m.name}.png`, actual))).toString('base64');
  sections.push(`<section><h2>${m.name}</h2><p>Pixels differing by more than 8 channel levels: ${m.different} (${(m.fraction * 100).toFixed(3)}%). Outside dialogue glyph rows: ${m.outsideText}. Mean maximum-channel difference: ${m.mean.toFixed(3)}.</p><div class="pair"><figure><figcaption>Original Canvas</figcaption><img alt="Original ${m.name}" src="data:image/png;base64,${before}"></figure><figure><figcaption>Phaser 4.2.1</figcaption><img alt="Phaser ${m.name}" src="data:image/png;base64,${after}"></figure></div></section>`);
}
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kurirgatan corridor comparison</title><style>body{background:#10212a;color:#eadfca;font:15px system-ui;margin:32px auto;max-width:1040px;padding:0 16px}h1,h2{color:#edc278}section{border-top:1px solid #59706d;margin-top:30px}.pair{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0}figcaption{margin:10px 0}img{width:480px;max-width:100%;image-rendering:pixelated}p{line-height:1.5}</style><h1>Kurirgatan 28D · eighth-floor pilot</h1><p>Deterministic native-resolution comparisons against captures made before implementation. Seed 500000001, visual time 1.25 seconds. Ground movement is separately checked at four time steps.</p><p>The room/actor allowance covers small Canvas/WebGL alpha rounding. Dialogue glyph rows have a separate allowance because transparent textures use grayscale text antialiasing in place of opaque Canvas LCD antialiasing. Layout, portraits and pixels elsewhere remain checked.</p>${sections.join('\n')}</html>`;
await writeFile(new URL('phaser-comparison.html', results), html);
console.log('Wrote test-results/phaser-comparison.html');
