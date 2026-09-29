// Run against the ORIGINAL entrypoint before changing its shared artwork.
// The independent instances below never use the page's running game.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/');
  const reference = await page.evaluate(async () => {
    const { SideGame } = await import('/src/side/game.ts');
    const { SideRenderer } = await import('/src/side/render.ts');
    const { setLang } = await import('/src/side/i18n.ts');
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    const portrait = new Image(); portrait.src = '/src/side/dd-portrait-small.png'; await portrait.decode();
    const create = (seed = 500000000) => {
      const g = new SideGame(); g.random = () => seed / 1e9; g.startGods();
      g.gods.floor = 8; g.gods.populate(8); g.gods.go('floor', 94, 214);
      g.transition = 0; g.messageTimer = 0; g.elapsed = 0; g.events = [];
      return g;
    };
    // Select a reference seed with a neighbour, while retaining the actual algorithm.
    let seed = 500000000;
    while (create(seed).gods.npcs.length === 1) seed++;
    const record = g => ({ player: { ...g.player }, npcs: structuredClone(g.gods.npcs), received: g.gods.received, cargo: g.gods.cargo, objective: g.objective, message: g.message, messageTimer: g.messageTimer, mode: g.mode, transition: g.transition, interaction: g.interaction, elapsed: g.elapsed });
    const trace = [];
    for (const dt of [1 / 30, 1 / 60, 1 / 120, 0.025]) {
      const g = create(seed), frames = [];
      for (let i = 0; i < Math.round(3 / dt); i++) {
        g.setMovement(i < 1 / dt ? 1 : -1, i < 0.5 / dt ? 1 : -1);
        g.setSneak(i >= 1.5 / dt);
        if (i === Math.round(0.3 / dt)) g.queueJump();
        if (i === Math.round(1.2 / dt)) g.queueDodge();
        g.update(dt); frames.push(record(g));
      }
      trace.push({ dt, frames });
    }
    const shots = [];
    const add = (name, setup, lang = 'en') => {
      setLang(lang);
      const g = create(seed); setup(g);
      const canvas = document.createElement('canvas'), r = new SideRenderer(canvas);
      r.elapsed = 1.25; r.render(g, 0);
      shots.push({ name, lang, state: record(g), image: canvas.toDataURL() });
    };
    add('arrival', () => {});
    add('walk-right', g => { g.setMovement(1, 0); for (let i = 0; i < 15; i++) g.update(1 / 60); });
    add('walk-left', g => { g.player.x = 270; g.setMovement(-1, 0); for (let i = 0; i < 15; i++) g.update(1 / 60); });
    add('jump', g => { g.setMovement(1, 0); g.queueJump(); for (let i = 0; i < 10; i++) g.update(1 / 60); });
    add('sneak', g => { g.setSneak(true); g.setMovement(1, 1); for (let i = 0; i < 15; i++) g.update(1 / 60); });
    add('dodge', g => { g.queueDodge(); for (let i = 0; i < 4; i++) g.update(1 / 60); });
    add('neighbour', g => { const n = g.gods.npcs.find(n => n.id !== 'dd'); g.player.x = n.x - 20; g.player.y = n.y; g.interact(); });
    add('cargo', g => { g.player.x = 320; g.player.y = 214; g.interact(); });
    add('cargo-sv', g => { g.player.x = 320; g.player.y = 214; g.interact(); }, 'sv');
    add('behind-dd', g => { g.player.x = 340; g.player.y = 210; });
    add('in-front-dd', g => { g.player.x = 340; g.player.y = 218; });
    add('paused', g => { g.togglePause(); });
    add('lift-exit', g => { g.player.x = 70; });
    setLang('en');
    return { seed, visualTime: 1.25, trace, shots };
  });
  const dir = new URL('../tests/fixtures/corridor/', import.meta.url);
  await mkdir(dir, { recursive: true });
  for (const shot of reference.shots) {
    await writeFile(new URL(`${shot.name}.png`, dir), Buffer.from(shot.image.split(',')[1], 'base64'));
    delete shot.image;
  }
  await writeFile(new URL('reference.json', dir), JSON.stringify(reference));
  console.log(`Captured ${reference.shots.length} reference frames and ${reference.trace.length} movement traces; seed ${reference.seed}`);
} finally { await browser.close(); }
