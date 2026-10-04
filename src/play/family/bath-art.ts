import { INK, TAU, box, line, oval, path, rgba, rgrad, stroke, type C, type Pt } from './art';
import type { BathRun } from './bath-run';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { BASIN, CLOSE_FACE, CUP, FACE, HANDS, MIRROR, PUMP, STOOL, TAP, TOWEL, TUBE, TUNING } from './games/badrum';
import { paintMirrorFace } from './mirror-face';

// The bathroom for Tänder och tvål, after the family's photo, as Carl-Otto sees it standing at the sink: white tiles with
// a grey patterned border, the mirror cabinet with Carl-Otto in it and its shelf of bottles, the toilet-roll shelf with
// its little clock, the white sink and cabinet, the soap pump and the toothbrush cup, the red-striped towel, the stacked
// washing machines and the shower on the left, the toilet on the right, and the step stool he stands on.

const W = 960;
const smooth01 = (k: number) => { const u = Math.max(0, Math.min(1, k)); return u * u * (3 - 2 * u); };
const SKIN = CARL_OTTO_HOME.skin;

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
function disc(c: C, fill: string | CanvasGradient, x: number, y: number, rx: number, ry = rx, ink = 1.6): void { oval(c, INK, x, y, rx + ink, ry + ink); oval(c, fill, x, y, rx, ry); }

function tiles(c: C, x: number, y: number, w: number, h: number, size: number, fill: string, grout: string): void {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  for (let gx = x; gx <= x + w; gx += size) line(c, grout, 1, [[gx, y], [gx, y + h]]);
  for (let gy = y; gy <= y + h; gy += size) line(c, grout, 1, [[x, gy], [x + w, gy]]);
}

function paintRoom(c: C): void {
  tiles(c, 0, 0, W, 540, 44, '#eceae4', '#d6d4cc');
  // The grey patterned border round the room.
  box(c, '#c9c6bc', 0, 336, W, 18);
  for (let bx = 8; bx < W; bx += 22) { c.beginPath(); c.ellipse(bx, 345, 7, 5, 0, 0, TAU); stroke(c, '#9a978e', 1.4); }
  // The washing machines on the left and the shower beside them.
  slab(c, '#fbfaf6', -10, 120, 120, 200, 4); disc(c, '#d9dde0', 46, 222, 40, 40); oval(c, '#b8c4cc', 46, 222, 28, 28); oval(c, 'rgba(255, 255, 255, 0.5)', 36, 210, 10, 7);
  slab(c, '#fbfaf6', -10, 324, 120, 216, 4); disc(c, '#d9dde0', 46, 440, 40, 40); oval(c, '#6b7076', 46, 440, 28, 28);
  box(c, '#dfe8ec', 110, 40, 70, 500); for (let gx = 118; gx < 180; gx += 16) line(c, 'rgba(255, 255, 255, 0.6)', 2, [[gx, 40], [gx + 6, 540]]);
  line(c, '#9a9c96', 3, [[110, 40], [110, 540]]);
  // The toilet on the right, and the teal towel on its hook.
  slab(c, '#fbfaf6', 880, 300, 90, 120, 10); slab(c, '#fbfaf6', 860, 420, 110, 60, 20); oval(c, '#e2e0d8', 912, 444, 36, 12);
  oval(c, '#d4a858', 836, 286, 6, 6);
  path(c, [[818, 290], [854, 290], [860, 410], [812, 410]], true); c.fillStyle = '#5aa8a0'; c.fill(); stroke(c, INK, 1.4);
}

function paintCabinet(c: C, run: BathRun, t: number): void {
  const { x, y, w, h } = MIRROR;
  // The shelf on top with its bottles and the round shaving mirror; the toilet-roll shelf on the right.
  slab(c, '#fbfaf6', x - 24, y - 26, w + 120, 12, 3);
  for (const [bx, bw, bh, col] of [[x + 220, 22, 40, '#fbfaf6'], [x + 250, 18, 34, '#fbfaf6'], [x + 290, 30, 22, '#3d6ab0']] as const) slab(c, col, bx, y - 26 - bh, bw, bh, 3, 1.2);
  line(c, '#9a9c96', 3, [[x + 150, y - 26], [x + 150, y - 50]]); disc(c, '#cfdbe0', x + 150, y - 66, 20, 20, 1.6);
  slab(c, '#fbfaf6', x + w + 10, y - 14, 90, h + 12, 3);
  for (const [ry, label] of [[y + 40, 'roll'], [y + 120, 'clock'], [y + 200, 'roll']] as const) {
    slab(c, '#e8e6de', x + w + 14, ry + 30, 82, 4, 1, 1);
    if (label === 'roll') for (const rx of [x + w + 34, x + w + 70]) { slab(c, '#ffffff', rx - 14, ry - 10, 28, 40, 6, 1.2); oval(c, '#d9d7cf', rx, ry - 10, 6, 3); }
    else { disc(c, '#ffffff', x + w + 54, ry + 4, 18, 18, 1.4); line(c, INK, 2, [[x + w + 54, ry + 4], [x + w + 54, ry - 8]]); line(c, INK, 2, [[x + w + 54, ry + 4], [x + w + 62, ry + 6]]); }
  }
  // The mirror: the bathroom behind him, a little bluer, and Carl-Otto, rising into it as he steps up.
  slab(c, '#fbfaf6', x - 8, y - 8, w + 16, h + 16, 3);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  tiles(c, x, y, w, h, 40, '#e2e8ea', '#cfd8dc');
  box(c, 'rgba(180, 200, 210, 0.35)', x + w - 90, y, 90, h);
  const rise = run.up < 0 ? 0 : smooth01(run.up / TUNING.rise);
  const brushing = run.phase === 'brush', face = run.done >= 0
    ? { mouth: 'grin' as const, eyes: 'open' as const, sparkle: true }
    : brushing ? { mouth: 'brush' as const, eyes: 'wide' as const, foam: run.foam } : run.phase === 'spit' ? { mouth: 'o' as const, foam: run.foam } : { mouth: 'smile' as const };
  const close = brushing || run.phase === 'spit', fc = close ? CLOSE_FACE : FACE;
  paintMirrorFace(c, fc.x, fc.y + (1 - rise) * 190, fc.k, CARL_OTTO_HOME, face, t);
  // The sugar bugs on his teeth, and the ones hopping off into the sink.
  if (brushing || run.phase === 'spit') for (const b of run.bugs) {
    if (b.gone < 0) bug(c, b.at[0], b.at[1] + Math.sin(t * 6 + b.at[0]) * 2, b.colour, 1.7 * (0.6 + 0.4 * Math.max(0, b.hp)), t);
  }
  // A reflection streak across the glass.
  path(c, [[x + 30, y], [x + 70, y], [x + 10, y + h], [x - 30, y + h]], true); c.fillStyle = 'rgba(255, 255, 255, 0.18)'; c.fill();
  c.restore();
  for (const b of run.bugs) if (b.gone >= 0 && b.gone < TUNING.flee) {
    const u = b.gone / TUNING.flee, bx = b.at[0] + (BASIN.x + (b.at[0] - FACE.x) * 0.6 - b.at[0]) * u, by = b.at[1] - Math.sin(u * Math.PI) * 60 + (BASIN.y - b.at[1]) * u * u;
    bug(c, bx, by, b.colour, 1.7 * (1 - u * 0.4), t, true);
  }
  // The toothbrush, where a finger holds it.
  if (run.brush) toothbrush(c, run.brush[0], run.brush[1], t, true);
  else if (brushing) toothbrush(c, x + w - 60, y + h - 40, t, false);
}

/** A sugar bug: a round, fuzzy little blob with big eyes and a grin. Waving goodbye when it hops off. */
function bug(c: C, x: number, y: number, colour: string, k: number, t: number, waving = false): void {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = i % 2 ? 9 : 11; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
  c.fillStyle = colour; c.fill(); stroke(c, INK, 1.4);
  for (const ex of [-4, 4]) { oval(c, '#ffffff', ex, -2, 3.2, 3.6); oval(c, INK, ex + 0.6, -1.6, 1.6, 1.8); }
  c.beginPath(); c.arc(0, 2, 4, 0.2, Math.PI - 0.2); stroke(c, INK, 1.4);
  if (waving) { const a = Math.sin(t * 14) * 0.5; line(c, INK, 2, [[9, -2], [9 + Math.cos(-1 + a) * 10, -2 + Math.sin(-1 + a) * 10]]); }
  c.restore();
}

function toothbrush(c: C, x: number, y: number, t: number, held: boolean, paste = true): void {
  c.save(); c.translate(x, y); c.rotate(held ? -0.25 + Math.sin(t * 20) * 0.06 : -1.2);
  slab(c, '#3d8fc0', 10, -5, 110, 10, 5, 1.4);
  slab(c, '#fbfaf6', -18, -9, 30, 10, 2, 1.2);
  for (let i = -16; i < 10; i += 4) line(c, '#ffffff', 1.6, [[i, -9], [i, -16]]);
  if (paste) { c.beginPath(); c.moveTo(-18, -16); c.bezierCurveTo(-12, -24, 0, -20, 6, -24); c.lineTo(8, -16); c.closePath(); c.fillStyle = '#ffffff'; c.fill(); stroke(c, '#6fbde8', 1.4); }
  c.restore();
}

function paintSink(c: C, run: BathRun, t: number): void {
  // The cabinet and its two drawers, the basin, the tap and its water.
  slab(c, '#fbfaf6', 220, 392, 520, 160, 6);
  for (const dy of [430, 490]) { line(c, '#d9d7cf', 2, [[232, dy], [728, dy]]); slab(c, '#d9d7cf', 450, dy - 16, 60, 4, 2, 1); }
  disc(c, '#ffffff', BASIN.x, BASIN.y - 18, BASIN.rx + 40, BASIN.ry + 12, 1.6);
  oval(c, rgrad(c, BASIN.x, BASIN.y - 10, BASIN.rx, [[0, '#e8ecef'], [1, '#c9d2d6']]), BASIN.x, BASIN.y - 14, BASIN.rx, BASIN.ry);
  oval(c, '#9aa0a6', BASIN.x, BASIN.y - 10, 7, 3);
  slab(c, '#c9ced0', TAP[0] - 8, TAP[1] - 10, 16, 30, 3, 1.4); slab(c, '#c9ced0', TAP[0] - 6, TAP[1] - 14, 40, 8, 3, 1.4); slab(c, '#c9ced0', TAP[0] - 16, TAP[1] - 22, 32, 8, 3, 1.2);
  if (run.water >= 0) { const w = 6 + Math.sin(t * 30) * 1; box(c, 'rgba(160, 210, 235, 0.85)', TAP[0] + 26 - w / 2, TAP[1] - 6, w, BASIN.y - TAP[1]); for (let i = 0; i < 6; i++) oval(c, 'rgba(200, 230, 245, 0.8)', TAP[0] + 26 + Math.sin(t * 9 + i) * 20, BASIN.y - 14 + Math.cos(t * 7 + i) * 4, 5, 2); }
  // The soap pump, the toothbrush cup (the brush in it until it is used), the toothpaste tube.
  slab(c, '#b08a6a', PUMP[0] - 16, PUMP[1] - 30, 32, 42, 8, 1.4); slab(c, '#c9ced0', PUMP[0] - 4, PUMP[1] - 44, 8, 14, 2, 1.2); slab(c, '#c9ced0', PUMP[0] - 4, PUMP[1] - 46, 24, 5, 2, 1);
  path(c, [[CUP[0] - 18, CUP[1] - 34], [CUP[0] + 18, CUP[1] - 34], [CUP[0] + 14, CUP[1] + 10], [CUP[0] - 14, CUP[1] + 10]], true); c.fillStyle = '#9fd0c8'; c.fill(); stroke(c, INK, 1.4);
  // The brush stands in its cup, except while he brushes (then it is in his hand on the mirror).
  if (run.phase !== 'brush') toothbrush(c, CUP[0] + 6, CUP[1] - 46, t, false, false);
  c.save(); c.translate(TUBE[0], TUBE[1]); c.rotate(-0.2);
  path(c, [[-34, -10], [24, -12], [24, 12], [-34, 10]], true); c.fillStyle = '#ffffff'; c.fill(); stroke(c, INK, 1.4);
  box(c, '#3d8fc0', -26, -6, 34, 12); slab(c, '#e2432f', 24, -6, 10, 12, 2, 1.2);
  c.restore();
}

function paintTowel(c: C, dry: boolean, t: number): void {
  const { x, y, w, h } = TOWEL, sway = dry ? Math.sin(t * 8) * 4 : 0;
  oval(c, '#d4a858', x + w / 2, y - 6, 6, 6);
  c.save(); c.translate(sway, 0);
  path(c, [[x, y], [x + w, y], [x + w + 4, y + h], [x - 4, y + h]], true); c.fillStyle = '#f3e6e8'; c.fill();
  c.save(); path(c, [[x, y], [x + w, y], [x + w + 4, y + h], [x - 4, y + h]], true); c.clip();
  for (let sx = x - 4; sx < x + w + 4; sx += 12) box(c, '#9a2f4a', sx, y, 6, h);
  c.restore();
  path(c, [[x, y], [x + w, y], [x + w + 4, y + h], [x - 4, y + h]], true); stroke(c, INK, 1.4);
  c.restore();
}

/** His arms reaching in from the bottom corners, his hands over the basin: still, or rubbing, covered in lather. */
function paintHands(c: C, run: BathRun, t: number): void {
  if (run.phase === 'stool' || run.phase === 'paste' || run.phase === 'brush' || run.phase === 'spit' || run.phase === 'done') return;
  const rubbing = run.phase === 'rub', wig = rubbing ? Math.sin(t * 14) * 10 : 0, cx = HANDS.x + HANDS.w / 2, cy = HANDS.y + 40;
  for (const s of [-1, 1]) {
    const hx = cx + s * 30 + wig * s * 0.4, hy = cy + (rubbing ? Math.cos(t * 14) * 4 * s : 0), sx = cx + s * 250, sy = 600;
    const a = Math.atan2(hy - sy, hx - sx);
    // The arm in its sleeve, then the hand: a mitten with a thumb, fingers pointing up and in.
    c.save(); c.translate(sx, sy); c.rotate(a);
    const len = Math.hypot(hx - sx, hy - sy);
    c.beginPath(); c.roundRect(0, -26, len - 40, 52, 22); c.fillStyle = CARL_OTTO_HOME.top; c.fill(); stroke(c, INK, 1.8);
    box(c, 'rgba(255, 255, 255, 0.25)', 10, -20, len - 60, 8, 4);
    c.beginPath(); c.roundRect(len - 70, -20, 34, 40, 10); c.fillStyle = SKIN; c.fill(); stroke(c, INK, 1.6);
    c.restore();
    c.save(); c.translate(hx, hy); c.rotate(a + Math.PI / 2 + s * 0.15); c.scale(s, 1);
    c.beginPath(); c.moveTo(-18, 30); c.lineTo(-20, -4); c.quadraticCurveTo(-20, -34, 0, -36); c.quadraticCurveTo(20, -34, 20, -4); c.lineTo(18, 30); c.closePath();
    c.fillStyle = SKIN; c.fill(); stroke(c, INK, 1.6);
    c.beginPath(); c.moveTo(18, 6); c.quadraticCurveTo(34, -2, 32, -16); c.quadraticCurveTo(26, -20, 18, -8); stroke(c, INK, 1.6);
    for (const fx of [-10, -3, 4, 11]) line(c, 'rgba(160, 100, 70, 0.45)', 1.2, [[fx, -30], [fx, -18]]);
    c.restore();
  }
  // Lather.
  for (let i = 0; i < Math.round(run.lather * 16); i++) { const a = i * 2.4, r = 16 + (i % 4) * 8; oval(c, 'rgba(255, 255, 255, 0.95)', cx + Math.cos(a) * r * 1.4, cy - 10 + Math.sin(a) * r * 0.6, 8 + (i % 3) * 3, 6 + (i % 2) * 2); }
}

function paintBubbles(c: C, run: BathRun): void {
  for (const b of run.bubbles) {
    oval(c, 'rgba(255, 255, 255, 0.25)', b.x, b.y, b.r, b.r);
    c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); stroke(c, rgba('#9fd0e8', 0.9), 1.6);
    oval(c, 'rgba(255, 255, 255, 0.9)', b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, b.r * 0.16);
  }
}

function paintStool(c: C, run: BathRun): void {
  if (run.phase !== 'stool') return;
  const [x, y] = STOOL;
  path(c, [[x - 70, y - 20], [x + 70, y - 20], [x + 82, y + 40], [x - 82, y + 40]], true); c.fillStyle = '#fbfaf6'; c.fill(); stroke(c, INK, 1.6);
  disc(c, '#9aa0a6', x, y - 20, 70, 14, 1.4);
  for (let i = -60; i <= 60; i += 10) line(c, 'rgba(255, 255, 255, 0.35)', 1, [[x + i, y - 30], [x + i, y - 10]]);
}

function arrow(c: C, x: number, y: number, t: number): void {
  const top = y + Math.sin(t * 6) * 8;
  path(c, [[x - 14, top], [x + 14, top], [x + 14, top + 18], [x + 26, top + 18], [x, top + 44], [x - 26, top + 18], [x - 14, top + 18]], true);
  c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
}

/** Where the arrow goes for each step's hint. */
export function hintPoint(run: BathRun): Pt | null {
  switch (run.hint) {
    case 'stool': return [STOOL[0], STOOL[1] - 110];
    case 'soap': return [PUMP[0], PUMP[1] - 110];
    case 'rub': return [HANDS.x + HANDS.w / 2, HANDS.y - 70];
    case 'rinse': return [TAP[0], TAP[1] - 100];
    case 'dry': return [TOWEL.x + TOWEL.w / 2, TOWEL.y - 80];
    case 'paste': return [TUBE[0], TUBE[1] - 90];
    case 'brush': { const b = run.left[0]; return b ? [b.at[0], b.at[1] - 70] : null; }
    case 'spit': return [CUP[0], CUP[1] - 100];
    default: return null;
  }
}

/** One frame of the bathroom, in world units. */
export function drawBath(c: C, run: BathRun, t: number): void {
  paintRoom(c); paintCabinet(c, run, t); paintTowel(c, run.phase === 'paste' && run.idle < 0.6, t); paintSink(c, run, t); paintHands(c, run, t); paintStool(c, run); paintBubbles(c, run);
  const h = hintPoint(run);
  if (h) arrow(c, h[0], h[1], t);
  if (run.done >= 0 && run.done < 1.5) { c.fillStyle = `rgba(255, 255, 255, ${0.3 * (1 - run.done / 1.5)})`; c.fillRect(0, 0, W, 540); }
}
