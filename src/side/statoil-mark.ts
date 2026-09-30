import { isRetro, text, textWidth } from './pixel';

// The Statoil mark, drawn from the supplied reference (a square blue sign: the orange ring-drop with a drop-shaped hole
// and a slit up through its neck, and STATOIL in white below). Drawn as paths rather than a scaled bitmap, so it keeps its
// true proportions at any size. Units are the ring's outer radius; the ring is centred on the origin.

export const STATOIL_ORANGE = '#f8a322';
export const STATOIL_BLUE = '#003d7c';

/** The orange ring with its neck: the outer outline. */
function outer(c: CanvasRenderingContext2D): void {
  c.moveTo(-0.13, -1.33);
  c.lineTo(0.13, -1.33);
  c.bezierCurveTo(0.14, -1.1, 0.3, -1.0, 0.5, -0.866);
  c.arc(0, 0, 1, -Math.PI / 3, Math.PI * 4 / 3);
  c.bezierCurveTo(-0.3, -1.0, -0.14, -1.1, -0.13, -1.33);
  c.closePath();
}

/** The drop-shaped hole and the slit that runs from it up through the neck. */
function hole(c: CanvasRenderingContext2D): void {
  const r = 0.43, cy = 0.01, a = (220 * Math.PI) / 180, b = (-40 * Math.PI) / 180;
  c.moveTo(-0.047, -1.4);
  c.lineTo(-0.047, -0.72);
  c.bezierCurveTo(-0.05, -0.52, -0.3, -0.42, r * Math.cos(a), cy + r * Math.sin(a));
  c.arc(0, cy, r, a, b, true);
  c.bezierCurveTo(0.3, -0.42, 0.05, -0.52, 0.047, -0.72);
  c.lineTo(0.047, -1.4);
  c.closePath();
}

/** The ring-drop centred on (x, y) with outer radius `R`; the hole shows `background`. */
export function paintStatoilMark(c: CanvasRenderingContext2D, x: number, y: number, R: number, background: string = STATOIL_BLUE): void {
  c.save();
  c.translate(x, y); c.scale(R, R);
  c.beginPath(); outer(c); c.fillStyle = STATOIL_ORANGE; c.fill();
  c.beginPath(); hole(c); c.fillStyle = background; c.fill();
  c.restore();
}

/** The square sign: blue panel, the mark in its upper part, STATOIL beneath. Top-left at (x, y), `w` across. */
export function paintStatoilSign(c: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  c.fillStyle = STATOIL_BLUE;
  c.fillRect(x, y, w, w);
  paintStatoilMark(c, x + w / 2, y + w * 0.41, w * 0.25);
  const label = 'STATOIL';
  if (isRetro() || w < 60) {
    // Small: the pixel font, centred, as large as fits.
    const scale = Math.max(1, Math.floor((w * 0.84) / textWidth(label, 1)));
    text(c, label, Math.round(x + (w - textWidth(label, scale)) / 2), Math.round(y + w * 0.74), '#ffffff', scale);
    return;
  }
  c.font = `600 ${w * 0.16}px "IBM Plex Sans", Arial, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#ffffff';
  c.fillText(label, x + w / 2, y + w * 0.89, w * 0.84);
  c.textAlign = 'left';
}
