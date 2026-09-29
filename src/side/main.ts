import { type Mode } from '../game';
import { ROUTE_NAMES } from './routes';
import { MAP_ATTRIBUTION } from '../map';
import '../style.css';
import { CLIP, FINE, REFILL_PRICE, SideGame } from './game';
import { HEIGHT, WIDTH } from './layout';
import { panelHit } from './interior';
import { SideRenderer } from './render';
import { PhoneUI } from './phone';
import { getLang, onLangChange, setLang, t, type Key } from './i18n';

// Entry point for the side-scrolling edition. The isometric edition's entry, src/main.ts, is kept
// but no longer loaded; point index.html back at it to play that version.

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App element missing');

app.innerHTML = `
  <div class="shell side-edition">
    <header class="masthead">
      <div class="brand"><span class="brand-mark">RR<span>_</span></span><div><strong>RINGSTORP RUN</strong><small data-i18n="brand.sub"></small></div></div>
      <div class="masthead-right"><span class="edition" data-i18n="edition"></span><button id="lang-button" class="icon-button" type="button"></button><button id="sound-button" class="icon-button" type="button" aria-label="Mute sound">♪ ON</button></div>
    </header>
    <main>
      <div class="topline"><span><i class="live-dot"></i> <span data-i18n="top.street"></span> <b id="street-line">PÅLSJÖ KIOSK → RINGSTORPSVÄGEN 55B</b></span><span id="level-line"></span></div>
      <section class="game-frame" aria-label="Ringstorp Run game">
        <canvas id="game" aria-label="Side-scrolling game view"></canvas>
        <div class="game-hud" id="game-hud" hidden>
          <div class="hud-card life-card"><span class="hud-label" id="life-label"></span><div id="hearts" class="hearts"></div><div id="ammo" class="ammo" hidden></div></div>
          <div class="hud-card objective-card"><span class="hud-label" data-i18n="hud.objective"></span><strong id="objective"></strong><div class="progress" id="progress"></div></div>
          <div class="hud-card time-card"><span class="hud-label" data-i18n="hud.score"></span><strong><span id="time">00:00</span> <span class="slash">/</span> <span id="score">00000</span></strong></div>
        </div>
        <div class="street-choice" id="street-choice" hidden aria-live="polite"></div>
        <div class="overlay" id="overlay"></div>
        <button class="phone-launcher" id="phone-button" type="button" data-i18n-aria="phone.open" hidden><kbd>F</kbd> GH337 <span id="cash"></span></button>
      </section>
      <div class="bottomline" id="bottomline"></div>
    </main>
    <footer><span id="credit"></span><span><span data-i18n="footer.best"></span> <b id="best-score">00000</b></span></footer>
  </div>`;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const streetChoice = document.querySelector<HTMLDivElement>('#street-choice')!;
const hud = document.querySelector<HTMLDivElement>('#game-hud')!;
const hearts = document.querySelector<HTMLDivElement>('#hearts')!;
const ammo = document.querySelector<HTMLDivElement>('#ammo')!;
const objective = document.querySelector<HTMLElement>('#objective')!;
const progress = document.querySelector<HTMLDivElement>('#progress')!;
const timeDisplay = document.querySelector<HTMLElement>('#time')!;
const scoreDisplay = document.querySelector<HTMLElement>('#score')!;
const bestDisplay = document.querySelector<HTMLElement>('#best-score')!;
const streetLine = document.querySelector<HTMLElement>('#street-line')!;
const soundButton = document.querySelector<HTMLButtonElement>('#sound-button')!;
const phoneButton = document.querySelector<HTMLButtonElement>('#phone-button')!;
const cashDisplay = document.querySelector<HTMLElement>('#cash')!;
const main = document.querySelector<HTMLElement>('main')!;
const langButton = document.querySelector<HTMLButtonElement>('#lang-button')!;
const bottomline = document.querySelector<HTMLElement>('#bottomline')!;
const levelLine = document.querySelector<HTMLElement>('#level-line')!;
const lifeLabel = document.querySelector<HTMLElement>('#life-label')!;
const credit = document.querySelector<HTMLElement>('#credit')!;

/** Text in the page shell, which is built once, is refreshed here whenever the language changes. */
function applyStatic(): void {
  document.documentElement.lang = getLang();
  document.title = t('page.title');
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n as Key); });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria as Key)));
  langButton.textContent = t('lang.button');
  langButton.setAttribute('aria-label', t('lang.aria'));
  langButton.lang = getLang() === 'en' ? 'sv' : 'en';
  credit.textContent = t('footer.credit', { attribution: MAP_ATTRIBUTION.toUpperCase() });
}
applyStatic();
let controlsKey = '';
/** The controls bar lists F only once D.D has given you his number. */
function renderControls(): void {
  const key = `${getLang()}:${game.level}:${game.hasPhone}`;
  if (key === controlsKey) return;
  controlsKey = key;
  const keys: Array<[string, Key]> = game.level === 2
    ? [['A D / ← →', 'ctl.walk'], ['W S / ↑ ↓', 'ctl.step'], ['SHIFT', 'ctl.sneak'], ['SPACE / L', 'ctl.jump'], ['K', 'ctl.dodge'], ['E', 'ctl.use2'], ['0-8', 'ctl.floor'], ['ESC', 'ctl.pause'], ['M', 'ctl.sound']]
    : [['A D / ← →', 'ctl.walk'], ['W S / ↑ ↓', 'ctl.step'], ['SPACE / L', 'ctl.jump'], ['J', 'ctl.punch'], ['K', 'ctl.dodge'], ['I', 'ctl.shoot'], ['E', 'ctl.use'], ...(game.hasPhone ? [['F', 'ctl.phone'] as [string, Key]] : []), ['ESC', 'ctl.pause'], ['M', 'ctl.sound']];
  bottomline.innerHTML = keys.map(([k, label]) => `<span>${k} <b>${t(label)}</b></span>`).join('');
}

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
const phone = new PhoneUI(game, () => held.clear(), document.querySelector<HTMLElement>('.game-frame')!);
phoneButton.addEventListener('click', () => phone.toggle());
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
        honk: [[392, 0.12, 0], [494, 0.12, 0], [392, 0.16, 0.18], [494, 0.16, 0.18]], brake: [[1300, 0.35, 0]],
        shot: [[1100, 0.03, 0], [170, 0.12, 0.01], [85, 0.16, 0.02]], empty: [[1800, 0.02, 0]],
        gun: [[330, 0.08, 0], [494, 0.08, 0.08], [659, 0.18, 0.16]], cuff: [[2100, 0.03, 0], [2500, 0.03, 0.08], [1400, 0.05, 0.16]],
        dial: [[941, 0.1, 0], [1336, 0.1, 0], [770, 0.1, 0.15], [1209, 0.1, 0.15], [697, 0.1, 0.3], [1336, 0.1, 0.3]],
        doors: [[300, 0.05, 0], [220, 0.09, 0.05]], ding: [[988, 0.12, 0], [784, 0.3, 0.14]], lift: [[110, 0.5, 0], [125, 0.5, 0.45]],
        alert: [[880, 0.08, 0], [660, 0.08, 0.09], [880, 0.14, 0.18]],
        ring: [[425, 0.35, 0], [425, 0.35, 0.65]], connect: [[660, 0.07, 0], [880, 0.1, 0.09]],
        cash: [[1568, 0.06, 0], [2093, 0.11, 0.1]],
        // The two-tone siren of a Swedish patrol car.
        siren: [[650, 0.42, 0], [980, 0.42, 0.44], [650, 0.42, 0.88], [980, 0.42, 1.32]],
        victory: [[392, 0.12, 0], [523, 0.12, 0.12], [659, 0.12, 0.24], [784, 0.45, 0.36]],
        defeat: [[270, 0.18, 0], [210, 0.18, 0.18], [150, 0.3, 0.36]],
      };
      for (const [frequency, duration, delay] of notes[name] || []) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = ['hit', 'hurt', 'smash', 'thud', 'shot', 'brake', 'lift'].includes(name) ? 'sawtooth' : name === 'siren' ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(frequency, now + delay);
        if (name === 'swing' || name === 'dodge' || name === 'shot' || name === 'brake') osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency / 3), now + delay + duration);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(name === 'warn' || name === 'brake' ? 0.012 : name === 'siren' ? 0.05 : 0.035, now + delay + 0.01);
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
      <div class="eyebrow"><span class="chip">01</span> ${t('title.eyebrow')} <span class="gold-line"></span> 1994</div>
      <h1>RINGSTORP<br><span>RUN</span><i>▸</i></h1>
      <p class="subtitle">${t('title.subtitle')}</p>
      <p class="story">${t('title.story')}</p>
      <div class="action-row route-row">
        <button class="primary-button" data-action="start">${t('title.start')}</button>
        <span>${t('title.hint')}</span>
      </div>
      <div class="action-row route-row">
        <button class="secondary-button" data-action="start-2">${t('title.level2')}</button>
        <span>${t('title.level2Hint')}</span>
      </div>
      <div class="controls-grid"><div><kbd>WASD</kbd> / <kbd>↑↓←→</kbd><span>${t('title.walk')}</span></div><div><kbd>SPACE</kbd><span>${t('title.jump')}</span></div><div><kbd>J</kbd><span>${t('title.punch')}</span></div><div><kbd>K</kbd><span>${t('title.dodge')}</span></div></div>
    </div>`;
  if (mode === 'paused') return `<div class="panel compact-panel"><div class="eyebrow">${t('pause.eyebrow')}</div><h2>${t('pause.title')}<span class="blink">_</span></h2><p>${t('pause.text')}</p><div class="action-row"><button class="primary-button" data-action="resume">${t('pause.resume')}</button><button class="secondary-button" data-action="restart">${t('pause.restart')}</button></div><small>${t('pause.hint')}</small></div>`;
  if (mode === 'victory' && game.level === 2) {
    const g2 = game.gods;
    const spotted = g2.spotted ? t('win2.spotted', { n: g2.spotted }) : '';
    return `<div class="panel compact-panel outcome-panel"><div class="eyebrow">${t('win2.eyebrow')}</div><h2>${t('win.title')}<span class="gold">.</span></h2><p>${t('win2.text', { pay: g2.payout, n: g2.assignment, spotted })}</p><div class="result-grid"><div><span>${t('win.time')}</span><b>${formatTime(game.elapsed)}</b></div><div><span>${t('win2.pay')}</span><b>${g2.payout} KR</b></div><div><span>${t('win2.cash')}</span><b>${game.cash} KR</b></div></div><div class="action-row"><button class="primary-button" data-action="restart">${t('win2.next')}</button><button class="secondary-button" data-action="menu">${t('win2.menu')}</button><span>${t('win2.nextHint')}</span></div></div>`;
  }
  if (mode === 'victory') {
    const withPatch = game.healed, withSupplies = game.shopHealed;
    const story = t('win.base') + (withPatch ? t('win.withPatch') : '') + (withSupplies ? t(withPatch ? 'win.andSupplies' : 'win.withSupplies') : '')
      + (game.metDD ? t('win.dd') : '') + (game.fines ? t('win.fined', { points: game.fines * FINE }) : '') + '.';
    return `<div class="panel compact-panel outcome-panel"><div class="eyebrow">${t('win.eyebrow')}</div><h2>${t('win.title')}<span class="gold">.</span></h2><p>${story}</p><div class="result-grid"><div><span>${t('win.time')}</span><b>${formatTime(game.elapsed)}</b></div><div><span>${t('win.crews')}</span><b>${game.koCount}</b></div><div><span>${t('win.score')}</span><b>${game.score.toString().padStart(5, '0')}</b></div></div><div class="action-row"><button class="primary-button" data-action="restart">${t('win.again')}</button><span>${t('win.againHint')}</span></div></div>`;
  }
  const resume = game.checkpoint !== null
    ? `<button class="primary-button" data-action="continue">${t('lose.continue')}</button><button class="secondary-button" data-action="restart">${t('lose.startOver')}</button>`
    : `<button class="primary-button" data-action="restart">${t('lose.retry')}</button><span>${t('lose.retryHint')}</span>`;
  return `<div class="panel compact-panel outcome-panel"><div class="eyebrow">${t('lose.eyebrow')}</div><h2>${t('lose.title')}<span class="red">.</span></h2><p>${t(game.checkpoint !== null ? 'lose.checkpoint' : 'lose.nocheckpoint')}</p><div class="result-grid"><div><span>${t('win.time')}</span><b>${formatTime(game.elapsed)}</b></div><div><span>${t('lose.package')}</span><b>${t(game.hasPackage ? 'lose.carried' : 'lose.atKiosk')}</b></div><div><span>${t('win.crews')}</span><b>${game.koCount}</b></div></div><div class="action-row">${resume}</div></div>`;
}

function syncUI(): void {
  phone.sync();
  phoneButton.hidden = game.mode !== 'playing' || !game.hasPhone;
  renderControls();
  cashDisplay.textContent = `${game.cash} KR`;
  if (lastMode !== game.mode) {
    lastMode = game.mode;
    overlay.innerHTML = panelFor(game.mode);
    overlay.hidden = game.mode === 'playing';
    hud.hidden = game.mode === 'title';
    // A start button that has just been hidden must not keep the keyboard focus.
    if (game.mode === 'playing' && document.activeElement instanceof HTMLElement && overlay.contains(document.activeElement)) document.activeElement.blur();
  }
  const lifeText = t(game.level === 2 ? 'hud.cargo' : 'hud.health');
  if (lifeLabel.textContent !== lifeText) lifeLabel.textContent = lifeText;
  const levelText = t(game.level === 2 ? 'top.level2' : 'top.level1');
  if (levelLine.textContent !== levelText) levelLine.textContent = levelText;
  if (game.mode !== 'title' && game.level === 2) {
    const g2 = game.gods, state = g2.hidden ? 'cargo.hidden' : g2.cargo === 'carried' ? 'cargo.carried' : g2.cargo === 'stashed' ? 'cargo.stashed' : 'cargo.none';
    hearts.innerHTML = `<span class="cargo cargo-${g2.cargo}">${t(state)}${game.sneaking && !g2.hidden ? ` · ${t('cargo.sneak')}` : ''}</span>`;
    ammo.hidden = true;
    objective.textContent = game.objective;
    const shop = game.stage.shopX ?? 0, school = game.stage.facades.find(f => f.role === 'school')?.x1 ?? 0, x = game.player.x, inside = g2.scene !== 'street';
    const steps: Array<[string, string, string]> = [
      [g2.received ? 'done' : 'active', g2.received ? '✓' : '?', t('step2.dd')],
      [!inside && g2.received && x > shop + 400 ? 'done' : g2.received ? 'active' : '', x > shop + 400 && g2.received ? '✓' : '✚', t('step2.shop')],
      [!inside && g2.received && x > school ? 'done' : '', x > school && g2.received ? '✓' : '✚', t('step2.school')],
      [game.mode === 'victory' ? 'done' : '', '★', t('step.home')],
    ];
    progress.innerHTML = steps.map(([state, icon, title]) => `<span class="progress-step ${state}" title="${title}">${icon}</span>`).join('<i></i>') + '<em class="route-name">Kurirgatan → Ringstorpsvägen</em>';
    timeDisplay.textContent = formatTime(game.elapsed);
    scoreDisplay.textContent = `${game.cash}`.padStart(5, '0');
    streetLine.textContent = inside ? `KURIRGATAN 28 · ${t('cabin.floor')} ${g2.floor === 0 ? t('cabin.ground') : g2.floor}` : `${(game.street ?? 'Kurirgatan').toUpperCase()} · ${t('hud.toHome', { m: Math.round(game.metresToHome) })}`;
  } else if (game.mode !== 'title') {
    hearts.innerHTML = Array.from({ length: game.player.maxHp }, (_, i) => `<span class="heart ${i >= game.player.hp ? 'empty' : ''}">♥</span>`).join('');
    ammo.hidden = !game.metDD && game.ammo <= 0;
    ammo.setAttribute('aria-label', t('hud.rounds', { n: game.ammo }));
    ammo.innerHTML = `<b>I</b> ${Array.from({ length: CLIP }, (_, i) => `<i class="${i < game.ammo ? '' : 'spent'}"></i>`).join('')} ${game.ammo === 0 && game.hasPhone ? t('hud.callDD') : ''}`;
    objective.textContent = game.objective;
    const marcusState = game.healed ? 'done' : game.hasPackage && game.marcusAhead ? 'active' : 'optional';
    const shopState = game.shopHealed ? 'done' : game.stage.shopX !== null && game.player.x < game.stage.shopX + 90 ? 'active' : 'optional';
    const steps: Array<[string, string, string]> = [
      [game.hasPackage ? 'done' : 'active', game.hasPackage ? '✓' : '?', t('step.package')],
      [marcusState, game.healed ? '✓' : '✚', 'Marcus A · Långåkersgatan 4'],
      [shopState, game.shopHealed ? '✓' : '✚', 'Kurir Livs · Kurirgatan 1'],
      [game.mode === 'victory' ? 'done' : game.hasPackage && marcusState !== 'active' && shopState !== 'active' ? 'active' : '', '★', t('step.home')],
    ];
    progress.innerHTML = steps.map(([state, icon, title]) => `<span class="progress-step ${state}" title="${title}">${icon}</span>`).join('<i></i>') + `<em class="route-name">${ROUTE_NAMES[game.route]}</em>`;
    timeDisplay.textContent = formatTime(game.elapsed);
    scoreDisplay.textContent = Math.max(0, game.koCount * 85 + (game.hasPackage ? 500 : 0) + (game.healed ? 250 : 0) - game.fines * FINE).toString().padStart(5, '0');
    const street = game.street ?? (game.hasPackage ? (game.metresToHome < 60 ? 'RINGSTORPSVÄGEN 55B' : 'PÅLSJÖ') : 'PÅLSJÖ KIOSK');
    streetLine.textContent = `${street.toUpperCase()} · ${t('hud.toHome', { m: Math.round(game.metresToHome) })}`;
  } else streetLine.textContent = 'PÅLSJÖ KIOSK → RINGSTORPSVÄGEN 55B';
  bestDisplay.textContent = game.bestScore.toString().padStart(5, '0');
  soundButton.textContent = t(soundOn ? 'sound.on' : 'sound.off');
  soundButton.setAttribute('aria-label', t(soundOn ? 'sound.mute' : 'sound.unmute'));
  const junction = game.junctionAhead, action = game.interaction;
  const bmw = game.cars.find(c => c.kind === 'bmw' && c.state === 'driving' && !c.handed && !c.delivery && c.x > game.camera - 60 && c.x < game.camera + 540);
  let choice = '';
  if (game.mode === 'playing' && game.level === 2) {
    if (action) {
      const g2 = game.gods, state = g2.hidden ? 'cargo.hidden' : g2.cargo === 'carried' ? 'cargo.carried' : g2.cargo === 'stashed' ? 'cargo.stashed' : 'cargo.none';
      choice = `<div><small>${t('choice2.small')}</small><strong>${action.label}</strong><span>${t(state)}</span></div><button type="button" aria-label="${action.label}"><kbd>E</kbd> ${t('choice2.use')}</button>`;
    }
  } else if (game.mode === 'playing' && game.dealerNearby) {
    choice = `<div><small>${t('choice.ddSmall')}</small><strong>${t('choice.ddTitle', { clip: CLIP, price: REFILL_PRICE })}</strong><span>${t('choice.ddHint', { cash: game.cash })}</span></div><button type="button" ${action?.kind === 'ammo' ? '' : 'disabled'} aria-label="${t('choice.ddAria')}"><kbd>E</kbd> ${t('choice.talk')}</button>`;
  } else if (game.mode === 'playing' && bmw) {
    choice = `<div><small>${t(bmw.dir > 0 ? 'choice.bmwFrom' : 'choice.bmwTowards')}</small><strong>${t('choice.bmwTitle')}</strong><span>${t(action?.kind === 'hail' ? 'choice.bmwNear' : 'choice.bmwFar')}</span></div><button type="button" ${action?.kind === 'hail' ? '' : 'disabled'} aria-label="${t('choice.bmwAria')}"><kbd>E</kbd> ${t('choice.wave')}</button>`;
  } else if (game.mode === 'playing' && junction) {
    const distance = Math.max(0, Math.ceil((junction.x - game.player.x) / 60) * 5);
    const place = junction.id === 'romares' ? 'Marcus A' : 'Kurir Livs';
    choice = `<div><small>${junction.street.toUpperCase()}${distance > 5 ? ` · ${distance} M` : ` · ${t('choice.junction')}`}</small><strong>↗ ${t(junction.turn as Key)}</strong><span>${t('choice.keepWalking', { straight: t(junction.straight as Key) })}</span></div><button type="button" ${action?.kind === 'turn' ? '' : 'disabled'} aria-label="${t('choice.turnAria', { place })}"><kbd>E</kbd> ${t(game.active ? 'choice.clearCrew' : action?.kind === 'turn' ? 'choice.turn' : 'choice.approach')}</button>`;
  } else if (game.mode === 'playing' && game.stage.shopX !== null && Math.abs(game.player.x - game.stage.shopX) < 150) {
    choice = `<div><small>ICA NÄRA · KURIR LIVS</small><strong>${t(game.shopHealed ? 'choice.shopTitleDone' : 'choice.shopTitle')}</strong><span>${action?.kind === 'shop' ? action.label : t('choice.shopHint')}</span></div><button type="button" ${action?.kind === 'shop' && !game.shopHealed && game.player.hp < game.player.maxHp ? '' : 'disabled'} aria-label="${t('choice.shopAria')}"><kbd>E</kbd> ${t('choice.shopButton')}</button>`;
  }
  streetChoice.hidden = !choice;
  if (lastChoice !== choice) { streetChoice.innerHTML = choice; lastChoice = choice; }
}

function restart(): void {
  held.clear();
  // In the Gods run, restarting retries the same assignment; after a delivery it moves on to the next.
  if (game.level === 2) game.startGods(game.gods.assignment + (game.mode === 'victory' ? 1 : 0));
  else game.start();
  renderer.resetCamera(); syncUI();
}
function startLevel2(): void { held.clear(); game.startGods(1); renderer.resetCamera(); syncUI(); }
overlay.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  const action = button?.dataset.action;
  if (action === 'start' || action === 'restart') restart();
  if (action === 'start-2') startLevel2();
  if (action === 'menu') { held.clear(); game.toTitle(); renderer.resetCamera(); }
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

langButton.addEventListener('click', event => {
  setLang(getLang() === 'en' ? 'sv' : 'en');
  if (event.detail > 0) langButton.blur();
});
onLangChange(() => {
  applyStatic();
  controlsKey = '';
  lastMode = ''; lastChoice = '';
  phone.relabel();
  syncUI();
});

canvas.addEventListener('pointerdown', event => {
  if (game.level !== 2 || game.mode !== 'playing' || game.gods.scene !== 'cabin') return;
  const box = canvas.getBoundingClientRect();
  const n = panelHit((event.clientX - box.left) / box.width * WIDTH, (event.clientY - box.top) / box.height * HEIGHT);
  if (n !== null) { game.gods.pressFloor(n); syncUI(); }
});

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if ((key === 'f' && game.hasPhone) || (key === 'escape' && game.phoneOpen)) {
    event.preventDefault();
    if (!event.repeat) phone.toggle();
    return;
  }
  if (game.phoneOpen) {
    if (key === 'm' && !event.repeat) toggleSound();
    if (movementKeys.has(key) || ['j', 'k', 'l', 'i', 'e'].includes(key)) event.preventDefault();
    return;
  }
  // Let keyboard users activate the focused UI button normally.
  if ((key === 'enter' || key === ' ') && event.target instanceof HTMLButtonElement) return;
  if (movementKeys.has(key) || ['j', 'k', 'l', 'i', 'e', 'escape', 'enter', 'm', ' '].includes(key)) event.preventDefault();
  if (key === 'e' && !event.repeat && game.mode === 'playing') { game.interact(); syncUI(); }
  if (game.level === 2 && game.mode === 'playing' && /^[0-8]$/.test(key) && !event.repeat) { event.preventDefault(); game.gods.pressFloor(Number(key)); syncUI(); }
  if (key === 'm' && !event.repeat) toggleSound();
  if (key === 'escape' && !event.repeat) { game.togglePause(); syncUI(); }
  if (key === 'enter' && !event.repeat && game.mode === 'defeat' && game.checkpoint !== null) { held.clear(); game.continueFromCheckpoint(); syncUI(); }
  else if (key === 'enter' && !event.repeat && ['title', 'victory', 'defeat'].includes(game.mode)) restart();
  if (key === 'j' && !event.repeat && game.mode === 'playing') game.queueAttack();
  if (key === 'k' && !event.repeat && game.mode === 'playing') game.queueDodge();
  if (key === 'i' && !event.repeat && game.mode === 'playing') game.queueShot();
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
  game.setSneak(held.has('shift'));
  game.update(dt);
  for (const event of game.events.splice(0)) sound.play(event);
  renderer.render(game, dt);
  syncUI();
  requestAnimationFrame(tick);
}
syncUI();
requestAnimationFrame(tick);
