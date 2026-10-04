import {
  BRUSHES, CRAYONS, PAPER, PAPERS, SIZES, SPONGE_WORK, STAMPS, STICKER_SIZES, SYMMETRY, TRACE, guidePoints, pageOf, paperOf, traceOf,
  type Brush, type Page, type PageId, type PaperId, type Pattern, type Pt, type Shape, type StampId, type StickerId, type StickerPage, type Sym, type Tool, type Trace, type TraceId,
} from './games/pyssel';

// Pysselhörnan's rules, without Phaser. A picture is kept as what was done to it (lines with their brush, filled parts
// with their pattern, stickers with their place and size), not as pixels, so every step can be undone and it can be drawn
// at any size: big on the table, small on the walls of the house, and alive (wiggling) when "Spela" is on. There is
// nothing to win: a picture is finished when Carl-Otto puts it up. Tracing pages light up each letter of his name as he
// draws over it.

/** Whether a point (paper units) is inside a shape of a colouring page. */
export function inside(s: Shape, x: number, y: number): boolean {
  if ('e' in s) { const [cx, cy, rx, ry] = s.e; return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1; }
  if ('r' in s) { const [rx, ry, w, h] = s.r; return x >= rx && x <= rx + w && y >= ry && y <= ry + h; }
  let hit = false;
  for (let i = 0, j = s.p.length - 1; i < s.p.length; j = i++) {
    const [xi, yi] = s.p[i], [xj, yj] = s.p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The frontmost part of a page under a point, or -1. */
export function regionAt(page: Page, x: number, y: number): number {
  for (let i = page.regions.length - 1; i >= 0; i--) if (inside(page.regions[i], x, y)) return i;
  return -1;
}

export interface Fill { colour: string; pattern: Pattern }
export interface Stroke { brush: Brush; colour: string; size: number; sym: Sym; stamp?: StampId; seed: number; points: Pt[] }
export interface Stuck { id: number; sticker: StickerId; x: number; y: number; turn: number; size: number }
type Undo =
  | { kind: 'stroke' } | { kind: 'sticker' }
  | { kind: 'move'; id: number; from: Pt } | { kind: 'resize'; id: number; from: number } | { kind: 'remove'; stuck: Stuck; index: number }
  | { kind: 'fill'; region: number; before: Fill | null } | { kind: 'background'; before: Fill }
  | { kind: 'wipe'; strokes: Stroke[]; fills: Array<Fill | null>; stickers: Stuck[]; background: Fill };

/** Points closer together than this (paper units) are not kept: a held, still crayon adds nothing. */
const MIN_STEP = 1.5;
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export class Picture {
  background: Fill;
  /** Each part of the colouring page: its colour and pattern, or null while it is still white. */
  fills: Array<Fill | null>;
  strokes: Stroke[] = [];
  stickers: Stuck[] = [];
  /** Tracing: which guide points of each letter are covered, and which letters are done. */
  covered: boolean[][];
  traced: boolean[];
  /** Bumped on every change, so a drawing of it can be kept until it changes. */
  version = 0;
  private history: Undo[] = [];
  private nextId = 1;
  private guides: Pt[][];

  constructor(readonly page: Page | null, readonly paper: PaperId = 'white', readonly trace: Trace | null = null) {
    this.background = { colour: paperOf(paper).colour, pattern: 'none' };
    this.fills = page ? page.regions.map(() => null) : [];
    this.guides = trace ? trace.letters.map(l => guidePoints(l.strokes)) : [];
    this.covered = this.guides.map(g => g.map(() => false));
    this.traced = this.guides.map(() => false);
  }

  /** How many things have been done to it (and not undone). */
  get marks(): number { return this.history.length; }
  /** Scratch paper: everything drawn scratches the black away to the rainbow underneath. */
  get scratch(): boolean { return this.paper === 'scratch'; }

  startStroke(brush: Brush, colour: string, size: number, sym: Sym, at: Pt, seed: number, stamp?: StampId): void {
    this.strokes.push({ brush, colour, size, sym, seed, points: [at], ...(brush === 'stamp' ? { stamp } : {}) });
    this.history.push({ kind: 'stroke' }); this.version++;
  }

  /** Adds a point to the line being drawn. Returns the letters it finished tracing, if any. */
  extend(at: Pt): number[] {
    const s = this.strokes[this.strokes.length - 1];
    if (!s) return [];
    const last = s.points[s.points.length - 1];
    if (dist(at, last) < MIN_STEP) return [];
    s.points.push(at); this.version++;
    return s.brush === 'eraser' ? [] : this.coverLine(last, at, s.size);
  }

  /** Covers the guide points along a piece of line (a fast finger leaves its points far apart). */
  private coverLine(a: Pt, b: Pt, size: number): number[] {
    const n = Math.max(1, Math.ceil(dist(a, b) / 8)), done: number[] = [];
    for (let k = 1; k <= n; k++) done.push(...this.cover([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], size));
    return done;
  }

  /** Marks the guide points near a point as covered; returns letters that just became done. */
  private cover(at: Pt, size: number): number[] {
    const done: number[] = [], reach = TRACE.reach + size / 2;
    this.guides.forEach((g, i) => {
      if (this.traced[i]) return;
      g.forEach((p, k) => { if (!this.covered[i][k] && dist(p, at) <= reach) this.covered[i][k] = true; });
      if (this.covered[i].filter(Boolean).length >= g.length * TRACE.share) { this.traced[i] = true; done.push(i); }
    });
    return done;
  }

  /** Works the tracing out again from every line (after an undo or a wipe). */
  private retrace(): void {
    this.covered = this.guides.map(g => g.map(() => false));
    this.traced = this.guides.map(() => false);
    for (const s of this.strokes) if (s.brush !== 'eraser') s.points.forEach((p, i) => { if (i === 0) this.cover(p, s.size); else this.coverLine(s.points[i - 1], p, s.size); });
  }

  /** Colours the part of the page under a point (on plain paper, the whole sheet). False if nothing changed. */
  fill(at: Pt, colour: string, pattern: Pattern): boolean {
    if (this.scratch) return false;
    const region = this.page ? regionAt(this.page, at[0], at[1]) : -1, next = { colour, pattern };
    const same = (f: Fill | null) => !!f && f.colour === colour && f.pattern === pattern;
    if (region < 0) {
      if (same(this.background)) return false;
      this.history.push({ kind: 'background', before: this.background }); this.background = next;
    } else {
      if (same(this.fills[region])) return false;
      this.history.push({ kind: 'fill', region, before: this.fills[region] }); this.fills[region] = next;
    }
    this.version++;
    return true;
  }

  stick(sticker: StickerId, at: Pt, turn: number, size = 1): number {
    const id = this.nextId++;
    this.stickers.push({ id, sticker, x: at[0], y: at[1], turn, size });
    this.history.push({ kind: 'sticker' }); this.version++;
    return id;
  }

  stuck(id: number): Stuck | undefined { return this.stickers.find(s => s.id === id); }

  /** The topmost sticker under a point. */
  stickerAt(at: Pt): Stuck | null {
    for (let i = this.stickers.length - 1; i >= 0; i--) { const s = this.stickers[i]; if (dist([s.x, s.y], at) <= STICKER_SIZES[s.size] + 8) return s; }
    return null;
  }

  /** Moves a sticker while it is dragged (not yet a step to undo). */
  place(id: number, at: Pt): void { const s = this.stuck(id); if (s) { s.x = at[0]; s.y = at[1]; this.version++; } }
  /** A drag finished: one step to undo, back to where it was. */
  moved(id: number, from: Pt): void { const s = this.stuck(id); if (s && dist([s.x, s.y], from) > 1) this.history.push({ kind: 'move', id, from }); }

  resize(id: number, delta: number): boolean {
    const s = this.stuck(id);
    if (!s) return false;
    const size = Math.max(0, Math.min(STICKER_SIZES.length - 1, s.size + delta));
    if (size === s.size) return false;
    this.history.push({ kind: 'resize', id, from: s.size }); s.size = size; this.version++;
    return true;
  }

  remove(id: number): boolean {
    const index = this.stickers.findIndex(s => s.id === id);
    if (index < 0) return false;
    const [stuck] = this.stickers.splice(index, 1);
    this.history.push({ kind: 'remove', stuck, index }); this.version++;
    return true;
  }

  /** Wipes the sheet clean (the sponge); one step to undo. False when it is already clean. */
  wipe(): boolean {
    if (!this.strokes.length && !this.stickers.length && !this.fills.some(Boolean) && this.background.colour === paperOf(this.paper).colour && this.background.pattern === 'none') return false;
    this.history.push({ kind: 'wipe', strokes: this.strokes, fills: this.fills, stickers: this.stickers, background: this.background });
    this.strokes = []; this.stickers = []; this.fills = this.fills.map(() => null); this.background = { colour: paperOf(this.paper).colour, pattern: 'none' };
    this.retrace(); this.version++;
    return true;
  }

  /** Takes back the last thing done. False when there is nothing left to take back. */
  undo(): boolean {
    const last = this.history.pop();
    if (!last) return false;
    switch (last.kind) {
      case 'stroke': this.strokes.pop(); this.retrace(); break;
      case 'sticker': this.stickers.pop(); break;
      case 'move': { const s = this.stuck(last.id); if (s) { s.x = last.from[0]; s.y = last.from[1]; } break; }
      case 'resize': { const s = this.stuck(last.id); if (s) s.size = last.from; break; }
      case 'remove': this.stickers.splice(last.index, 0, last.stuck); break;
      case 'fill': this.fills[last.region] = last.before; break;
      case 'background': this.background = last.before; break;
      case 'wipe': this.strokes = last.strokes; this.fills = last.fills; this.stickers = last.stickers; this.background = last.background; this.retrace(); break;
    }
    this.version++;
    return true;
  }
}

/** Drawing; choosing a new sheet; looking through the pictures already made; or the picture just put up. */
export type CraftMode = 'drawing' | 'choosing' | 'gallery' | 'hung';
/** A new sheet: a paper, a colouring page, or a tracing page. */
export type Sheet = { paper: PaperId } | { page: PageId } | { trace: TraceId };

/** How far the keyboard's pen moves a second, in paper units. */
export const CURSOR_SPEED = 220;
/** The bin a sticker is dragged onto to throw it away, at the paper's lower right corner (paper units). */
export const BIN = { x: PAPER.w - 40, y: PAPER.h - 40, r: 38 };
const onPaper = ([x, y]: Pt) => x >= 0 && y >= 0 && x <= PAPER.w && y <= PAPER.h;

export class CraftRun {
  mode: CraftMode = 'drawing';
  tool: Tool = 'crayon';
  colour = CRAYONS[0].colour;
  /** An index into SIZES. */
  size = 1;
  stamp: StampId = 'heart';
  sym: Sym = 1;
  pattern: Pattern = 'none';
  sticker: StickerId = 'star';
  stickerPage: StickerPage = 'family';
  /** Which page of sheets is showing while a new one is chosen. */
  choosePage = 0;
  /** "Spela": the picture comes alive. */
  alive = false;
  picture = new Picture(null);
  /** The sticker chosen on the paper (with its + and − handles), one being dragged, or a new one carried from the sheet. */
  selected: number | null = null;
  dragging: { id: number; from: Pt; offset: Pt } | null = null;
  carry: { sticker: StickerId; at: Pt } | null = null;
  /** Whatever is held is over the bin. */
  overBin = false;
  /** The sponge: how much it has rubbed, and where it is. */
  sponged = 0;
  spongeAt: Pt | null = null;
  /** The picture chosen in the gallery. */
  chosen: number | null = null;
  /** The keyboard's pen: where it is on the paper, whether it is down, and whether it has been used (then it shows). */
  cursor: Pt = [PAPER.w / 2, PAPER.h / 2];
  pen = false;
  cursorShown = false;
  /** Sound and announcement cues since the scene last read them. */
  events: string[] = [];
  private drawing = false;
  private random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; }

  get brush(): Brush | null { return this.tool === 'bucket' || this.tool === 'sticker' || this.tool === 'sponge' ? null : this.tool; }
  get busy(): boolean { return this.drawing || !!this.dragging || !!this.carry; }

  // ---------------------------------------------------------------- choosing what is in the hand

  /** A brush (or the bucket). The stamp brush chosen again changes to the next stamp. */
  setBrush(b: Brush | 'bucket'): void {
    this.lift();
    if (b === 'stamp' && this.tool === 'stamp') { const i = STAMPS.findIndex(s => s.id === this.stamp); this.stamp = STAMPS[(i + 1) % STAMPS.length].id; this.events.push(`stamp:${this.stamp}`); }
    this.tool = b; this.selected = null;
    this.events.push(`tool:${b}`);
  }
  /** The next brush (the keyboard's B). */
  nextBrush(): void { const i = BRUSHES.findIndex(b => b.id === this.tool); this.setBrush(BRUSHES[(i + 1) % BRUSHES.length].id); }
  /** A crayon: the colour for whichever brush or bucket is in the hand (the eraser, a sticker or the sponge give way to the crayon). */
  setColour(colour: string): void {
    this.lift(); this.colour = colour;
    if (this.tool === 'eraser' || this.tool === 'sticker' || this.tool === 'sponge') this.tool = 'crayon';
    this.selected = null;
    this.events.push(`colour:${colour}`);
  }
  setSize(size: number): void { this.lift(); this.size = Math.max(0, Math.min(SIZES.length - 1, size)); if (!this.brush) this.tool = 'crayon'; this.events.push(`size:${this.size}`); }
  cycleSym(): void { this.lift(); this.sym = SYMMETRY[(SYMMETRY.indexOf(this.sym) + 1) % SYMMETRY.length]; this.events.push(`sym:${this.sym}`); }
  setPattern(p: Pattern): void { this.lift(); this.pattern = p; this.tool = 'bucket'; this.events.push(`pattern:${p}`); }
  pickSticker(id: StickerId): void { this.lift(); this.sticker = id; this.tool = 'sticker'; this.selected = null; this.events.push(`sticker-pick:${id}`); }
  setStickerPage(p: StickerPage): void { this.stickerPage = p; this.events.push(`sticker-page:${p}`); }
  setSponge(): void { this.lift(); this.tool = 'sponge'; this.selected = null; this.events.push('tool:sponge'); }
  toggleAlive(): void { this.alive = !this.alive; this.events.push(this.alive ? 'alive' : 'still'); }

  // ---------------------------------------------------------------- on the paper (paper units)

  private clamp([x, y]: Pt): Pt { return [Math.max(0, Math.min(PAPER.w, x)), Math.max(0, Math.min(PAPER.h, y))]; }
  private inBin(at: Pt): boolean { return dist(at, [BIN.x, BIN.y]) <= BIN.r; }

  /** A press on the paper: a line starts, a part fills, a sticker goes on (or one already there is picked up), or the sponge starts. */
  press(at: Pt): void {
    if (this.mode !== 'drawing') return;
    const p = this.clamp(at), pic = this.picture;
    if (this.tool === 'sticker') {
      const hit = pic.stickerAt(p);
      if (hit) { this.selected = hit.id; this.dragging = { id: hit.id, from: [hit.x, hit.y], offset: [hit.x - p[0], hit.y - p[1]] }; this.events.push('grab'); }
      else { this.selected = pic.stick(this.sticker, p, (this.random() - 0.5) * 0.6); this.events.push('sticker'); }
      return;
    }
    this.selected = null;
    if (this.tool === 'sponge') { this.drawing = true; this.spongeAt = p; this.sponged = 0; return; }
    if (this.tool === 'bucket') { this.events.push(pic.fill(p, this.colour, this.pattern) ? 'fill' : 'nofill'); return; }
    pic.startStroke(this.tool, this.colour, SIZES[this.size], this.sym, p, Math.floor(this.random() * 1e6), this.stamp);
    this.drawing = true;
    this.events.push(`draw:${this.tool}`);
    for (const i of pic.extend(p)) this.events.push(`letter:${i}`);
  }

  drag(at: Pt): void {
    if (this.mode !== 'drawing') return;
    if (this.dragging) { const d = this.dragging; this.picture.place(d.id, [at[0] + d.offset[0], at[1] + d.offset[1]]); this.overBin = this.inBin(at); return; }
    if (this.carry) { this.carry.at = at; this.overBin = false; return; }
    if (!this.drawing) return;
    const p = this.clamp(at);
    if (this.tool === 'sponge') {
      if (this.spongeAt) this.sponged += dist(p, this.spongeAt);
      this.spongeAt = p;
      if (this.sponged >= SPONGE_WORK) { this.sponged = 0; if (this.picture.wipe()) this.events.push('wipe'); }
      return;
    }
    const done = this.picture.extend(p);
    for (const i of done) this.events.push(`letter:${i}`);
    if (done.length && this.picture.traced.every(Boolean)) this.events.push('traced');
  }

  /** The finger lifts: a dragged sticker lands (or goes in the bin), a carried one goes on the paper, a line ends. */
  release(): void {
    if (this.dragging) {
      const d = this.dragging;
      this.dragging = null;
      if (this.overBin) { this.picture.remove(d.id); this.selected = null; this.events.push('bin'); }
      else { this.picture.moved(d.id, d.from); this.events.push('drop'); }
    } else if (this.carry) {
      const c = this.carry;
      this.carry = null;
      if (onPaper(c.at)) { this.selected = this.picture.stick(c.sticker, c.at, (this.random() - 0.5) * 0.6); this.events.push('sticker'); }
    }
    this.overBin = false;
    this.drawing = false; this.spongeAt = null; this.sponged = 0;
  }

  /** A sticker picked up from the sheet with a finger, to be carried onto the paper. */
  carryNew(id: StickerId, at: Pt): void { this.pickSticker(id); this.carry = { sticker: id, at }; }

  // ---------------------------------------------------------------- the chosen sticker

  resizeSelected(delta: number): void { if (this.selected !== null && this.picture.resize(this.selected, delta)) this.events.push(delta > 0 ? 'bigger' : 'smaller'); }
  removeSelected(): void { if (this.selected !== null && this.picture.remove(this.selected)) { this.selected = null; this.events.push('bin'); } }
  /** Moves the chosen sticker by the keyboard (one step to undo per press). */
  nudgeSelected(dx: number, dy: number): void {
    const s = this.selected !== null ? this.picture.stuck(this.selected) : undefined;
    if (!s) return;
    const from: Pt = [s.x, s.y];
    this.picture.place(s.id, this.clamp([s.x + dx, s.y + dy])); this.picture.moved(s.id, from);
  }
  /** The next sticker on the paper (the keyboard's Tab through stickers). */
  selectNext(): void {
    const all = this.picture.stickers;
    if (!all.length) return;
    const i = all.findIndex(s => s.id === this.selected);
    this.selected = all[(i + 1) % all.length].id; this.tool = 'sticker';
  }

  // ---------------------------------------------------------------- the keyboard's pen

  move(dx: number, dy: number): void {
    if (this.mode !== 'drawing' || (!dx && !dy)) return;
    this.cursorShown = true;
    this.cursor = this.clamp([this.cursor[0] + dx, this.cursor[1] + dy]);
    if (this.pen) this.drag(this.cursor);
  }

  /** Space: a brush goes down or lifts; the bucket, a sticker and the sponge act where the pen is. */
  action(): void {
    if (this.mode !== 'drawing') return;
    this.cursorShown = true;
    if (this.brush) { this.pen = !this.pen; if (this.pen) this.press(this.cursor); else this.release(); }
    else if (this.tool === 'sponge') { if (this.picture.wipe()) this.events.push('wipe'); }
    else { this.press(this.cursor); this.release(); }
  }

  undo(): void { this.lift(); if (this.mode === 'drawing' && this.picture.undo()) { this.events.push('undo'); if (this.selected !== null && !this.picture.stuck(this.selected)) this.selected = null; } }

  // ---------------------------------------------------------------- sheets, the gallery, putting a picture up

  /** Opens the choice of a new sheet (the picture so far is kept until one is chosen). */
  choose(): void { this.lift(); this.mode = 'choosing'; this.choosePage = 0; this.alive = false; }
  /** Back to the picture from the choice or the gallery. */
  keepDrawing(): void { if (this.mode === 'choosing' || this.mode === 'gallery') this.mode = 'drawing'; }
  turnChoosePage(pages: number): void { this.choosePage = (this.choosePage + 1) % pages; this.events.push('page'); }

  /** A new sheet: a paper, a colouring page (then the bucket is in the hand), or a tracing page. */
  newPaper(sheet: Sheet): void {
    this.lift();
    if ('page' in sheet) { this.picture = new Picture(pageOf(sheet.page)); this.tool = 'bucket'; this.pattern = 'none'; }
    else if ('trace' in sheet) { this.picture = new Picture(null, 'white', traceOf(sheet.trace)); this.tool = 'crayon'; this.sym = 1; }
    else { this.picture = new Picture(null, sheet.paper); if (!this.brush) this.tool = 'crayon'; if (sheet.paper === 'black' || sheet.paper === 'scratch') this.tool = sheet.paper === 'black' ? 'neon' : 'crayon'; }
    this.selected = null; this.alive = false;
    this.mode = 'drawing';
    this.events.push('paper');
  }

  openGallery(): void { this.lift(); this.mode = 'gallery'; this.chosen = null; this.alive = false; this.events.push('gallery'); }
  choosePicture(i: number | null): void { this.chosen = i; if (i !== null) this.events.push('chosen'); }

  /** Puts the picture up on the wall. False (and nothing happens) while the sheet is still empty. */
  hang(): boolean {
    this.lift();
    if (this.mode !== 'drawing' || this.picture.marks === 0) { this.events.push('empty'); return false; }
    this.mode = 'hung'; this.selected = null;
    this.events.push('hung');
    return true;
  }

  private lift(): void {
    if (this.dragging || this.carry) this.release();
    this.drawing = false; this.pen = false; this.spongeAt = null; this.sponged = 0;
  }
}
