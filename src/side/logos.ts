import { isSmooth } from './pixel';

// Brand artwork for the smooth build. The images are loaded by the Phaser build (src/play/art/logos.ts) before any
// scenery is baked and handed over here, so the art code stays free of loading. In pixel mode, or before the images arrive,
// `drawLogo` returns false and callers draw their original lettering instead.

export type LogoName = 'ica' | 'bildeve';
export type LogoImage = CanvasImageSource & { width: number; height: number };

const images = new Map<LogoName, LogoImage>();

export function setLogo(name: LogoName, image: LogoImage): void { images.set(name, image); }

/**
 * Draws a logo with its top-left at (x, y), `w` logical pixels wide, keeping its proportions unless `h` is given.
 * Returns whether it was drawn.
 */
export function drawLogo(c: CanvasRenderingContext2D, name: LogoName, x: number, y: number, w: number, h?: number): boolean {
  const image = images.get(name);
  if (!image || !isSmooth()) return false;
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(image, x, y, w, h ?? w * image.height / image.width);
  c.restore();
  return true;
}
