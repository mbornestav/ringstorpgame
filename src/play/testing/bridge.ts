import type Phaser from 'phaser';
import type { UiAction } from '../actions';
import type { Session } from '../session';
import type { UIScene } from '../scenes/ui';
import type { WorldScene } from '../scenes/world';
import { controlsModel, footerModel, hudModel, mastheadModel, panelModel, phoneModel, promptModel, worldHudModel } from '../ui/models';

/** Development-only handle for browser tests and screenshots. Never referenced from production code paths. */
export function installBridge(game: Phaser.Game, session: Session): void {
  const world = () => game.scene.getScene('World') as WorldScene;
  const ui = () => game.scene.getScene('UI') as UIScene;
  const ready = new Promise<void>(resolve => {
    const check = () => { if (game.scene.isActive('World') && world().view) resolve(); else setTimeout(check, 16); };
    check();
  });
  const bridge = {
    ready,
    game,
    session,
    sim: session.game,
    click: (action: UiAction) => session.dispatch(action),
    available: (action: UiAction) => session.available(action),
    /** Stops the scene advancing by itself. */
    freeze: () => { world().frozen = true; },
    thaw: () => { world().frozen = false; },
    /** Advances the game by hand: `n` frames of `dt` seconds. Implies freeze. */
    step: (dt = 1 / 60, n = 1) => { world().frozen = true; for (let i = 0; i < n; i++) world().step(dt); },
    /** The current frame as a PNG data URL (the game is created with preserveDrawingBuffer in dev). */
    render: () => game.canvas.toDataURL('image/png'),
    /** Where a control is on the page, in CSS pixels, for a real mouse click; null when it is not showing. */
    bounds: (id: string) => {
      const b = ui().boundsOf(id);
      if (!b) return null;
      const canvas = game.canvas.getBoundingClientRect(), k = canvas.width / game.scale.gameSize.width;
      return { x: canvas.left + b.x * k, y: canvas.top + b.y * k, width: b.width * k, height: b.height * k };
    },
    /** What the interface is showing, as the plain models the canvas and the hidden DOM are both drawn from. */
    ui: () => ({
      panel: panelModel(session), hud: hudModel(session), prompt: promptModel(session), phone: phoneModel(session),
      controls: controlsModel(session), masthead: mastheadModel(session), footer: footerModel(session), world: worldHudModel(session),
    }),
    audio: () => ({ recent: [...world().sfx.recent], muted: session.muted, mute: game.sound.mute }),
    state: () => {
      const g = session.game;
      return { mode: g.mode, level: g.level, x: g.player.x, y: g.player.y, z: g.player.z, hp: g.player.hp, camera: g.camera, elapsed: g.elapsed, hasPackage: g.hasPackage, titleView: session.titleView, muted: session.muted };
    },
  };
  Object.defineProperty(window, '__ringstorp', { value: bridge, configurable: true });
  Object.defineProperty(window, '__ringstorpGame', { value: session.game, configurable: true });
}
