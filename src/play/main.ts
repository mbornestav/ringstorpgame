import './look';
import Phaser from 'phaser';
import './page.css';
import { getLang, onLangChange, setLang, t } from '../side/i18n';
import { SideGame } from '../side/game';
import { setArtFont } from '../side/pixel';
import { loadLogos } from './art/logos';
import { gameConfig } from './config';
import { FONT, loadFonts } from './fonts';
import { Session } from './session';
import { levelById } from '../side/levels';
import { BootScene } from './scenes/boot';
import { UIScene } from './scenes/ui';
import { WorldScene } from './scenes/world';
import { HubScene } from './family/hub-scene';
import { BikeScene } from './family/bike-scene';
import { HideScene } from './family/hide-scene';
import { MovieScene } from './family/movie-scene';
import { HouseScene } from './family/house-scene';
import { CraftScene } from './family/craft-scene';
import { PancakeScene } from './family/pancake-scene';
import { GoodnightScene } from './family/goodnight-scene';
import { MorningScene } from './family/morning-scene';

const params = new URLSearchParams(location.search);
// New visitors meet the Swedish collection; an existing language choice is respected.
try { if (!localStorage.getItem('ringstorp-lang')) setLang('sv'); } catch { setLang('sv'); }

/** A small seeded generator for `?seed=N`, so a run (and its screenshots) can be repeated. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function fail(message: string): void {
  const slot = document.getElementById('boot-error');
  if (slot) { slot.hidden = false; slot.textContent = message; }
}

function applyPage(): void {
  document.documentElement.lang = getLang();
  document.title = t('page.title');
}
applyPage();
const offLang = onLangChange(applyPage);

const sim = new SideGame();
if (import.meta.env.DEV && params.has('seed')) {
  const seed = Number(params.get('seed'));
  if (Number.isInteger(seed) && seed >= 0) { sim.random = mulberry32(seed); sim.reset(); }
}
const session = new Session(sim);

// `?start=1|2|3` skips the menus (used by tests and screenshots).
const start = params.get('start');
if (start === '1') session.dispatch('start');
else if (start === '2') { session.dispatch('start-2'); session.dispatch('answer'); }
else if (start === '3') { session.dispatch('start-3'); session.dispatch('answer-3'); }
// `?level=<id>` plays a level file directly, whether or not it is on the menu.
const level = params.get('level');
if (level) {
  const def = levelById(level);
  if (def) { sim.startLevel(def); } else console.warn(`No level "${level}" in src/side/levels`);
}

async function boot(): Promise<void> {
  let game: Phaser.Game;
  try {
    // Fonts and brand artwork must be ready before any scenery is baked: baked text is measured once and never redrawn.
    await Promise.all([loadFonts(), loadLogos()]);
    setArtFont(FONT.display);
    // `?artlab=1` (development only) shows the art lab instead of the game.
    const lab = import.meta.env.DEV && params.has('artlab') ? (await import('./testing/artlab')).ArtLabScene : null;
    game = new Phaser.Game(gameConfig(lab ? [lab] : [BootScene, WorldScene, UIScene, HubScene, BikeScene, HideScene, MovieScene, HouseScene, CraftScene, PancakeScene, GoodnightScene, MorningScene], {
      preBoot: g => { g.registry.set('session', session); },
    }));
  } catch (error) {
    fail(`${t('error.start')}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (import.meta.env.DEV) void import('./testing/bridge').then(({ installBridge }) => installBridge(game, session));
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      offLang();
      game.destroy(true);
      const host = document.getElementById('game');
      if (host) host.innerHTML = '';
    });
  }
}
void boot();
