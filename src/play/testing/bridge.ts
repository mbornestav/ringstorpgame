import type Phaser from 'phaser';
import type { UiAction } from '../actions';
import type { Session } from '../session';
import type { UIScene } from '../scenes/ui';
import type { WorldScene } from '../scenes/world';
import type { FamilySurface } from '../family/surface';
import type { BikeScene } from '../family/bike-scene';
import type { HideScene } from '../family/hide-scene';
import type { MovieScene } from '../family/movie-scene';
import type { HouseScene } from '../family/house-scene';
import type { CraftScene } from '../family/craft-scene';
import type { PancakeScene } from '../family/pancake-scene';
import type { GoodnightScene } from '../family/goodnight-scene';
import type { MorningScene } from '../family/morning-scene';
import { controlsModel, footerModel, hudModel, mastheadModel, panelModel, phoneModel, promptModel, worldHudModel } from '../ui/models';
import { musicOf } from '../audio/music';

/** Development-only handle for browser tests and screenshots. Never referenced from production code paths. */
export function installBridge(game: Phaser.Game, session: Session): void {
  const world = () => game.scene.getScene('World') as WorldScene;
  const ui = () => game.scene.getScene('UI') as UIScene;
  /** Whichever running scene advances by frames: a Carl-Otto game, or Ringstorp Run's world. */
  const family = ['Bike', 'Hide', 'Movie', 'House', 'Craft', 'Pancake', 'Goodnight', 'Morning'];
  const stepper = (): { frozen: boolean; step(dt: number): void } => {
    const active = family.find(key => game.scene.isActive(key));
    return active ? game.scene.getScene(active) as BikeScene | HideScene | MovieScene | HouseScene | CraftScene | PancakeScene | GoodnightScene | MorningScene : world();
  };
  const ready = new Promise<void>(resolve => {
    const check = () => { if ((game.scene.isActive('World') && world().view) || ['Hub', ...family].some(key => game.scene.isActive(key))) resolve(); else setTimeout(check, 16); };
    check();
  });
  const bridge = {
    ready,
    game,
    session,
    sim: session.game,
    bike: () => (game.scene.getScene('Bike') as BikeScene).run,
    hide: () => (game.scene.getScene('Hide') as HideScene).run,
    movie: () => (game.scene.getScene('Movie') as MovieScene).run,
    morning: () => (game.scene.getScene('Morning') as MorningScene).run,
    goodnight: () => (game.scene.getScene('Goodnight') as GoodnightScene).run,
    pancake: () => (game.scene.getScene('Pancake') as PancakeScene).run,
    craft: () => (game.scene.getScene('Craft') as CraftScene).run,
    house: () => { const s = game.scene.getScene('House') as HouseScene; return { selected: s.selected, head: s.head, done: [...s.progress.done] }; },
    click: (action: UiAction) => session.dispatch(action),
    available: (action: UiAction) => session.available(action),
    /** Stops the scene advancing by itself. */
    freeze: () => { stepper().frozen = true; },
    thaw: () => { stepper().frozen = false; },
    /** Advances the game by hand: `n` frames of `dt` seconds. Implies freeze. */
    step: (dt = 1 / 60, n = 1) => {
      const target = stepper();
      target.frozen = true; for (let i = 0; i < n; i++) target.step(dt);
    },
    /** The current frame as a PNG data URL (the game is created with preserveDrawingBuffer in dev). */
    render: () => game.canvas.toDataURL('image/png'),
    /** Where a control is on the page, in CSS pixels, for a real mouse click; null when it is not showing. */
    bounds: (id: string) => {
      const surface = ['Hub', ...family].find(key => game.scene.isActive(key));
      const b = surface ? (game.scene.getScene(surface) as FamilySurface).boundsOf(id) : ui().boundsOf(id);
      if (!b) return null;
      const canvas = game.canvas.getBoundingClientRect(), k = canvas.width / game.scale.gameSize.width;
      return { x: canvas.left + b.x * k, y: canvas.top + b.y * k, width: b.width * k, height: b.height * k };
    },
    /** What the interface is showing, as the plain models the canvas and the hidden DOM are both drawn from. */
    ui: () => ({
      panel: panelModel(session), hud: hudModel(session), prompt: promptModel(session), phone: phoneModel(session),
      controls: controlsModel(session), masthead: mastheadModel(session), footer: footerModel(session), world: worldHudModel(session),
    }),
    music: () => { const m = musicOf(game); return { track: m.track, position: m.position, muted: game.sound.mute }; },
    audio: () => ({ recent: [...world().sfx.recent], muted: session.muted, mute: game.sound.mute }),
    state: () => {
      const g = session.game;
      return { mode: g.mode, level: g.level, x: g.player.x, y: g.player.y, z: g.player.z, hp: g.player.hp, camera: g.camera, elapsed: g.elapsed, hasPackage: g.hasPackage, titleView: session.titleView, muted: session.muted };
    },
  };
  Object.defineProperty(window, '__ringstorp', { value: bridge, configurable: true });
  Object.defineProperty(window, '__ringstorpGame', { value: session.game, configurable: true });
}
