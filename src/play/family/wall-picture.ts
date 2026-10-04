import { INK, box, type C } from './art';
import { PAPER } from './games/pyssel';

// Carl-Otto's pictures on the walls of the house (from the craft corner, and the photos from the mirror in the little
// toilet): loaded once from their PNG data URLs, and drawn in a thin light frame.

const images = new Map<string, HTMLImageElement>();

/** A picture from the walls of the house (a PNG data URL), once it has loaded. */
export function wallPicture(url: string | undefined): HTMLImageElement | null {
  if (!url) return null;
  let img = images.get(url);
  if (!img) { img = new Image(); img.src = url; images.set(url, img); }
  return img.complete && img.naturalWidth ? img : null;
}

/** A picture hung on a wall: a thin light frame and a shadow, `w` wide, top-left at (x, y). */
export function paintHungPicture(c: C, img: HTMLImageElement, x: number, y: number, w: number, tilt = 0): void {
  const h = w * PAPER.h / PAPER.w;
  c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(tilt);
  box(c, 'rgba(40, 44, 34, 0.25)', -w / 2 - 6, -h / 2 + 2, w + 8, h + 8, 2);
  box(c, INK, -w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 2); box(c, '#f1f0ea', -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 1);
  c.drawImage(img, -w / 2, -h / 2, w, h);
  c.restore();
}
