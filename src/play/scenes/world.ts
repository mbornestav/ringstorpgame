import Phaser from 'phaser';
import { Controls } from '../input/controls';
import { Sfx } from '../audio/sfx';
import { floorAction } from '../actions';
import { panelHit } from '../../side/interior-layout';
import { RENDER_SCALE } from '../config';
import { CanvasWorldView, type WorldView } from '../world/world-view';
import { sessionOf } from './shared';
import { CRT } from '../look';
import { addCrt } from '../crt';
import { musicOf } from '../audio/music';
import type { TrackId } from '../audio/songs';
import type { SideGame } from '../../side/game';

/** Owns the simulation cadence: input in, `SideGame.update`, sound out, then the view. */
export class WorldScene extends Phaser.Scene {
  controls!: Controls;
  sfx!: Sfx;
  view!: WorldView;
  /** While true the scene stops advancing on its own; the test bridge steps it by hand. */
  frozen = false;

  constructor() { super('World'); }

  create(): void {
    const session = sessionOf(this);
    this.controls = new Controls(this, session);
    this.sfx = new Sfx(this.game.sound);
    this.sfx.setMuted(session.muted);
    this.view = new CanvasWorldView();
    this.view.create(this);

    // World objects live in logical 480x270 coordinates; the camera zooms them up to the canvas.
    this.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE);
    if (CRT) addCrt(this);

    // The lift's floor buttons are part of the picture, so they are found by position rather than as objects.
    const buttonAt = (pointer: Phaser.Input.Pointer): number | null => {
      const g = session.game;
      if (g.level !== 2 || g.mode !== 'playing' || g.gods.scene !== 'cabin') return null;
      // A click on a UI control (the pause card, say) must not also press a floor behind it.
      if (this.scene.get('UI').input.hitTestPointer(pointer).length > 0) return null;
      const at = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      return panelHit(at.x, at.y);
    };
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const floor = buttonAt(pointer);
      if (floor !== null) session.dispatch(floorAction(floor), 'pointer');
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { this.input.setDefaultCursor(buttonAt(pointer) !== null ? 'pointer' : 'default'); });

    const offReset = session.onReset(() => this.view.reset());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offReset();
      this.controls.destroy();
      this.view.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.frozen) this.step(Math.min(0.05, delta / 1000));
  }

  /** One frame of the game, `dt` seconds long. Also called directly by the test bridge. */
  step(dt: number): void {
    const session = sessionOf(this), g = session.game;
    this.controls.poll();
    g.update(dt);
    if (this.game.sound.mute !== session.muted) this.sfx.setMuted(session.muted);
    for (const event of g.events.splice(0)) this.sfx.play(event);
    this.music(session.game);
    this.view.update(g, dt);
  }

  /** The title theme on the title and results screens, each level's own track while playing, quieter while paused. */
  private music(g: SideGame): void {
    const m = musicOf(this.game);
    const level: TrackId = g.custom ? (g.custom.night ? 'heist' : 'street') : g.level === 3 ? 'heist' : g.level === 2 ? 'gods' : 'street';
    const results = g.mode === 'victory' || g.mode === 'defeat';
    // After a run the victory or defeat jingle plays first, then the title theme comes back.
    m.play(g.mode === 'playing' || g.mode === 'paused' ? level : 'title', results ? 2.4 : 0);
    m.setDucked(g.mode === 'paused' || g.phoneOpen);
  }
}
