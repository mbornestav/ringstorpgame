import { rect, seg, text } from './pixel';

// A hand-drawn "Thaeo" tag, with a capital T and joined, lower-case letters.
// Integer-stamped strokes keep the paint crisp at the game's native resolution.
const STROKES: Array<Array<[number, number]>> = [
  [[0, 2], [9, 0]], [[5, 1], [3, 11]],                         // T
  [[12, 0], [10, 11]], [[11, 7], [14, 4], [16, 5], [15, 11]], // h
  [[24, 5], [21, 4], [19, 6], [19, 9], [21, 11], [24, 8]],   // a
  [[24, 4], [23, 11], [25, 10]],
  [[28, 7], [34, 6], [33, 4], [30, 4], [27, 7], [27, 10], [30, 11], [34, 9]], // e
  [[41, 4], [38, 4], [36, 7], [36, 10], [39, 11], [42, 8], [42, 5], [41, 4]], // o
  [[5, 14], [24, 13], [40, 13]],                             // paint flourish
];

/** Scaled 46 × 18 paint strokes; low walls use a compact 22 × 7 lettering variant. */
export function drawThaeo(c: CanvasRenderingContext2D, x: number, y: number, scale: number, paint: string): void {
  if (scale < 0.6) {
    // Thin boundary walls need simpler lettering to keep the name legible.
    text(c, 'THAEO', x + 1, y + 1, '#30353e');
    text(c, 'THAEO', x, y, paint);
    rect(c, x + 2, y + 6, 17, 1, paint);
    return;
  }
  const stroke = (color: string, width: number, dx = 0, dy = 0) => {
    for (const points of STROKES) for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      seg(c, x + (a[0] + 2) * scale + dx, y + (a[1] + 2) * scale + dy,
        x + (b[0] + 2) * scale + dx, y + (b[1] + 2) * scale + dy, width, color);
    }
  };
  c.save();
  c.globalAlpha *= 0.86;
  stroke('#30353e', Math.max(2, Math.round(3 * scale)), 1, 1);
  stroke(paint, Math.max(1, Math.round(1.7 * scale)));
  // A few drips and stray spray dots, fixed to the surface rather than animated.
  for (const [px, py, h] of [[5, 12, 5], [24, 11, 4], [39, 12, 4]]) {
    rect(c, x + px * scale, y + py * scale, 1, Math.max(1, h * scale), paint);
  }
  c.globalAlpha *= 0.5;
  for (const [px, py] of [[0, 8], [8, 15], [17, 2], [33, 15], [44, 3]]) rect(c, x + px * scale, y + py * scale, 1, 1, paint);
  c.restore();
}
