import Phaser from 'phaser';
import '../style.css';
import './pilot.css';
import { getLang, onLangChange, setLang, t, type Key } from '../side/i18n';
import { AdventureScene, BootScene, PILOT_ENVIRONMENT, UIScene } from './scenes';
import { newRun, type Message } from './session';
import type { ExitRequest } from './content/types';
import { readMuted, writeMuted } from './preferences';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="shell side-edition pilot">
  <header class="masthead">
    <div class="brand"><span class="brand-mark">RR<span>_</span></span><div><strong>RINGSTORP RUN</strong><small>HELSINGBORG · KURIRGATAN 28D</small></div></div>
    <div class="masthead-right"><button id="language" class="icon-button" type="button"></button><button id="sound" class="icon-button" type="button"></button></div>
  </header>
  <main>
    <div class="topline"><b>KURIRGATAN 28D</b><span id="floor"></span></div>
    <section class="game-frame" aria-label="Ringstorp Run">
      <div id="phaser-game"></div>
      <div class="game-hud">
        <div class="hud-card"><span class="hud-label" id="cargo-label"></span><strong id="cargo"></strong></div>
        <div class="hud-card objective-card"><span class="hud-label" id="objective-label"></span><strong id="objective"></strong></div>
        <div class="hud-card"><span class="hud-label" id="time-label"></span><strong id="time">00:00</strong></div>
      </div>
      <div class="street-choice" id="interaction" hidden><strong id="interaction-label"></strong><button id="interact" type="button"></button></div>
      <div class="overlay" id="pause" hidden><div class="panel compact-panel"><div class="eyebrow" id="pause-eyebrow"></div><h2 id="pause-title"></h2><p id="pause-text"></p><button class="primary-button" id="resume" type="button"></button></div></div>
      <div id="error" role="alert" hidden></div>
    </section>
    <div class="bottomline" id="controls"></div>
    <p class="sr-only" id="dialogue-accessible" aria-live="polite"></p>
  </main>
  <aside class="pilot-harness" aria-label="Pilot controls">
    <strong id="pilot-title"></strong><span id="pilot-note"></span>
    <div class="pilot-actions"><button id="restart" class="icon-button" type="button"></button><button id="reenter" class="icon-button" type="button"></button><a href="/" id="original"></a></div>
    <p id="exit-status" role="status"></p><details id="exit-details" hidden><summary>ExitRequest</summary><pre id="exit-json"></pre></details>
  </aside>
</div>`;
const el = (id: string) => document.getElementById(id)!;
const put = (id: string, text: string) => { if (el(id).textContent !== text) el(id).textContent = text; };
const seedParam = new URLSearchParams(location.search).get('seed');
const parsed = seedParam === null ? NaN : Number(seedParam);
const seed = Number.isInteger(parsed) && parsed >= 0 && parsed < 1e9 ? parsed : Math.floor(Math.random() * 1e9);
let muted = readMuted();
let latestExit: ExitRequest | null = null;
let failed = false;

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'phaser-game', width: 480, height: 270,
  pixelArt: true, backgroundColor: '#0c1e23',
  fps: { smoothStep: false },
  render: { preserveDrawingBuffer: import.meta.env.DEV },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: false, customUpdate: true } },
  scene: [BootScene, AdventureScene, UIScene],
  callbacks: { preBoot: g => {
    g.registry.set('run', newRun(PILOT_ENVIRONMENT, seed));
    g.events.on('pilot:error', (message: string) => {
      failed = true; el('error').hidden = false; el('error').textContent = message;
      for (const id of ['restart', 'reenter', 'interact', 'resume']) (el(id) as HTMLButtonElement).disabled = true;
    });
  } },
});
const scene = () => game.scene.getScene('Adventure') as AdventureScene;
const running = () => !failed && game.scene.isActive('Adventure');
function preferences(): void {
  if (game.sound) game.sound.mute = muted;
  put('sound', t(muted ? 'sound.off' : 'sound.on'));
  el('sound').setAttribute('aria-label', t(muted ? 'sound.unmute' : 'sound.mute'));
}
function toggleMute(): void {
  muted = !muted; writeMuted(muted);
  preferences();
}
function localize(): void {
  const sv = getLang() === 'sv'; document.documentElement.lang = getLang();
  put('language', t('lang.button')); el('language').setAttribute('aria-label', t('lang.aria'));
  put('floor', `${t('ctl.floor')} 8`); put('cargo-label', 'GODS'); put('objective-label', t('hud.objective')); put('time-label', t('win.time'));
  for (const [id, key] of [['pause-eyebrow', 'pause.eyebrow'], ['pause-title', 'pause.title'], ['pause-text', 'pause.text']] as [string, Key][]) put(id, t(key));
  // The source's button labels contain entity markup; assign these trusted translations as HTML.
  el('resume').innerHTML = t('pause.resume');
  put('pilot-title', sv ? 'PHASER · RUMSPILOT' : 'PHASER · ROOM PILOT');
  put('pilot-note', sv ? 'En korridor. Framsteg sparas endast under besöket på sidan.' : 'One corridor. Progress lasts only while this page is open.');
  put('restart', sv ? 'Börja om' : 'Restart'); put('reenter', sv ? 'Återvänd till korridoren' : 'Re-enter corridor'); put('original', sv ? 'Öppna nuvarande spelet' : 'Open current game');
  put('exit-status', latestExit ? (sv ? 'Hissutgång registrerad. Du kan återvända med dina framsteg kvar.' : 'Lift exit recorded. You can re-enter with your progress intact.') : '');
  const controls: [string, Key][] = [['A D / ← →', 'ctl.walk'], ['W S / ↑ ↓', 'ctl.step'], ['SHIFT', 'ctl.sneak'], ['SPACE / L', 'ctl.jump'], ['K', 'ctl.dodge'], ['E', 'act2.talk'], ['ESC', 'ctl.pause'], ['M', 'ctl.sound']];
  el('controls').innerHTML = controls.map(([k, key]) => `<span>${k} <b>${t(key)}</b></span>`).join('');
  preferences(); if (running()) scene().publish();
}
game.events.on('pilot:ui', (state: { objective: string; cargo: string; elapsed: number; paused: boolean; interaction: string; message: Message | null }) => {
  put('objective', state.objective);
  put('cargo', t(state.cargo === 'carried' ? 'cargo.carried' : 'cargo.none'));
  const seconds = Math.floor(state.elapsed); put('time', `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`);
  el('pause').hidden = !state.paused;
  el('interaction').hidden = !state.interaction;
  put('interaction-label', state.interaction); put('interact', `E · ${state.interaction}`);
  put('dialogue-accessible', state.message && state.message.remaining > 0 ? t(state.message.key) : '');
});
game.events.on('pilot:exit', (request: ExitRequest) => {
  latestExit = structuredClone(request); el('exit-details').hidden = false;
  put('exit-json', JSON.stringify(request, null, 2)); localize();
});
game.events.on('pilot:mute', toggleMute);
game.events.once(Phaser.Core.Events.READY, preferences);
const events = new AbortController();
function click(id: string, action: () => void): void {
  el(id).addEventListener('click', event => { action(); if (event.detail > 0) el(id).blur(); }, { signal: events.signal });
}
click('interact', () => game.events.emit('pilot:interact'));
click('resume', () => game.events.emit('pilot:pause'));
click('sound', toggleMute); click('language', () => setLang(getLang() === 'en' ? 'sv' : 'en'));
function enter(restart: boolean): void {
  if (!running()) return;
  const run = restart ? newRun(PILOT_ENVIRONMENT, seed) : scene().visit.run;
  latestExit = null; el('exit-details').hidden = true; put('exit-status', ''); scene().reenter(run);
}
click('restart', () => enter(true)); click('reenter', () => enter(false));
const unsubscribe = onLangChange(localize); localize();
game.events.once(Phaser.Core.Events.DESTROY, () => { events.abort(); unsubscribe(); });
if (import.meta.env.DEV) void import('./testing').then(({ installTesting }) => installTesting(game));
if (import.meta.hot) import.meta.hot.dispose(() => { game.destroy(true); app.innerHTML = ''; });
