import { CRAYONS, PAPER, PAPER_WHITE, SIZES, pageOf, type Page, type PageId, type Pt, type Shape, type StickerId } from './games/pyssel';

// Pysselhörnan's rules, without Phaser: a picture is kept as what was done to it (lines, filled parts, stickers), not as
// pixels, so it can be undone step by step and drawn at any size: big on the table, small on the walls of the house. There
// is nothing to win: a picture is finished when Carl-Otto puts it up.

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

export interface Stroke { colour: string; size: number; erase: boolean; points: Pt[] }
export interface Stuck { sticker: StickerId; x: number; y: number; turn: number }
type Undo = { kind: 'stroke' } | { kind: 'sticker' } | { kind: 'fill'; region: number; before: string | null } | { kind: 'background'; before: string };

/** Points closer together than this (paper units) are not kept: a held, still crayon adds nothing. */
const MIN_STEP = 1.5;

export class Picture {
  background = PAPER_WHITE;
  /** Each part of the colouring page: its colour, or null while it is still white. */
  fills: Array<string | null>;
  strokes: Stroke[] = [];
  stickers: Stuck[] = [];
  /** Bumped on every change, so a drawing of it can be kept until it changes. */
  version = 0;
  private history: Undo[] = [];

  constructor(readonly page: Page | null) { this.fills = page ? page.regions.map(() => null) : []; }

  /** How many things have been done to it (and not undone). */
  get marks(): number { return this.history.length; }

  startStroke(colour: string, size: number, erase: boolean, at: Pt): void {
    this.strokes.push({ colour, size, erase, points: [at] });
    this.history.push({ kind: 'stroke' }); this.version++;
  }

  /** Adds a point to the line being drawn. */
  extend(at: Pt): void {
    const s = this.strokes[this.strokes.length - 1];
    if (!s) return;
    const last = s.points[s.points.length - 1];
    if (Math.hypot(at[0] - last[0], at[1] - last[1]) < MIN_STEP) return;
    s.points.push(at); this.version++;
  }

  /** Colours the part of the page under a point (on plain paper, the whole sheet). False if it already was that colour. */
  fill(at: Pt, colour: string): boolean {
    const region = this.page ? regionAt(this.page, at[0], at[1]) : -1;
    if (region < 0) {
      if (this.background === colour) return false;
      this.history.push({ kind: 'background', before: this.background }); this.background = colour;
    } else {
      if (this.fills[region] === colour) return false;
      this.history.push({ kind: 'fill', region, before: this.fills[region] }); this.fills[region] = colour;
    }
    this.version++;
    return true;
  }

  stick(sticker: StickerId, at: Pt, turn: number): void {
    this.stickers.push({ sticker, x: at[0], y: at[1], turn });
    this.history.push({ kind: 'sticker' }); this.version++;
  }

  /** Takes back the last thing done. False when there is nothing left to take back. */
  undo(): boolean {
    const last = this.history.pop();
    if (!last) return false;
    if (last.kind === 'stroke') this.strokes.pop();
    else if (last.kind === 'sticker') this.stickers.pop();
    else if (last.kind === 'fill') this.fills[last.region] = last.before;
    else this.background = last.before;
    this.version++;
    return true;
  }
}

export type Tool = 'crayon' | 'bucket' | 'eraser' | 'sticker';
/** Drawing; choosing a new sheet; or the picture just put up. */
export type CraftMode = 'drawing' | 'choosing' | 'hung';

/** How far the keyboard's pen moves a second, in paper units. */
export const CURSOR_SPEED = 220;

export class CraftRun {
  mode: CraftMode = 'drawing';
  tool: Tool = 'crayon';
  colour = CRAYONS[0].colour;
  /** An index into SIZES. */
  size = 1;
  sticker: StickerId = 'star';
  picture = new Picture(null);
  /** The keyboard's pen: where it is on the paper, whether it is down, and whether it has been used (then it shows). */
  cursor: Pt = [PAPER.w / 2, PAPER.h / 2];
  pen = false;
  cursorShown = false;
  /** Sound and announcement cues since the scene last read them. */
  events: string[] = [];
  private drawing = false;
  private random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; }

  /** A point kept on the paper. */
  private clamp([x, y]: Pt): Pt { return [Math.max(0, Math.min(PAPER.w, x)), Math.max(0, Math.min(PAPER.h, y))]; }

  /** A press on the paper (paper units): a line starts, a part fills, or a sticker goes on. */
  press(at: Pt): void {
    if (this.mode !== 'drawing') return;
    const p = this.clamp(at);
    if (this.tool === 'crayon' || this.tool === 'eraser') {
      this.picture.startStroke(this.colour, SIZES[this.size], this.tool === 'eraser', p);
      this.drawing = true;
      this.events.push(this.tool === 'eraser' ? 'erase' : 'draw');
    } else if (this.tool === 'bucket') {
      if (this.picture.fill(p, this.colour)) this.events.push('fill');
    } else {
      this.picture.stick(this.sticker, p, (this.random() - 0.5) * 0.6);
      this.events.push('sticker');
    }
  }

  drag(at: Pt): void { if (this.drawing && this.mode === 'drawing') this.picture.extend(this.clamp(at)); }
  release(): void { this.drawing = false; }
  get busy(): boolean { return this.drawing; }

  /** The keyboard's pen: moves, drawing while it is down. */
  move(dx: number, dy: number): void {
    if (this.mode !== 'drawing' || (!dx && !dy)) return;
    this.cursorShown = true;
    this.cursor = this.clamp([this.cursor[0] + dx, this.cursor[1] + dy]);
    if (this.pen) this.drag(this.cursor);
  }

  /** Space: the crayon and the eraser go down or lift; the bucket and the stickers act where the pen is. */
  action(): void {
    if (this.mode !== 'drawing') return;
    this.cursorShown = true;
    if (this.tool === 'crayon' || this.tool === 'eraser') {
      this.pen = !this.pen;
      if (this.pen) this.press(this.cursor); else this.release();
    } else this.press(this.cursor);
  }

  setTool(tool: Tool): void { this.lift(); this.tool = tool; this.events.push(`tool:${tool}`); }
  /** A crayon: the bucket keeps its place in the hand, anything else gives way to drawing. */
  setColour(colour: string): void {
    this.lift(); this.colour = colour;
    if (this.tool !== 'bucket') this.tool = 'crayon';
    this.events.push(`colour:${colour}`);
  }
  setSize(size: number): void { this.lift(); this.size = Math.max(0, Math.min(SIZES.length - 1, size)); if (this.tool !== 'eraser') this.tool = 'crayon'; this.events.push(`size:${this.size}`); }
  setSticker(id: StickerId): void { this.lift(); this.sticker = id; this.tool = 'sticker'; this.events.push(`sticker-pick:${id}`); }

  undo(): void { this.lift(); if (this.mode === 'drawing' && this.picture.undo()) this.events.push('undo'); }

  /** Opens the choice of a new sheet (the picture so far is kept until one is chosen). */
  choose(): void { this.lift(); this.mode = 'choosing'; }
  /** Back to the picture from the choice. */
  keepDrawing(): void { if (this.mode === 'choosing') this.mode = 'drawing'; }

  /** A new sheet: plain paper, or a colouring page (then the bucket is in the hand). */
  newPaper(page: PageId | null): void {
    this.lift();
    this.picture = new Picture(page ? pageOf(page) : null);
    this.tool = page ? 'bucket' : 'crayon';
    this.mode = 'drawing';
    this.events.push('paper');
  }

  /** Puts the picture up on the wall. False (and nothing happens) while the sheet is still empty. */
  hang(): boolean {
    this.lift();
    if (this.mode !== 'drawing' || this.picture.marks === 0) { this.events.push('empty'); return false; }
    this.mode = 'hung';
    this.events.push('hung');
    return true;
  }

  private lift(): void { this.drawing = false; this.pen = false; }
}
