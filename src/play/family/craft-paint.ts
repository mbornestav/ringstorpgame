import { INK, TAU, box, line, mix, oval, path, rgba, seeded, stroke, type C, type Pt } from './art';
import type { Fill, Picture, Stroke, Stuck } from './craft-run';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { MAMMA, PAPPA } from './games/godmorgon';
import { FRIENDS, type KidLook } from './games/kurragomma';
import { CRAYONS, PAPER, STICKER_SIZES, guidePoints, type Pattern, type Shape, type StampId, type StickerId } from './games/pyssel';
import { paintToy } from './goodnight-art';
import { paintHead } from './kids';

// Pysselhörnan's picture, drawn from Carl-Otto's lines, fills and stickers: the paper (plain, coloured, black, or scratch
// paper with a rainbow under its black), the colouring page with its patterned fills, the tracing guides, every brush (with
// its mirror copies), and the stickers. `t` (seconds), when given, makes the picture alive: stickers bob, glitter
// twinkles, the rainbow shimmers, stamps hop and neon pulses. Paper units throughout.

// ---------------------------------------------------------------- shapes

export function shapePath(c: C, s: Shape): void {
  c.beginPath();
  if ('e' in s) c.ellipse(s.e[0], s.e[1], s.e[2], s.e[3], 0, 0, TAU);
  else if ('r' in s) c.rect(...s.r);
  else path(c, s.p, true);
}
export function starPath(c: C, x: number, y: number, r: number, inner = 0.48): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * inner : r; pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]); }
  path(c, pts, true);
}
export function heartPath(c: C, r: number): void {
  c.beginPath(); c.moveTo(0, r * 0.85);
  c.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.6, -r * 1.05, 0, -r * 0.42);
  c.bezierCurveTo(r * 0.6, -r * 1.05, r * 1.3, -r * 0.1, 0, r * 0.85); c.closePath();
}
const lum = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); return ((n >> 16 & 255) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11) / 255; };

// ---------------------------------------------------------------- stickers

const FAMILY: Record<string, { look: KidLook | null; bg: string }> = {
  carl: { look: CARL_OTTO_HOME, bg: '#fff3c4' }, mamma: { look: MAMMA, bg: '#fbe0ea' }, pappa: { look: PAPPA, bg: '#e2f3d6' }, nallen: { look: null, bg: '#dbeefa' },
  ...Object.fromEntries(FRIENDS.map((f, i) => [f.id, { look: f.look, bg: ['#dbeefa', '#fff3c4', '#e2f3d6', '#fbe0ea', '#f6e2c4'][i % 5] }])),
};

/** A sticker centred on (x, y), radius `r`: a white die-cut border, the picture, an ink line. */
export function paintSticker(c: C, id: StickerId, x: number, y: number, r: number = STICKER_SIZES[1], turn = 0): void {
  c.save(); c.translate(x, y); c.rotate(turn);
  const w = Math.max(1, r * 0.06);
  const border = (shape: () => void) => { shape(); stroke(c, '#ffffff', r * 0.28); };
  const done = (shape: () => void, fill: string) => { shape(); c.fillStyle = fill; c.fill(); stroke(c, INK, w); };
  const fam = FAMILY[id];
  if (fam) {
    // A round photo of a face.
    const circle = () => { c.beginPath(); c.arc(0, 0, r, 0, TAU); };
    border(circle); done(circle, fam.bg);
    c.save(); circle(); c.clip();
    if (fam.look) {
      c.beginPath(); c.ellipse(0, r * 1.05, r * 0.85, r * 0.5, 0, 0, TAU); c.fillStyle = fam.look.top; c.fill(); stroke(c, INK, w);
      c.save(); c.scale(r / 24, r / 24); paintHead(c, -2, -1, fam.look, { mouth: 'grin' }); c.restore();
    } else {
      // Nallen.
      const k = r / 24;
      for (const ex of [-13, 13]) { oval(c, INK, ex * k, -14 * k, 7.6 * k, 7.6 * k); oval(c, '#b07a4a', ex * k, -14 * k, 6.4 * k, 6.4 * k); }
      oval(c, INK, 0, 0, 17.6 * k, 16.6 * k); oval(c, '#b07a4a', 0, 0, 16 * k, 15 * k);
      oval(c, '#e2b98a', 0, 5 * k, 7 * k, 5.5 * k); oval(c, INK, 0, 3 * k, 2.6 * k, 2 * k);
      oval(c, INK, -6 * k, -4 * k, 1.8 * k, 2.2 * k); oval(c, INK, 6 * k, -4 * k, 1.8 * k, 2.2 * k);
    }
    c.restore();
    circle(); stroke(c, INK, w);
  } else if (id === 'star') { const s = () => starPath(c, 0, 0, r); border(s); done(s, '#f2c230'); oval(c, 'rgba(255, 255, 255, 0.5)', r * 0.15, -r * 0.2, r * 0.18, r * 0.12); }
  else if (id === 'heart') { const s = () => heartPath(c, r); border(s); done(s, '#e2432f'); oval(c, 'rgba(255, 255, 255, 0.45)', r * 0.35, -r * 0.35, r * 0.18, r * 0.12); }
  else if (id === 'apple') {
    const s = () => { c.beginPath(); c.ellipse(-r * 0.32, r * 0.05, r * 0.55, r * 0.72, 0, 0, TAU); c.ellipse(r * 0.32, r * 0.05, r * 0.55, r * 0.72, 0, 0, TAU); };
    border(s); s(); c.fillStyle = '#e2432f'; c.fill();
    line(c, '#8f5a36', r * 0.12, [[0, -r * 0.5], [r * 0.1, -r * 0.95]]);
    oval(c, '#62b046', r * 0.35, -r * 0.82, r * 0.3, r * 0.14, -0.4);
    oval(c, 'rgba(255, 255, 255, 0.45)', r * 0.35, -r * 0.15, r * 0.14, r * 0.22);
  } else if (id === 'flower') {
    const s = () => { c.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; c.moveTo(Math.cos(a) * r * 0.55 + r * 0.42, Math.sin(a) * r * 0.55); c.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, r * 0.42, 0, 0, TAU); } };
    border(s); s(); c.fillStyle = '#f07fb0'; c.fill();
    oval(c, INK, 0, 0, r * 0.36, r * 0.36); oval(c, '#f2c230', 0, 0, r * 0.3, r * 0.3);
  } else if (id === 'sun') {
    const rays: Pt[] = [];
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24, k = i % 2 ? r * 0.62 : r; rays.push([Math.cos(a) * k, Math.sin(a) * k]); }
    const s = () => path(c, rays, true);
    border(s); done(s, '#f08a2c');
    oval(c, INK, 0, 0, r * 0.58, r * 0.58); oval(c, '#f2c230', 0, 0, r * 0.53, r * 0.53);
    oval(c, INK, -r * 0.18, -r * 0.08, r * 0.06, r * 0.08); oval(c, INK, r * 0.18, -r * 0.08, r * 0.06, r * 0.08);
    c.beginPath(); c.arc(0, r * 0.05, r * 0.24, 0.3, Math.PI - 0.3); stroke(c, INK, r * 0.06);
  } else if (id === 'fox') {
    const head: Pt[] = [[-r, -r * 0.9], [-r * 0.45, -r * 0.45], [r * 0.45, -r * 0.45], [r, -r * 0.9], [r * 0.9, -r * 0.05], [0, r * 0.95], [-r * 0.9, -r * 0.05]];
    const s = () => path(c, head, true);
    border(s); done(s, '#f08a2c');
    path(c, [[-r * 0.85, -r * 0.05], [0, r * 0.95], [-r * 0.05, r * 0.15]], true); c.fillStyle = '#ffffff'; c.fill();
    path(c, [[r * 0.85, -r * 0.05], [0, r * 0.95], [r * 0.05, r * 0.15]], true); c.fillStyle = '#ffffff'; c.fill();
    s(); stroke(c, INK, w);
    oval(c, INK, 0, r * 0.78, r * 0.13, r * 0.1);
    oval(c, INK, -r * 0.32, -r * 0.08, r * 0.08, r * 0.11); oval(c, INK, r * 0.32, -r * 0.08, r * 0.08, r * 0.11);
  } else if (id === 'moon') {
    const s = () => { c.beginPath(); c.arc(0, 0, r, Math.PI * 0.3, Math.PI * 1.7); c.arc(r * 0.45, -r * 0.1, r * 0.78, Math.PI * 1.55, Math.PI * 0.45, true); c.closePath(); };
    border(s); done(s, '#f8de80'); oval(c, INK, -r * 0.4, -r * 0.1, r * 0.07, r * 0.09); c.beginPath(); c.arc(-r * 0.35, r * 0.2, r * 0.18, 0.4, Math.PI - 0.6); stroke(c, INK, w);
  } else if (id === 'butterfly') {
    const s = () => { c.beginPath(); for (const sx of [-1, 1]) { c.moveTo(0, 0); c.ellipse(sx * r * 0.5, -r * 0.35, r * 0.5, r * 0.42, sx * 0.4, 0, TAU); c.moveTo(0, 0); c.ellipse(sx * r * 0.42, r * 0.4, r * 0.38, r * 0.3, -sx * 0.4, 0, TAU); } };
    border(s); s(); c.fillStyle = '#8a56b8'; c.fill(); stroke(c, INK, w);
    for (const sx of [-1, 1]) oval(c, '#f2c230', sx * r * 0.5, -r * 0.38, r * 0.16, r * 0.14);
    oval(c, INK, 0, 0, r * 0.1, r * 0.55); line(c, INK, w * 1.4, [[0, -r * 0.5], [-r * 0.2, -r * 0.85]]); line(c, INK, w * 1.4, [[0, -r * 0.5], [r * 0.2, -r * 0.85]]);
  } else if (id === 'engine' || id === 'dino' || id === 'ball') {
    const k = r / 24, circle = () => { c.beginPath(); c.arc(0, 0, r, 0, TAU); };
    border(circle); done(circle, id === 'ball' ? '#dbeefa' : '#fff3c4');
    paintToy(c, id, 0, (id === 'ball' ? 16 : 10) * k, k * (id === 'ball' ? 1 : 0.8));
  } else if (id === 'bike') {
    const circle = () => { c.beginPath(); c.arc(0, 0, r, 0, TAU); };
    border(circle); done(circle, '#dbeefa');
    const k = r / 24;
    for (const wx of [-11, 11]) { c.beginPath(); c.arc(wx * k, 6 * k, 8 * k, 0, TAU); stroke(c, INK, 2.4 * k); }
    line(c, '#f2c230', 3 * k, [[-11 * k, 6 * k], [-2 * k, -6 * k], [11 * k, 6 * k], [2 * k, 6 * k], [-2 * k, -6 * k]]);
    line(c, INK, 2 * k, [[6 * k, -10 * k], [10 * k, -10 * k]]); line(c, INK, 2.4 * k, [[-6 * k, -9 * k], [-1 * k, -9 * k]]);
  } else if (id === 'pancakes') {
    const circle = () => { c.beginPath(); c.arc(0, 0, r, 0, TAU); };
    border(circle); done(circle, '#fbe0ea');
    const k = r / 24;
    oval(c, INK, 0, 12 * k, 19 * k, 5 * k); oval(c, '#ffffff', 0, 12 * k, 18 * k, 4.2 * k);
    for (let i = 0; i < 4; i++) { oval(c, INK, 0, (8 - i * 5) * k, 15 * k, 4.2 * k); oval(c, i % 2 ? '#e0a64c' : '#eab45c', 0, (8 - i * 5) * k, 14 * k, 3.6 * k); }
    oval(c, '#ffffff', 0, -13 * k, 7 * k, 3.6 * k); oval(c, '#c8243a', 2 * k, -16 * k, 3 * k, 2.6 * k);
  } else if (id === 'house') {
    const k = r / 24, s = () => path(c, [[-18 * k, 20 * k], [-18 * k, -2 * k], [0, -20 * k], [18 * k, -2 * k], [18 * k, 20 * k]], true);
    border(s); done(s, '#e2432f');
    path(c, [[-22 * k, 0], [0, -22 * k], [22 * k, 0]], true); c.fillStyle = '#3d3a38'; c.fill(); stroke(c, INK, w);
    box(c, '#ffffff', -12 * k, 2 * k, 9 * k, 8 * k); box(c, '#fff3c4', 3 * k, 6 * k, 8 * k, 14 * k);
  } else if (id === 'rainbow') {
    const k = r / 24, s = () => { c.beginPath(); c.arc(0, 8 * k, 22 * k, Math.PI, 0); c.lineTo(10 * k, 8 * k); c.arc(0, 8 * k, 10 * k, 0, Math.PI, true); c.closePath(); };
    border(s);
    ['#e2432f', '#f08a2c', '#f2c230', '#62b046', '#3157b8'].forEach((col, i) => { c.beginPath(); c.arc(0, 8 * k, (20 - i * 2.4) * k, Math.PI, 0); stroke(c, col, 2.6 * k); });
    s(); stroke(c, INK, w);
    for (const sx of [-1, 1]) oval(c, '#ffffff', sx * 16 * k, 10 * k, 8 * k, 5 * k);
  } else {
    const k = r / 24, s = () => { c.beginPath(); c.ellipse(0, -4 * k, 15 * k, 18 * k, 0, 0, TAU); };
    border(s); done(s, '#e2432f');
    path(c, [[-3 * k, 14 * k], [3 * k, 14 * k], [0, 10 * k]], true); c.fillStyle = '#c8243a'; c.fill();
    c.beginPath(); c.moveTo(0, 14 * k); c.quadraticCurveTo(6 * k, 22 * k, 0, 28 * k); stroke(c, INK, w);
    oval(c, 'rgba(255, 255, 255, 0.55)', -6 * k, -10 * k, 3 * k, 5 * k);
  }
  c.restore();
}

// ---------------------------------------------------------------- stamps

export function paintStamp(c: C, id: StampId, x: number, y: number, r: number, angle: number, colour: string, flip = 1): void {
  c.save(); c.translate(x, y); c.rotate(angle); c.fillStyle = colour;
  if (id === 'heart') { heartPath(c, r); c.fill(); }
  else if (id === 'star') { starPath(c, 0, 0, r); c.fill(); }
  else if (id === 'flower') { for (let i = 0; i < 5; i++) { const a = i * TAU / 5; oval(c, colour, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.42, r * 0.42); } oval(c, '#f2c230', 0, 0, r * 0.32, r * 0.32); }
  else if (id === 'paw') { oval(c, colour, 0, r * 0.25, r * 0.5, r * 0.42); for (let i = 0; i < 4; i++) { const a = -Math.PI * 0.85 + i * Math.PI * 0.23; oval(c, colour, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75 + r * 0.1, r * 0.2, r * 0.24); } }
  else if (id === 'feet') { c.scale(flip, 1); oval(c, colour, 0, r * 0.15, r * 0.32, r * 0.55, 0.1); for (let i = 0; i < 4; i++) oval(c, colour, -r * 0.2 + i * r * 0.15, -r * 0.62 + Math.abs(i - 1) * r * 0.06, r * 0.09, r * 0.1); }
  else { c.beginPath(); c.ellipse(0, 0, r * 0.7, r * 0.4, 0, 0, TAU); c.moveTo(r * 0.55, 0); c.lineTo(r, -r * 0.4); c.lineTo(r, r * 0.4); c.closePath(); c.fill(); oval(c, '#ffffff', -r * 0.35, -r * 0.08, r * 0.12, r * 0.12); }
  c.restore();
}

// ---------------------------------------------------------------- the brushes

/** The mirror copies of a line drawn with symmetry `n`, about the middle of the sheet: [a, b, c, d] linear maps. */
function mirrors(n: number): Array<[number, number, number, number]> {
  if (n === 2) return [[1, 0, 0, 1], [-1, 0, 0, 1]];
  if (n === 4) return [[1, 0, 0, 1], [-1, 0, 0, 1], [1, 0, 0, -1], [-1, 0, 0, -1]];
  if (n === 8) return [[1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1], [0, -1, 1, 0], [-1, 0, 0, 1], [0, -1, -1, 0], [1, 0, 0, -1], [0, 1, 1, 0]];
  return [[1, 0, 0, 1]];
}

function linePath(c: C, pts: Pt[]): void {
  const [first] = pts;
  c.beginPath(); c.moveTo(first[0], first[1]);
  for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], [nx, ny] = pts[i + 1]; c.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2); }
  const last = pts[pts.length - 1]; c.lineTo(last[0], last[1]);
}
function strokeLine(c: C, pts: Pt[], colour: string, width: number): void {
  if (pts.length === 1) { oval(c, colour, pts[0][0], pts[0][1], width / 2, width / 2); return; }
  linePath(c, pts); c.strokeStyle = colour; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
/** Evenly spaced spots along a line, with the direction there: for stamps and glitter. */
function along(pts: Pt[], every: number): Array<{ at: Pt; angle: number; i: number }> {
  const out: Array<{ at: Pt; angle: number; i: number }> = [{ at: pts[0], angle: 0, i: 0 }];
  let carry = 0;
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1], [bx, by] = pts[k], seg = Math.hypot(bx - ax, by - ay), angle = Math.atan2(by - ay, bx - ax);
    let d = every - carry;
    while (d <= seg) { out.push({ at: [ax + (bx - ax) * d / seg, ay + (by - ay) * d / seg], angle, i: out.length }); d += every; }
    carry = seg - (d - every);
  }
  if (out.length > 1) out[0].angle = out[1].angle;
  return out;
}

/** One line, as its brush draws it. `scratching`: on scratch paper, every brush just cuts through the black. */
function paintStroke(c: C, s: Stroke, t: number | null, scratching: boolean): void {
  const pts = s.points, w = s.size;
  if (scratching || s.brush === 'crayon' || s.brush === 'eraser') { strokeLine(c, pts, s.colour, s.brush === 'stamp' && scratching ? w * 1.4 : w); return; }
  if (s.brush === 'rainbow') {
    let len = 0;
    const shift = t !== null ? t * 160 : 0;
    if (pts.length === 1) { oval(c, `hsl(${(s.seed + shift) % 360}, 85%, 55%)`, pts[0][0], pts[0][1], w / 2, w / 2); return; }
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      len += Math.hypot(bx - ax, by - ay);
      c.strokeStyle = `hsl(${(len * 1.6 + s.seed + shift) % 360}, 85%, 55%)`; c.lineWidth = w; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    }
    return;
  }
  if (s.brush === 'neon') {
    const pulse = t !== null ? 0.8 + 0.2 * Math.sin(t * 5 + s.seed) : 1;
    strokeLine(c, pts, rgba(s.colour, 0.22 * pulse), w * 3.2);
    strokeLine(c, pts, rgba(s.colour, 0.5 * pulse), w * 1.8);
    strokeLine(c, pts, mix(s.colour, '#ffffff', 0.55), Math.max(2, w * 0.6));
    return;
  }
  if (s.brush === 'glitter') {
    strokeLine(c, pts, s.colour, Math.max(2, w * 0.6));
    const rand = seeded(s.seed);
    for (const spot of along(pts, 12)) {
      const tw = t !== null ? 0.5 + 0.5 * Math.abs(Math.sin(t * 6 + spot.i)) : 1, r = (3 + rand() * 4) * tw + w * 0.12;
      const dx = (rand() - 0.5) * w * 1.6, dy = (rand() - 0.5) * w * 1.6, col = rand() < 0.5 ? '#ffffff' : mix(s.colour, '#ffffff', 0.5);
      c.save(); c.translate(spot.at[0] + dx, spot.at[1] + dy); c.rotate(rand());
      path(c, [[-r, 0], [-r * 0.2, -r * 0.2], [0, -r], [r * 0.2, -r * 0.2], [r, 0], [r * 0.2, r * 0.2], [0, r], [-r * 0.2, r * 0.2]], true); c.fillStyle = col; c.fill();
      c.restore();
    }
    return;
  }
  // Stamps along the line.
  const r = w * 0.9 + 7, rand = seeded(s.seed);
  for (const spot of along(pts, r * 2.2)) {
    const hop = t !== null ? Math.abs(Math.sin(t * 6 + spot.i * 0.7)) * -6 : 0, jitter = (rand() - 0.5) * 0.5;
    const flip = spot.i % 2 ? 1 : -1, side = s.stamp === 'feet' ? flip * r * 0.45 : 0;
    const nx = -Math.sin(spot.angle) * side, ny = Math.cos(spot.angle) * side;
    paintStamp(c, s.stamp ?? 'heart', spot.at[0] + nx, spot.at[1] + ny + hop, r, (s.stamp === 'feet' || s.stamp === 'fish' ? spot.angle + Math.PI / 2 * (s.stamp === 'feet' ? 1 : 0) : 0) + jitter, s.colour, flip);
  }
}

function paintWithMirrors(c: C, s: Stroke, t: number | null, scratching: boolean): void {
  const cx = PAPER.w / 2, cy = PAPER.h / 2;
  for (const [a, b, cc, d] of mirrors(s.sym)) {
    c.save(); c.translate(cx, cy); c.transform(a, b, cc, d, 0, 0); c.translate(-cx, -cy);
    paintStroke(c, s, t, scratching);
    c.restore();
  }
}

// ---------------------------------------------------------------- fills and patterns

/** Fills the current path with a colour and its pattern (stripes, dots, stars or hearts in a darker or lighter shade). */
function fillWith(c: C, shape: () => void, f: Fill, bounds: [number, number, number, number]): void {
  shape(); c.fillStyle = f.colour; c.fill();
  if (f.pattern === 'none') return;
  const ink = lum(f.colour) < 0.45 ? mix(f.colour, '#ffffff', 0.4) : mix(f.colour, '#000000', 0.22), [x0, y0, w, h] = bounds;
  c.save(); shape(); c.clip(); c.fillStyle = ink;
  if (f.pattern === 'stripes') for (let d = -h; d < w + h; d += 18) { path(c, [[x0 + d, y0], [x0 + d + 8, y0], [x0 + d + 8 - h, y0 + h], [x0 + d - h, y0 + h]], true); c.fill(); }
  else for (let gy = y0, row = 0; gy < y0 + h + 20; gy += 24, row++) for (let gx = x0 + (row % 2) * 12; gx < x0 + w + 20; gx += 24) {
    if (f.pattern === 'dots') oval(c, ink, gx, gy, 4, 4);
    else if (f.pattern === 'stars') { starPath(c, gx, gy, 6); c.fill(); }
    else { c.save(); c.translate(gx, gy); heartPath(c, 6); c.fill(); c.restore(); }
  }
  c.restore();
}
const boundsOf = (s: Shape): [number, number, number, number] => 'e' in s ? [s.e[0] - s.e[2], s.e[1] - s.e[3], s.e[2] * 2, s.e[3] * 2] : 'r' in s ? s.r : (() => {
  const xs = s.p.map(p => p[0]), ys = s.p.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] as [number, number, number, number];
})();

// ---------------------------------------------------------------- the whole picture

const layers = new Map<string, CanvasRenderingContext2D>();
function layer(key: string, w: number, h: number): CanvasRenderingContext2D {
  let l = layers.get(key);
  if (!l || l.canvas.width !== w || l.canvas.height !== h) { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; l = canvas.getContext('2d')!; layers.set(key, l); }
  l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, w, h);
  return l;
}

/** The rainbow under scratch paper: wide diagonal bands of the crayons' colours. */
function paintRainbow(c: C): void {
  const cols = CRAYONS.slice(0, 8).map(k => k.colour);
  for (let i = -8, d = -PAPER.h; d < PAPER.w + PAPER.h; d += 46, i++) { path(c, [[d, 0], [d + 46, 0], [d + 46 - PAPER.h, PAPER.h], [d - PAPER.h, PAPER.h]], true); c.fillStyle = cols[(i % cols.length + cols.length) % cols.length]; c.fill(); }
}

/** The whole picture, from (0, 0), `scale` canvas pixels to a paper unit; alive at time `t` when it is given. */
export function renderPicture(c: C, pic: Picture, scale: number, t: number | null = null): void {
  const w = Math.ceil(PAPER.w * scale), h = Math.ceil(PAPER.h * scale);
  c.save(); c.scale(scale, scale);
  // The paper (scratch paper's rainbow waits under the black) and the colouring page.
  if (pic.scratch) paintRainbow(c);
  else fillWith(c, () => { c.beginPath(); c.rect(0, 0, PAPER.w, PAPER.h); }, pic.background, [0, 0, PAPER.w, PAPER.h]);
  pic.page?.regions.forEach((s, i) => { fillWith(c, () => shapePath(c, s), pic.fills[i] ?? { colour: '#ffffff', pattern: 'none' }, boundsOf(s)); shapePath(c, s); stroke(c, INK, 3); });
  // Tracing guides: dotted until the letter is traced, then green.
  pic.trace?.letters.forEach((letter, i) => {
    const done = pic.traced[i];
    if (!done) for (const [gx, gy] of guidePoints(letter.strokes, 12)) oval(c, '#b8bab6', gx, gy, 5, 5);
    else for (const s of letter.strokes) { path(c, s); stroke(c, '#3f9a3a', 14); path(c, s); stroke(c, '#a6e08a', 6); }
  });
  c.restore();
  // The lines, on a layer of their own: the eraser rubs out lines only, never the paper or the page. On scratch paper the
  // layer is black, and every line cuts through it (the eraser puts the black back).
  if (pic.strokes.length || pic.scratch) {
    const l = layer('strokes', w, h);
    l.scale(scale, scale);
    if (pic.scratch) { l.fillStyle = '#1d1d26'; l.fillRect(0, 0, PAPER.w, PAPER.h); }
    for (const s of pic.strokes) {
      l.globalCompositeOperation = pic.scratch ? (s.brush === 'eraser' ? 'source-over' : 'destination-out') : (s.brush === 'eraser' ? 'destination-out' : 'source-over');
      paintWithMirrors(l, pic.scratch && s.brush === 'eraser' ? { ...s, colour: '#1d1d26' } : s, t, pic.scratch);
    }
    l.globalCompositeOperation = 'source-over';
    c.drawImage(l.canvas, 0, 0, w, h, 0, 0, w, h);
  }
  // The stickers on top, bobbing when alive.
  c.save(); c.scale(scale, scale);
  for (const s of pic.stickers) paintStuck(c, s, t);
  c.restore();
}

export function paintStuck(c: C, s: Stuck, t: number | null, lift = 0): void {
  const bob = t !== null ? Math.sin(t * 3 + s.id) * 4 : 0, turn = t !== null ? Math.sin(t * 2 + s.id * 1.7) * 0.12 : 0;
  if (lift) oval(c, 'rgba(20, 20, 20, 0.2)', s.x + 4, s.y + STICKER_SIZES[s.size] * 0.9, STICKER_SIZES[s.size] * 0.8, 6);
  paintSticker(c, s.sticker, s.x, s.y + bob - lift, STICKER_SIZES[s.size] * (1 + lift * 0.01), s.turn + turn);
}

const cache = new WeakMap<Picture, { version: number; scale: number; canvas: HTMLCanvasElement }>();
/** The picture as a canvas `scale` pixels to the paper unit, redrawn only when it has changed. */
export function pictureCanvas(pic: Picture, scale: number): HTMLCanvasElement {
  const kept = cache.get(pic);
  if (kept && kept.version === pic.version && kept.scale === scale) return kept.canvas;
  const canvas = kept?.scale === scale ? kept.canvas : document.createElement('canvas');
  canvas.width = Math.ceil(PAPER.w * scale); canvas.height = Math.ceil(PAPER.h * scale);
  const c = canvas.getContext('2d')!; c.clearRect(0, 0, canvas.width, canvas.height);
  renderPicture(c, pic, scale);
  cache.set(pic, { version: pic.version, scale, canvas });
  return canvas;
}

/** A small PNG of the picture for the walls of the house. */
export function pictureToDataUrl(pic: Picture, width = 232): string {
  const canvas = document.createElement('canvas'), scale = width / PAPER.w;
  canvas.width = width; canvas.height = Math.round(PAPER.h * scale);
  renderPicture(canvas.getContext('2d')!, pic, scale);
  return canvas.toDataURL('image/png');
}
