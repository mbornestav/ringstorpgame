import { beginArt, grain } from './pixel';
import { HEIGHT } from './layout';

// Smooth-mode lighting for the buildings. A facade is painted onto a scratch canvas the size of the chunk being baked,
// then lit there with 'source-atop', so the light only lands on the building's own pixels whatever its outline (gables,
// stepped roofs, chimneys): the sun from the right across the elevation, a lighter roof crown, a soft shadow under the
// eaves, occlusion where the wall meets the plinth, and a fine plaster grain. It then goes onto the chunk over a contact
// shadow on the ground. Everything here happens once per chunk bake, never per frame.

export interface LitBox { x0: number; x1: number; base: number; floor: number; wallTop: number; top: number }
export interface LitOptions { gable: boolean; far: boolean; night?: boolean }

let scratch: HTMLCanvasElement | null = null;
let rim: HTMLCanvasElement | null = null;

/**
 * Draws a facade through `paint` onto the chunk context `c`, lit. `lo`..`hi` is the chunk's padded logical range, `S` its
 * scale, and `x0` the chunk's left edge; `pad` is the chunk's padding. The scratch canvas uses the same transform as the
 * chunk, so the result lands pixel for pixel where a direct draw would.
 */
export function drawLitFacade(
  c: CanvasRenderingContext2D, S: number, chunkX0: number, pad: number, width: number,
  b: LitBox, o: LitOptions, paint: (s: CanvasRenderingContext2D) => void,
): void {
  const k = o.far ? 0.55 : 1;
  const w = b.x1 - b.x0;
  // A soft contact shadow on the ground in front of the wall.
  const contact = c.createLinearGradient(0, b.base - 1, 0, b.base + (o.far ? 3 : 6));
  contact.addColorStop(0, `rgba(22, 30, 22, ${0.34 * k})`); contact.addColorStop(1, 'rgba(22, 30, 22, 0)');
  c.fillStyle = contact; c.fillRect(b.x0 - 3, b.base - 1, w + 6, o.far ? 4 : 7);

  scratch ??= document.createElement('canvas');
  const W = Math.ceil(width * S), H = HEIGHT * S;
  if (scratch.width !== W || scratch.height !== H) { scratch.width = W; scratch.height = H; }
  const s = scratch.getContext('2d')!;
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.clearRect(0, 0, W, H);
  beginArt(s, S);
  s.translate(pad - chunkX0, 0);
  paint(s);

  s.globalCompositeOperation = 'source-atop';
  const X0 = b.x0 - 8, X1 = b.x1 + 8, top = Math.max(0, b.top - 40);
  // Sun from the right: the left end of the building in a cool half-shade, the right end warmed.
  const sun = s.createLinearGradient(b.x0, 0, b.x1, 0);
  sun.addColorStop(0, `rgba(20, 26, 48, ${0.22 * k})`); sun.addColorStop(0.45, 'rgba(20, 26, 48, 0)');
  sun.addColorStop(0.8, 'rgba(255, 238, 205, 0)'); sun.addColorStop(1, o.night ? 'rgba(255, 238, 205, 0)' : `rgba(255, 238, 205, ${0.16 * k})`);
  s.fillStyle = sun; s.fillRect(X0, top, X1 - X0, b.base + 30 - top);
  // The roof: its crown catching the sky, the slope darkening down to the eaves.
  const roofBottom = b.wallTop + 3;
  if (roofBottom - b.top > 2) {
    const roof = s.createLinearGradient(0, b.top - 6, 0, roofBottom);
    roof.addColorStop(0, `rgba(255, 246, 226, ${0.2 * k})`); roof.addColorStop(0.5, 'rgba(255, 246, 226, 0)'); roof.addColorStop(1, `rgba(16, 14, 28, ${0.2 * k})`);
    s.fillStyle = roof; s.fillRect(X0, top, X1 - X0, roofBottom - top);
  }
  // Shadow cast by the eaves onto the top of the wall.
  if (!o.gable) {
    const eave = s.createLinearGradient(0, b.wallTop + 2, 0, b.wallTop + 11);
    eave.addColorStop(0, `rgba(18, 14, 30, ${0.34 * k})`); eave.addColorStop(1, 'rgba(18, 14, 30, 0)');
    s.fillStyle = eave; s.fillRect(b.x0, b.wallTop + 2, w, 9);
  }
  // Occlusion low on the wall and over the plinth, where less sky reaches.
  const low = s.createLinearGradient(0, b.floor - 16, 0, b.base);
  low.addColorStop(0, 'rgba(18, 14, 30, 0)'); low.addColorStop(0.8, `rgba(18, 14, 30, ${0.18 * k})`); low.addColorStop(1, `rgba(18, 14, 30, ${0.32 * k})`);
  s.fillStyle = low; s.fillRect(X0, b.floor - 16, X1 - X0, b.base - b.floor + 16);
  // Distant rows sink into the haze.
  if (o.far) { s.fillStyle = 'rgba(199, 214, 204, 0.14)'; s.fillRect(X0, top, X1 - X0, b.base + 2 - top); }
  grain(s, X0, top, X1 - X0, b.base - top, o.far ? 0.025 : 0.05);
  s.globalCompositeOperation = 'source-over';

  // A sunlit rim along the silhouette's top and right edges: the building minus itself nudged towards the sun.
  rim ??= document.createElement('canvas');
  if (rim.width !== W || rim.height !== H) { rim.width = W; rim.height = H; }
  const r = rim.getContext('2d')!, d = Math.max(1, Math.round(0.7 * S));
  r.setTransform(1, 0, 0, 1, 0, 0);
  r.globalCompositeOperation = 'copy'; r.drawImage(scratch, 0, 0);
  r.globalCompositeOperation = 'destination-out'; r.drawImage(scratch, -d, d);
  r.globalCompositeOperation = 'source-in'; r.fillStyle = o.night ? '#c8d6ff' : '#fff1d2'; r.fillRect(0, 0, W, H);
  r.globalCompositeOperation = 'source-over';

  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(scratch, 0, 0);
  c.globalAlpha = (o.night ? 0.25 : 0.5) * k;
  c.drawImage(rim, 0, 0);
  c.restore();
}
