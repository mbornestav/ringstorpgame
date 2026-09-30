import Phaser from 'phaser';
import type { SideGame } from '../../side/game';
import { SideRenderer } from '../../side/render';
import { HEIGHT, WIDTH } from '../../side/layout';
import { isRetro, isSmooth } from '../../side/pixel';
import { paletteFor } from '../../side/palettes';
import { addRetroImage } from './retro-shader';
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
 * The world as one canvas that Phaser shows as a texture. The renderer draws in logical 480x270 coordinates. In retro mode
 * (the default) it draws the detailed art at 480x270, snaps it to a palette and Phaser magnifies it with nearest-neighbour
 * filtering; in smooth mode (`?look=smooth`) it draws onto a canvas `RENDER_SCALE` times larger as anti-aliased vector art;
 * pixel mode (`?look=pixel`) is the original 480x270 pixel art.
 */
export class CanvasWorldView implements WorldView {
  private renderer: SideRenderer | null = null;
  private texture: Phaser.Textures.CanvasTexture | null = null;
  private image: Phaser.GameObjects.Image | Phaser.GameObjects.Shader | null = null;

  create(scene: Phaser.Scene): void {
    const hires = isSmooth() && !isRetro();
    const canvas = document.createElement('canvas');
    this.renderer = new SideRenderer(canvas, hires ? RENDER_SCALE : 1);
    this.renderer.showHud = false;
    this.texture = scene.textures.addCanvas('world-canvas', canvas);
    this.texture?.setFilter(hires ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
    const renderer = this.renderer;
    this.image = isRetro()
      ? addRetroImage(scene, 'world-canvas', 0, 0, WIDTH, HEIGHT, () => paletteFor(renderer.lighting))
      : scene.add.image(0, 0, 'world-canvas').setOrigin(0, 0).setDisplaySize(WIDTH, HEIGHT);
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
