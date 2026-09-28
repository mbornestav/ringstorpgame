import { type Mode } from '../game';
import { ROUTE_NAMES } from './routes';
import { MAP_ATTRIBUTION } from '../map';
import '../style.css';
import { SideGame } from './game';
import { SideRenderer } from './render';

// Entry point for the side-scrolling edition. The isometric edition's entry, src/main.ts, is kept
// but no longer loaded; point index.html back at it to play that version.

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App element missing');

app.innerHTML = `
  <div class="shell side-edition">
    <header class="masthead">
      <div class="brand"><span class="brand-mark">RR<span>_</span></span><div><strong>RINGSTORP RUN</strong><small>HELSINGBORG · ARCADE FILE 01</small></div></div>
      <div class="masthead-right"><span class="edition">SIDE-SCROLLING ACTION / 1994 EDITION</span><button id="sound-button" class="icon-button" type="button" aria-label="Mute sound">♪ ON</button></div>
    </header>
    <main>
      <div class="topline"><span><i class="live-dot"></i> STREET LEVEL <b id="street-line">PÅLSJÖ KIOSK → RINGSTORPSVÄGEN 55B</b></span><span>01 / 01 <em>MISSION</em></span></div>
      <section class="game-frame" aria-label="Ringstorp Run game">
        <canvas id="game" aria-label="Side-scrolling game view"></canvas>
        <div class="game-hud" id="game-hud" hidden>
          <div class="hud-card life-card"><span class="hud-label">COURIER / HEALTH</span><div id="hearts" class="hearts"></div></div>
          <div class="hud-card objective-card"><span class="hud-label">CURRENT OBJECTIVE</span><strong id="objective"></strong><div class="progress" id="progress"></div></div>
          <div class="hud-card time-card"><span class="hud-label">TIME / SCORE</span><strong><span id="time">00:00</span> <span class="slash">/</span> <span id="score">00000</span></strong></div>
        </div>
        <div class="street-choice" id="street-choice" hidden aria-live="polite"></div>
        <div class="overlay" id="overlay"></div>
      </section>
      <div class="bottomline"><span>A D / ← → <b>WALK</b></span><span>W S / ↑ ↓ <b>STEP</b></span><span>SPACE / L <b>JUMP</b></span><span>J <b>PUNCH</b></span><span>K <b>DODGE</b></span><span>E <b>TURN / USE</b></span><span>ESC <b>PAUSE</b></span><span>M <b>SOUND</b></span></div>
    </main>
    <footer><span>ORIGINAL PIXEL ART · MAP DATA ${MAP_ATTRIBUTION.toUpperCase()}</span><span>BEST RUN <b id="best-score">00000</b></span></footer>
  </div>`;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const streetChoice = document.querySelector<HTMLDivElement>('#street-choice')!;
const hud = document.querySelector<HTMLDivElement>('#game-hud')!;
const hearts = document.querySelector<HTMLDivElement>('#hearts')!;
const objective = document.querySelector<HTMLElement>('#objective')!;
const progress = document.querySelector<HTMLDivElement>('#progress')!;
const timeDisplay = document.querySelector<HTMLElement>('#time')!;
const scoreDisplay = document.querySelector<HTMLElement>('#score')!;
const bestDisplay = document.querySelector<HTMLElement>('#best-score')!;
const streetLine = document.querySelector<HTMLElement>('#street-line')!;
const soundButton = document.querySelector<HTMLButtonElement>('#sound-button')!;
const main = document.querySelector<HTMLElement>('main')!;

function sizeFrame(): void {
  const chrome = window.innerHeight <= 760 ? 160 : 195;
  const width = Math.max(650, Math.floor((window.innerHeight - chrome) * 16 / 9));
  main.style.setProperty('--frame-width', `${width}px`);
}
window.addEventListener('resize', sizeFrame);
sizeFrame();

const game = new SideGame();
const renderer = new SideRenderer(canvas);
if (import.meta.env.DEV) Object.defineProperty(window, '__ringstorpGame', { value: game });
if (import.meta.env.DEV) Object.defineProperty(window, '__ringstorpRenderer', { value: renderer });

const held = new Set<string>();
let lastMode: Mode | '' = '';
let lastChoice = '';
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
        smash: [[70, 0.18, 0], [55, 0.16, 0.05], [140, 0.06, 0]],
        dodge: [[260, 0.08, 0]], jump: [[300, 0.07, 0], [420, 0.06, 0.04]], thud: [[60, 0.09, 0]],
        hurt: [[155, 0.22, 0], [95, 0.15, 0.1]], warn: [[880, 0.03, 0]],
        pickup: [[523, 0.12, 0], [784, 0.16, 0.1]],
        parcel: [[392, 0.1, 0], [523, 0.1, 0.1], [784, 0.23, 0.2]],
        crew: [[196, 0.1, 0], [185, 0.14, 0.1]], go: [[659, 0.08, 0], [880, 0.12, 0.09]],
        victory: [[392, 0.12, 0], [523, 0.12, 0.12], [659, 0.12, 0.24], [784, 0.45, 0.36]],
        defeat: [[270, 0.18, 0], [210, 0.18, 0.18], [150, 0.3, 0.36]],
      };
      for (const [frequency, duration, delay] of notes[name] || []) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = name === 'hit' || name === 'hurt' || name === 'smash' || name === 'thud' ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(frequency, now + delay);
        if (name === 'swing' || name === 'dodge') osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency / 3), now + delay + duration);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(name === 'warn' ? 0.012 : 0.035, now + delay + 0.01);
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
      <p class="subtitle">ONE PACKAGE. YOUR STREETS. FIND YOUR WAY HOME.</p>
      <p class="story">Pick up the package at Pålsjö kiosk and carry it home to Ringstorpsvägen 55B. Choose your turns as you play: visit Marcus A for a checkpoint, stop at Kurir Livs for health, or keep heading home. Follow the street signs and press E at a junction to turn. Crews stand in your way.</p>
      <div class="action-row route-row">
        <button class="primary-button" data-action="start">▶ &nbsp; START RUN</button>
        <span>ENTER TO PLAY · CHOOSE TURNS ON THE STREET</span>
      </div>
      <div class="controls-grid"><div><kbd>WASD</kbd> / <kbd>↑↓←→</kbd><span>WALK · STEP</span></div><div><kbd>SPACE</kbd><span>JUMP · J IN AIR KICKS</span></div><div><kbd>J</kbd><span>PUNCH · COMBO</span></div><div><kbd>K</kbd><span>DODGE</span></div></div>
    </div>`;
  if (mode === 'paused') return `<div class="panel compact-panel"><div class="eyebrow">MISSION ON HOLD</div><h2>PAUSED<span class="blink">_</span></h2><p>Take a breath. The streets can wait.</p><div class="action-row"><button class="primary-button" data-action="resume">▶ &nbsp; RESUME</button><button class="secondary-button" data-action="restart">↻ &nbsp; RESTART</button></div><small>ESC TO RESUME</small></div>`;
  if (mode === 'victory') return `<div class="panel compact-panel outcome-panel"><div class="eyebrow">MISSION COMPLETE / RINGSTORPSVÄGEN 55B</div><h2>DELIVERED<span class="gold">.</span></h2><p>The package made it home${game.healed ? ', with a patch-up at Marcus A' : ''}${game.shopHealed ? ' and supplies from Kurir Livs' : ''}.</p><div class="result-grid"><div><span>RUN TIME</span><b>${formatTime(game.elapsed)}</b></div><div><span>CREWS DOWN</span><b>${game.koCount}</b></div><div><span>FINAL SCORE</span><b>${game.score.toString().padStart(5, '0')}</b></div></div><div class="action-row"><button class="primary-button" data-action="restart">↻ &nbsp; PLAY AGAIN</button><span>PRESS ENTER TO REPLAY</span></div></div>`;
  const resume = game.checkpoint !== null
    ? `<button class="primary-button" data-action="continue">✚ &nbsp; CONTINUE FROM MARCUS A</button><button class="secondary-button" data-action="restart">↻ &nbsp; START OVER</button>`
    : `<button class="primary-button" data-action="restart">↻ &nbsp; TRY AGAIN</button><span>PRESS ENTER TO RETRY</span>`;
  return `<div class="panel compact-panel outcome-panel"><div class="eyebrow">MISSION FAILED / COURIER DOWN</div><h2>GAME OVER<span class="red">.</span></h2><p>${game.checkpoint !== null ? 'Marcus A can patch you up again, for a score penalty.' : 'The package is still out there. Give it another run.'}</p><div class="result-grid"><div><span>RUN TIME</span><b>${formatTime(game.elapsed)}</b></div><div><span>PACKAGE</span><b>${game.hasPackage ? 'CARRIED' : 'AT KIOSK'}</b></div><div><span>CREWS DOWN</span><b>${game.koCount}</b></div></div><div class="action-row">${resume}</div></div>`;
}

function syncUI(): void {
  if (lastMode !== game.mode) {
    lastMode = game.mode;
    overlay.innerHTML = panelFor(game.mode);
    overlay.hidden = game.mode === 'playing';
    hud.hidden = game.mode === 'title';
    // A start button that has just been hidden must not keep the keyboard focus.
    if (game.mode === 'playing' && document.activeElement instanceof HTMLElement && overlay.contains(document.activeElement)) document.activeElement.blur();
  }
  if (game.mode !== 'title') {
    hearts.innerHTML = Array.from({ length: game.player.maxHp }, (_, i) => `<span class="heart ${i >= game.player.hp ? 'empty' : ''}">♥</span>`).join('');
    objective.textContent = game.objective;
    const marcusState = game.healed ? 'done' : game.hasPackage && game.marcusAhead ? 'active' : 'optional';
    const shopState = game.shopHealed ? 'done' : game.stage.shopX !== null && game.player.x < game.stage.shopX + 90 ? 'active' : 'optional';
    const steps: Array<[string, string, string]> = [
      [game.hasPackage ? 'done' : 'active', game.hasPackage ? '✓' : '?', 'Package · Pålsjö kiosk'],
      [marcusState, game.healed ? '✓' : '✚', 'Marcus A · Långåkersgatan 4'],
      [shopState, game.shopHealed ? '✓' : '✚', 'Kurir Livs · Kurirgatan 1'],
      [game.mode === 'victory' ? 'done' : game.hasPackage && marcusState !== 'active' && shopState !== 'active' ? 'active' : '', '★', 'Home · Ringstorpsvägen 55B'],
    ];
    progress.innerHTML = steps.map(([state, icon, title]) => `<span class="progress-step ${state}" title="${title}">${icon}</span>`).join('<i></i>') + `<em class="route-name">${ROUTE_NAMES[game.route]}</em>`;
    timeDisplay.textContent = formatTime(game.elapsed);
    scoreDisplay.textContent = (game.koCount * 85 + (game.hasPackage ? 500 : 0) + (game.healed ? 250 : 0)).toString().padStart(5, '0');
    const street = game.street ?? (game.hasPackage ? (game.metresToHome < 60 ? 'RINGSTORPSVÄGEN 55B' : 'PÅLSJÖ') : 'PÅLSJÖ KIOSK');
    streetLine.textContent = `${street.toUpperCase()} · ${Math.round(game.metresToHome)} M TO HOME`;
  } else streetLine.textContent = 'PÅLSJÖ KIOSK → RINGSTORPSVÄGEN 55B';
  bestDisplay.textContent = game.bestScore.toString().padStart(5, '0');
  soundButton.textContent = soundOn ? '♪ ON' : '♪ OFF';
  soundButton.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound');
  const junction = game.junctionAhead, action = game.interaction;
  let choice = '';
  if (game.mode === 'playing' && junction) {
    const distance = Math.max(0, Math.ceil((junction.x - game.player.x) / 60) * 5);
    choice = `<div><small>${junction.street.toUpperCase()}${distance > 5 ? ` · ${distance} M` : ' · JUNCTION'}</small><strong>↗ ${junction.turn}</strong><span>Keep walking → ${junction.straight}</span></div><button type="button" ${action?.kind === 'turn' ? '' : 'disabled'} aria-label="Turn towards ${junction.id === 'romares' ? 'Marcus A' : 'Kurir Livs'}"><kbd>E</kbd> ${game.active ? 'CLEAR CREW' : action?.kind === 'turn' ? 'TURN' : 'APPROACH'}</button>`;
  } else if (game.mode === 'playing' && game.stage.shopX !== null && Math.abs(game.player.x - game.stage.shopX) < 150) {
    choice = `<div><small>ICA NÄRA · KURIR LIVS</small><strong>${game.shopHealed ? 'Supplies collected' : 'A breather before heading home'}</strong><span>${action?.kind === 'shop' ? action.label : 'Step up to the glass entrance to collect supplies'}</span></div><button type="button" ${action?.kind === 'shop' && !game.shopHealed && game.player.hp < game.player.maxHp ? '' : 'disabled'} aria-label="Refill health at Kurir Livs"><kbd>E</kbd> REFILL HEALTH</button>`;
  }
  streetChoice.hidden = !choice;
  if (lastChoice !== choice) { streetChoice.innerHTML = choice; lastChoice = choice; }
}

function restart(): void { held.clear(); game.start(); renderer.resetCamera(); syncUI(); }
overlay.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  const action = button?.dataset.action;
  if (action === 'start' || action === 'restart') restart();
  if (action === 'resume') game.togglePause();
  if (action === 'continue') { held.clear(); game.continueFromCheckpoint(); }
  syncUI();
});
streetChoice.addEventListener('click', event => {
  if (!(event.target as HTMLElement).closest('button:not(:disabled)')) return;
  held.clear(); game.interact(); syncUI();
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
});

function toggleSound(): void {
  soundOn = !soundOn;
  try { localStorage.setItem('ringstorp-muted', soundOn ? 'no' : 'yes'); } catch { /* private mode */ }
  syncUI();
}
soundButton.addEventListener('click', event => {
  toggleSound();
  // After a mouse click, give Space and Enter back to the game; keyboard focus stays for keyboard users.
  if (event.detail > 0) soundButton.blur();
});

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  // Let keyboard users activate the focused UI button normally.
  if ((key === 'enter' || key === ' ') && event.target instanceof HTMLButtonElement) return;
  if (movementKeys.has(key) || ['j', 'k', 'l', 'e', 'escape', 'enter', 'm', ' '].includes(key)) event.preventDefault();
  if (key === 'e' && !event.repeat && game.mode === 'playing') { game.interact(); syncUI(); }
  if (key === 'm' && !event.repeat) toggleSound();
  if (key === 'escape' && !event.repeat) { game.togglePause(); syncUI(); }
  if (key === 'enter' && !event.repeat && game.mode === 'defeat' && game.checkpoint !== null) { held.clear(); game.continueFromCheckpoint(); syncUI(); }
  else if (key === 'enter' && !event.repeat && ['title', 'victory', 'defeat'].includes(game.mode)) restart();
  if (key === 'j' && !event.repeat && game.mode === 'playing') game.queueAttack();
  if (key === 'k' && !event.repeat && game.mode === 'playing') game.queueDodge();
  if ((key === ' ' || key === 'l') && !event.repeat && game.mode === 'playing') game.queueJump();
  held.add(key);
});
window.addEventListener('keyup', event => {
  // macOS sends no keyup for keys released while Cmd is down, so forget everything when it lifts.
  if (event.key === 'Meta') held.clear();
  held.delete(event.key.toLowerCase());
});
window.addEventListener('blur', () => { held.clear(); if (game.mode === 'playing') { game.togglePause(); syncUI(); } });

let previous = performance.now();
function tick(now: number): void {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  const x = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
  const y = Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup'));
  game.setMovement(x, y);
  game.update(dt);
  for (const event of game.events.splice(0)) sound.play(event);
  renderer.render(game, dt);
  syncUI();
  requestAnimationFrame(tick);
}
syncUI();
requestAnimationFrame(tick);
