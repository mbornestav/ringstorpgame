import { Game, type Mode } from './game';
import { Renderer } from './render';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App element missing');

app.innerHTML = `
  <div class="shell">
    <header class="masthead">
      <div class="brand"><span class="brand-mark">RR<span>_</span></span><div><strong>RINGSTORP RUN</strong><small>HELSINGBORG · ARCADE FILE 01</small></div></div>
      <div class="masthead-right"><span class="edition">ISOMETRIC ACTION / 1994 EDITION</span><button id="sound-button" class="icon-button" type="button" aria-label="Mute sound">♪ ON</button></div>
    </header>
    <main>
      <div class="topline"><span><i class="live-dot"></i> STREET LEVEL <b>RINGSTORP → TÅGABORG</b></span><span>01 / 01 <em>MISSION</em></span></div>
      <section class="game-frame" aria-label="Ringstorp Run game">
        <canvas id="game" aria-label="Isometric game view"></canvas>
        <div class="game-hud" id="game-hud" hidden>
          <div class="hud-card life-card"><span class="hud-label">COURIER / HEALTH</span><div id="hearts" class="hearts"></div></div>
          <div class="hud-card objective-card"><span class="hud-label">CURRENT OBJECTIVE</span><strong id="objective"></strong><div class="progress" id="progress"></div></div>
          <div class="hud-card time-card"><span class="hud-label">TIME / SCORE</span><strong><span id="time">00:00</span> <span class="slash">/</span> <span id="score">00000</span></strong></div>
        </div>
        <div class="overlay" id="overlay"></div>
      </section>
      <div class="bottomline"><span>WASD / ARROWS <b>MOVE</b></span><span>J <b>PUNCH</b></span><span>K <b>DODGE</b></span><span>ESC <b>PAUSE</b></span><span>M <b>SOUND</b></span></div>
    </main>
    <footer><span>ORIGINAL PIXEL ART · FICTIONAL ARCADE STORY</span><span>BEST RUN <b id="best-score">00000</b></span></footer>
  </div>`;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const hud = document.querySelector<HTMLDivElement>('#game-hud')!;
const hearts = document.querySelector<HTMLDivElement>('#hearts')!;
const objective = document.querySelector<HTMLElement>('#objective')!;
const progress = document.querySelector<HTMLDivElement>('#progress')!;
const timeDisplay = document.querySelector<HTMLElement>('#time')!;
const scoreDisplay = document.querySelector<HTMLElement>('#score')!;
const bestDisplay = document.querySelector<HTMLElement>('#best-score')!;
const soundButton = document.querySelector<HTMLButtonElement>('#sound-button')!;
const main = document.querySelector<HTMLElement>('main')!;

function sizeFrame(): void {
  const chrome = window.innerHeight <= 760 ? 160 : 195;
  const width = Math.max(650, Math.floor((window.innerHeight - chrome) * 16 / 9));
  main.style.setProperty('--frame-width', `${width}px`);
}
window.addEventListener('resize', sizeFrame);
sizeFrame();

const game = new Game();
const renderer = new Renderer(canvas);
if (import.meta.env.DEV) Object.defineProperty(window, '__ringstorpGame', { value: game });
const held = new Set<string>();
let lastMode: Mode | '' = '';
let soundOn = true;
try { soundOn = localStorage.getItem('ringstorp-muted') !== 'yes'; } catch { /* private mode */ }

class Sound {
  private context: AudioContext | null = null;
  play(name: string): void {
    if (!soundOn) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
      const now = this.context.currentTime;
      const c = this.context;
      const notes: Record<string, Array<[number, number, number]>> = {
        start: [[392, 0.13, 0], [523, 0.18, 0.12], [659, 0.26, 0.25]],
        swing: [[160, 0.065, 0]], hit: [[85, 0.12, 0], [110, 0.08, 0.04]],
        dodge: [[260, 0.08, 0]], hurt: [[155, 0.22, 0], [95, 0.15, 0.1]],
        pickup: [[523, 0.12, 0], [784, 0.16, 0.1]],
        parcel: [[392, 0.1, 0], [523, 0.1, 0.1], [784, 0.23, 0.2]],
        victory: [[392, 0.12, 0], [523, 0.12, 0.12], [659, 0.12, 0.24], [784, 0.45, 0.36]],
        defeat: [[270, 0.18, 0], [210, 0.18, 0.18], [150, 0.3, 0.36]],
      };
      for (const [frequency, duration, delay] of notes[name] || []) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = name === 'hit' || name === 'hurt' ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(frequency, now + delay);
        if (name === 'swing' || name === 'dodge') osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency / 3), now + delay + duration);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.035, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        osc.connect(gain).connect(c.destination);
        osc.start(now + delay); osc.stop(now + delay + duration + 0.01);
      }
    } catch { /* Audio is optional. */ }
  }
}
const sound = new Sound();

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function panelFor(mode: Mode): string {
  if (mode === 'title') return `
    <div class="panel title-panel">
      <div class="eyebrow"><span class="chip">01</span> HELSINGBORG / SWEDEN <span class="gold-line"></span> 1994</div>
      <h1>RINGSTORP<br><span>RUN</span><i>▸</i></h1>
      <p class="subtitle">THREE PARCELS. TWO DISTRICTS. ONE WAY HOME.</p>
      <p class="story">A local courier's delivery has been taken. Follow the trail past the water tower and through Tågaborg. Clear the crews, recover every parcel, and make the drop-off.</p>
      <div class="action-row"><button class="primary-button" data-action="start">▶ &nbsp; START MISSION</button><span>PRESS ENTER TO START</span></div>
      <div class="controls-grid"><div><kbd>WASD</kbd> / <kbd>↑↓←→</kbd><span>MOVE</span></div><div><kbd>J</kbd><span>PUNCH · COMBO</span></div><div><kbd>K</kbd><span>DODGE</span></div><div><kbd>ESC</kbd><span>PAUSE</span></div></div>
    </div>`;
  if (mode === 'paused') return `<div class="panel compact-panel"><div class="eyebrow">MISSION ON HOLD</div><h2>PAUSED<span class="blink">_</span></h2><p>Take a breath. The streets can wait.</p><div class="action-row"><button class="primary-button" data-action="resume">▶ &nbsp; RESUME</button><button class="secondary-button" data-action="restart">↻ &nbsp; RESTART</button></div><small>ESC TO RESUME</small></div>`;
  if (mode === 'victory') return `<div class="panel compact-panel outcome-panel"><div class="eyebrow">MISSION COMPLETE / TÅGABORG</div><h2>DELIVERED<span class="gold">.</span></h2><p>All three parcels made it home.</p><div class="result-grid"><div><span>RUN TIME</span><b>${formatTime(game.elapsed)}</b></div><div><span>CREWS DOWN</span><b>${game.koCount}</b></div><div><span>FINAL SCORE</span><b>${game.score.toString().padStart(5, '0')}</b></div></div><div class="action-row"><button class="primary-button" data-action="restart">↻ &nbsp; PLAY AGAIN</button><span>PRESS ENTER TO REPLAY</span></div></div>`;
  return `<div class="panel compact-panel outcome-panel"><div class="eyebrow">MISSION FAILED / COURIER DOWN</div><h2>GAME OVER<span class="red">.</span></h2><p>The parcels are still out there. Give it another run.</p><div class="result-grid"><div><span>RUN TIME</span><b>${formatTime(game.elapsed)}</b></div><div><span>PARCELS</span><b>${game.recoveredCount} / 3</b></div><div><span>CREWS DOWN</span><b>${game.koCount}</b></div></div><div class="action-row"><button class="primary-button" data-action="restart">↻ &nbsp; TRY AGAIN</button><span>PRESS ENTER TO RETRY</span></div></div>`;
}

function syncUI(): void {
  if (lastMode !== game.mode) {
    lastMode = game.mode;
    overlay.innerHTML = panelFor(game.mode);
    overlay.hidden = game.mode === 'playing';
    hud.hidden = game.mode === 'title';
  }
  if (game.mode !== 'title') {
    hearts.innerHTML = Array.from({ length: game.player.maxHp }, (_, i) => `<span class="heart ${i >= game.player.hp ? 'empty' : ''}">♥</span>`).join('');
    objective.textContent = game.objective;
    progress.innerHTML = game.parcels.map((p, i) => `<span class="progress-step ${p.recovered ? 'done' : i === game.recoveredCount ? 'active' : ''}">${p.recovered ? '✓' : i + 1}</span>`).join('<i></i>');
    timeDisplay.textContent = formatTime(game.elapsed);
    scoreDisplay.textContent = (game.koCount * 85 + game.recoveredCount * 500).toString().padStart(5, '0');
  }
  bestDisplay.textContent = game.bestScore.toString().padStart(5, '0');
  soundButton.textContent = soundOn ? '♪ ON' : '♪ OFF';
  soundButton.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound');
}

function restart(): void { held.clear(); game.start(); renderer.resetCamera(); syncUI(); }
overlay.addEventListener('click', event => {
  const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if (action === 'start' || action === 'restart') restart();
  if (action === 'resume') game.togglePause();
  syncUI();
});

function toggleSound(): void {
  soundOn = !soundOn;
  try { localStorage.setItem('ringstorp-muted', soundOn ? 'no' : 'yes'); } catch { /* private mode */ }
  syncUI();
}
soundButton.addEventListener('click', toggleSound);

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (movementKeys.has(key) || ['j', 'k', 'escape', 'enter', 'm', ' '].includes(key)) event.preventDefault();
  if (key === 'm' && !event.repeat) toggleSound();
  if (key === 'escape' && !event.repeat) { game.togglePause(); syncUI(); }
  if (key === 'enter' && !event.repeat && ['title', 'victory', 'defeat'].includes(game.mode)) restart();
  if (key === 'j' && !event.repeat && game.mode === 'playing') game.queueAttack();
  if (key === 'k' && !event.repeat && game.mode === 'playing') game.queueDodge();
  held.add(key);
});
window.addEventListener('keyup', event => held.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { held.clear(); if (game.mode === 'playing') { game.togglePause(); syncUI(); } });

let previous = performance.now();
function tick(now: number): void {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  const x = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
  const y = Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup'));
  // Keep arrow/WASD directions aligned with the screen despite the isometric projection.
  game.setMovement(x + y, y - x);
  game.update(dt);
  for (const event of game.events.splice(0)) sound.play(event);
  renderer.render(game, dt);
  syncUI();
  requestAnimationFrame(tick);
}
syncUI();
requestAnimationFrame(tick);
