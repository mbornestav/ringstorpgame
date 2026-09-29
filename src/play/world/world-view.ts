import Phaser from 'phaser';
import type { SideGame } from '../../side/game';
import { SideRenderer } from '../../side/render';
import { HEIGHT, WIDTH } from '../../side/layout';
import { isSmooth } from '../../side/pixel';
import { RENDER_SCALE } from '../config';

/**
 * The seam between the simulation and whatever draws the world. Implementations must only read the game, must tolerate
 * `game.stage` changing between any two frames, and must animate from the `dt` they are given (never the wall clock) so that
 * a stepped, frozen game renders reproducibly.
 */
export interface WorldView {
  create(scene: Phaser.Scene): void;
  update(game: SideGame, dt: number): void;
  /** A fresh run has begun: restart the title pan and any trailing effects. */
  reset(): void;
  destroy(): void;
}

/**
 * The world as one canvas that Phaser shows as a texture. The renderer draws in logical 480x270 coordinates onto a canvas
 * `RENDER_SCALE` times larger, so in smooth mode everything is anti-aliased vector art at the screen's own resolution, and
 * in pixel mode (`?look=pixel`) it is the original 480x270 picture magnified with nearest-neighbour filtering.
 */
export class CanvasWorldView implements WorldView {
  private renderer: SideRenderer | null = null;
  private texture: Phaser.Textures.CanvasTexture | null = null;
  private image: Phaser.GameObjects.Image | null = null;

  create(scene: Phaser.Scene): void {
    const smooth = isSmooth();
    const canvas = document.createElement('canvas');
    this.renderer = new SideRenderer(canvas, RENDER_SCALE);
    this.renderer.showHud = false;
    this.texture = scene.textures.addCanvas('world-canvas', canvas);
    this.texture?.setFilter(smooth ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
    this.image = scene.add.image(0, 0, 'world-canvas').setOrigin(0, 0).setDisplaySize(WIDTH, HEIGHT);
  }

  update(game: SideGame, dt: number): void {
    this.renderer?.render(game, dt);
    this.texture?.refresh();
  }

  reset(): void { this.renderer?.resetCamera(); }

  destroy(): void {
    this.image?.destroy();
    this.texture?.destroy();
    this.image = null; this.texture = null; this.renderer = null;
  }
}
