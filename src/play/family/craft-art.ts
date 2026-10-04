import { INK, TAU, box, line, oval, path, rgba, seeded, stroke, vgrad, type C, type Pt } from './art';
import { Picture, type CraftRun } from './craft-run';
import { CRAYONS, PAGES, PAPER, STICKERS, STICKER_R, type Shape, type StickerId } from './games/pyssel';

// Pysselhörnan's table, seen from above, after the family's photo of the craft corner: the teak coffee table, a sheet of
// paper, the crayons laid out in a row and a sheet of stickers. The picture is drawn from Carl-Otto's lines, fills and
// stickers into a canvas of its own (kept until it changes), so the same drawing serves the table, the thumbnails when a
// new sheet is chosen, and the small copies hung on the walls of the house.

const W = 960;

// ---------------------------------------------------------------- where things are (world pixels)

/** A crayon on the table: they lie in a row to the right of the paper. */
export const crayonBox = (i: number) => ({ x: 664, y: 104 + i * 24, w: 132, h: 20 });
/** A sticker on the sheet: two columns of three. */
export const stickerBox = (i: number) => ({ x: 818 + (i % 2) * 64, y: 112 + Math.floor(i / 2) * 64, w: 58, h: 58 });
/** The sheets to choose from: plain paper, the four colouring pages, and the picture so far, in a 3 × 2 grid. */
export const thumbBox = (i: number) => ({ x: PAPER.x + 12 + (i % 3) * 194, y: PAPER.y + 10 + Math.floor(i / 3) * 206, w: 172, h: 125 });

// ---------------------------------------------------------------- shapes and stickers

export function shapePath(c: C, s: Shape): void {
  c.beginPath();
  if ('e' in s) c.ellipse(s.e[0], s.e[1], s.e[2], s.e[3], 0, 0, TAU);
  else if ('r' in s) c.rect(...s.r);
  else path(c, s.p, true);
}

function starPath(c: C, x: number, y: number, r: number, inner = 0.48): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * inner : r; pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]); }
  path(c, pts, true);
}
function heartPath(c: C, r: number): void {
  c.beginPath(); c.moveTo(0, r * 0.85);
  c.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.6, -r * 1.05, 0, -r * 0.42);
  c.bezierCurveTo(r * 0.6, -r * 1.05, r * 1.3, -r * 0.1, 0, r * 0.85); c.closePath();
}

/** A sticker, centred on (x, y): a white die-cut border, the picture, an ink line. */
export function paintSticker(c: C, id: StickerId, x: number, y: number, r = STICKER_R, turn = 0): void {
  c.save(); c.translate(x, y); c.rotate(turn);
  const border = (shape: () => void) => { shape(); stroke(c, '#ffffff', r * 0.28); };
  const done = (shape: () => void, fill: string) => { shape(); c.fillStyle = fill; c.fill(); stroke(c, INK, Math.max(1, r * 0.06)); };
  if (id === 'star') { const s = () => starPath(c, 0, 0, r); border(s); done(s, '#f2c230'); oval(c, 'rgba(255, 255, 255, 0.5)', r * 0.15, -r * 0.2, r * 0.18, r * 0.12); }
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
  } else {
    // The fox from the wallpaper in Carl-Otto's room: ears, a pointed face, white cheeks, a black nose.
    const head: Pt[] = [[-r, -r * 0.9], [-r * 0.45, -r * 0.45], [r * 0.45, -r * 0.45], [r, -r * 0.9], [r * 0.9, -r * 0.05], [0, r * 0.95], [-r * 0.9, -r * 0.05]];
    const s = () => path(c, head, true);
    border(s); done(s, '#f08a2c');
    path(c, [[-r * 0.85, -r * 0.05], [0, r * 0.95], [-r * 0.05, r * 0.15]], true); c.fillStyle = '#ffffff'; c.fill();
    path(c, [[r * 0.85, -r * 0.05], [0, r * 0.95], [r * 0.05, r * 0.15]], true); c.fillStyle = '#ffffff'; c.fill();
    s(); stroke(c, INK, Math.max(1, r * 0.06));
    oval(c, INK, 0, r * 0.78, r * 0.13, r * 0.1);
    oval(c, INK, -r * 0.32, -r * 0.08, r * 0.08, r * 0.11); oval(c, INK, r * 0.32, -r * 0.08, r * 0.08, r * 0.11);
  }
  c.restore();
}

// ---------------------------------------------------------------- the picture

let layer: CanvasRenderingContext2D | null = null;
/** A scratch canvas for the lines, so the eraser rubs out lines only, never the paper or the colouring page. */
function scratch(w: number, h: number): CanvasRenderingContext2D {
  if (!layer || layer.canvas.width !== w || layer.canvas.height !== h) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; layer = canvas.getContext('2d')!;
  }
  layer.setTransform(1, 0, 0, 1, 0, 0); layer.clearRect(0, 0, w, h);
  return layer;
}

/** The whole picture, from (0, 0), `scale` canvas pixels to a paper unit. */
export function renderPicture(c: C, pic: Picture, scale: number): void {
  const w = Math.ceil(PAPER.w * scale), h = Math.ceil(PAPER.h * scale);
  c.save(); c.scale(scale, scale);
  c.fillStyle = pic.background; c.fillRect(0, 0, PAPER.w, PAPER.h);
  pic.page?.regions.forEach((s, i) => { shapePath(c, s); c.fillStyle = pic.fills[i] ?? '#ffffff'; c.fill(); stroke(c, INK, 3); });
  c.restore();
  if (pic.strokes.length) {
    const l = scratch(w, h);
    l.scale(scale, scale);
    for (const s of pic.strokes) {
      l.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
      const [first] = s.points;
      if (s.points.length === 1) { l.fillStyle = s.colour; l.beginPath(); l.arc(first[0], first[1], s.size / 2, 0, TAU); l.fill(); continue; }
      // Smooth: a curve through the midpoints of the points the crayon passed.
      l.beginPath(); l.moveTo(first[0], first[1]);
      for (let i = 1; i < s.points.length - 1; i++) {
        const [x, y] = s.points[i], [nx, ny] = s.points[i + 1];
        l.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      }
      const last = s.points[s.points.length - 1]; l.lineTo(last[0], last[1]);
      l.strokeStyle = s.colour; l.lineWidth = s.size; l.lineCap = 'round'; l.lineJoin = 'round'; l.stroke();
    }
    l.globalCompositeOperation = 'source-over';
    c.drawImage(l.canvas, 0, 0, w, h, 0, 0, w, h);
  }
  c.save(); c.scale(scale, scale);
  for (const s of pic.stickers) paintSticker(c, s.sticker, s.x, s.y, STICKER_R, s.turn);
  c.restore();
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

const blanks = new Map<string, Picture>();
const blankOf = (id: string) => { let p = blanks.get(id); if (!p) blanks.set(id, p = new Picture(PAGES.find(x => x.id === id) ?? null)); return p; };

// ---------------------------------------------------------------- the table

function paintTable(c: C): void {
  // Teak, with its grain running across, darker towards the table's edges.
  c.fillStyle = vgrad(c, 0, 540, [[0, '#7a5236'], [0.5, '#8a6239'], [1, '#74502f']]); c.fillRect(0, 0, W, 540);
  const rand = seeded(44);
  for (let i = 0; i < 70; i++) {
    const y = rand() * 540, x = rand() * W - 100, len = 200 + rand() * 400, bow = (rand() - 0.5) * 10;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y + bow, x + len, y);
    stroke(c, rand() < 0.5 ? 'rgba(94, 64, 41, 0.45)' : 'rgba(184, 141, 90, 0.35)', 1 + rand() * 1.5);
  }
  for (let i = 0; i < 6; i++) { const x = rand() * W, y = rand() * 540; c.beginPath(); c.ellipse(x, y, 16 + rand() * 10, 5 + rand() * 3, 0, 0, TAU); stroke(c, 'rgba(94, 64, 41, 0.35)', 1.2); }
  c.fillStyle = 'rgba(30, 18, 10, 0.18)'; c.fillRect(0, 520, W, 20);
}

function paintCrayon(c: C, x: number, y: number, colour: string, chosen: boolean, t: number): void {
  const dx = chosen ? -16 + Math.sin(t * 4) * 2 : 0, w = 132, h = 18;
  c.save(); c.translate(x + dx, y);
  box(c, 'rgba(30, 18, 10, 0.3)', 4, 4, w, h, 5);
  // The tip, then the body in its paper wrapper.
  path(c, [[0, h / 2], [18, 1], [18, h - 1]], true); c.fillStyle = colour; c.fill(); stroke(c, INK, 1.4);
  box(c, INK, 16.5, -1.5, w - 15, h + 3, 4); box(c, colour, 18, 0, w - 18, h, 3);
  box(c, rgba('#ffffff', 0.3), 22, 2, w - 26, 4, 2);
  box(c, 'rgba(255, 255, 255, 0.85)', 40, 0, 62, h); line(c, colour, 1.6, [[46, h / 2], [96, h / 2]]);
  box(c, 'rgba(0, 0, 0, 0.18)', 38, 0, 2, h); box(c, 'rgba(0, 0, 0, 0.18)', 102, 0, 2, h);
  c.restore();
}

function paintStickerSheet(c: C, run: Pick<CraftRun, 'tool' | 'sticker'>, t: number): void {
  box(c, 'rgba(30, 18, 10, 0.3)', 812, 104, 136, 204, 8);
  box(c, INK, 806, 98, 136, 204, 9); box(c, '#cdeefb', 808, 100, 132, 200, 8);
  STICKERS.forEach((s, i) => {
    const b = stickerBox(i), chosen = run.tool === 'sticker' && run.sticker === s.id;
    if (chosen) { box(c, '#f2c230', b.x - 1, b.y - 1, b.w + 2, b.h + 2, 10); box(c, '#fff3b0', b.x + 3, b.y + 3, b.w - 6, b.h - 6, 8); }
    paintSticker(c, s.id, b.x + b.w / 2, b.y + b.h / 2, chosen ? 22 + Math.sin(t * 5) * 1.5 : 20);
  });
}

/** The paper on the table, with a soft shadow. `lift` raises and tilts it (put up on the wall). */
function paintPaper(c: C, pic: Picture, scale: number, lift = 0): void {
  c.save(); c.translate(PAPER.x + PAPER.w / 2, PAPER.y + PAPER.h / 2); c.rotate(-0.03 * lift); c.scale(1 - 0.06 * lift, 1 - 0.06 * lift);
  const x = -PAPER.w / 2, y = -PAPER.h / 2;
  box(c, `rgba(30, 18, 10, ${0.3 + 0.15 * lift})`, x + 5 + 10 * lift, y + 7 + 12 * lift, PAPER.w, PAPER.h, 2);
  box(c, INK, x - 1.5, y - 1.5, PAPER.w + 3, PAPER.h + 3, 2);
  c.drawImage(pictureCanvas(pic, scale), x, y, PAPER.w, PAPER.h);
  if (lift) for (const [tx, ty, a] of [[x + 24, y + 4, -0.6], [x + PAPER.w - 24, y + 4, 0.6]] as const) { c.save(); c.translate(tx, ty); c.rotate(a); box(c, 'rgba(240, 236, 214, 0.85)', -26, -9, 52, 18); c.restore(); }
  c.restore();
}

/** Confetti stars around the picture just put up. */
function confetti(c: C, t: number): void {
  const rand = seeded(7), cols = CRAYONS.map(k => k.colour);
  for (let i = 0; i < 26; i++) {
    const x = PAPER.x + rand() * PAPER.w, speed = 40 + rand() * 50, y = PAPER.y - 30 + ((rand() * 500 + t * speed) % 470), spin = t * (1 + rand() * 2);
    c.save(); c.translate(x + Math.sin(t * 2 + i) * 12, y); c.rotate(spin);
    starPath(c, 0, 0, 7 + rand() * 5); c.fillStyle = cols[i % cols.length]; c.fill(); stroke(c, INK, 1);
    c.restore();
  }
}

export type CraftView = Pick<CraftRun, 'mode' | 'tool' | 'colour' | 'sticker' | 'picture' | 'cursor' | 'pen' | 'cursorShown' | 'size'>;

/** One frame of the craft table, in world units. `scale` is canvas pixels per world unit (sharp paper at any size). */
export function drawCraft(c: C, run: CraftView, t: number, scale: number): void {
  paintTable(c);
  // A paper star and a pair of scissors left on the table, as in the photo.
  c.save(); c.translate(18, 250); c.rotate(1.5);
  line(c, '#3157b8', 6, [[0, 0], [34, -10]]); line(c, '#3157b8', 6, [[0, 0], [30, 14]]);
  for (const [x, y] of [[-6, -6], [-6, 8]] as Pt[]) { c.beginPath(); c.ellipse(x - 6, y, 8, 6, 0, 0, TAU); stroke(c, '#3157b8', 4); }
  line(c, '#b8bab6', 3, [[30, -8], [64, -18]]); line(c, '#b8bab6', 3, [[28, 12], [62, 20]]);
  c.restore();
  if (run.mode === 'choosing') {
    const sheets: Array<Picture | null> = [blankOf('blank'), ...PAGES.map(p => blankOf(p.id)), run.picture.marks ? run.picture : null];
    sheets.forEach((pic, i) => {
      if (!pic) return;
      const b = thumbBox(i);
      box(c, 'rgba(30, 18, 10, 0.3)', b.x + 4, b.y + 5, b.w, b.h, 2);
      box(c, INK, b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3, 2);
      c.drawImage(pictureCanvas(pic, scale * b.w / PAPER.w), b.x, b.y, b.w, b.h);
    });
  } else paintPaper(c, run.picture, scale, run.mode === 'hung' ? 1 : 0);
  CRAYONS.forEach((k, i) => { const b = crayonBox(i); paintCrayon(c, b.x, b.y, k.colour, run.mode === 'drawing' && run.tool !== 'sticker' && run.tool !== 'eraser' && run.colour === k.colour, t); });
  paintStickerSheet(c, run, t);
  if (run.mode === 'hung') confetti(c, t);
  // The keyboard's pen.
  if (run.mode === 'drawing' && run.cursorShown) {
    const x = PAPER.x + run.cursor[0], y = PAPER.y + run.cursor[1], ink = run.tool === 'eraser' ? '#ffffff' : run.colour;
    oval(c, INK, x, y, run.pen ? 9 : 7, run.pen ? 9 : 7); oval(c, ink, x, y, run.pen ? 7 : 5, run.pen ? 7 : 5);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) line(c, INK, 2, [[x + dx * 11, y + dy * 11], [x + dx * 18, y + dy * 18]]);
  }
}

/** A picture from the walls of the house (a PNG data URL), loaded once. */
const images = new Map<string, HTMLImageElement>();
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
