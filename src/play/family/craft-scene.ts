import { getLang } from '../../side/i18n';
import type { Pt } from './art';
import {
  ACTIONS, BACK_BOX, BIN_BOX, NEXT_BOX, ROOMS, SYM_BOX, actionBox, brushBox, cellBox, colourBox, drawCraft, handles, patternBox,
  roomBox, sheetPages, sheetsOn, sizeBox, stickersOn, tabBox, thumbBox, type Action, type Box,
} from './craft-art';
import { pictureToDataUrl } from './craft-paint';
import { CURSOR_SPEED, CraftRun, type Sheet } from './craft-run';
import type { Words } from './games/kurragomma';
import { BRUSHES, CRAYONS, PAGES, PAPER, PAPERS, PATTERNS, STAMPS, STICKERS, STICKER_PAGES, TRACES, type StickerPage } from './games/pyssel';
import { addDrawing, hangDrawing, markDone, readProgress, removeDrawing, type HomeProgress, type WallRoom } from './house';
import { K, RoomScene } from './room-scene';
import { familyText as t } from './text';
import { wallPicture } from './wall-picture';

// Carl-Otto's games 3, Hemma: Pysselhörnan, the craft table in the hall. Everything is a picture to touch, nothing needs
// reading: magic brushes (rainbow, glitter, stamps, neon) with a mirror butterfly for kaleidoscope drawing, a bucket with
// patterns, family and friends as stickers that can be moved, made bigger or smaller and thrown in the bin, magic papers
// (black for neon, scratch paper with a rainbow underneath), colouring pages from his own world, tracing his name, a
// gallery to choose which picture hangs in which room, and "Spela", which makes the picture come alive. With a keyboard:
// the arrows move a pen, Space draws, and letters pick the tools (see craftKeys).

const words = (w: Words) => w[getLang()];
const ACTION_NAMES: Record<Action, () => string> = { sponge: () => t('actSponge'), undo: () => t('actUndo'), new: () => t('actNew'), gallery: () => t('actGallery'), play: () => t('actPlay'), hang: () => t('actHang') };
const PAGE_NAMES: Record<StickerPage, () => string> = { family: () => t('pageFamily'), things: () => t('pageThings'), shapes: () => t('pageShapes') };
const ROOM_HANG: Record<WallRoom, () => string> = { living: () => t('hangLiving'), hall: () => t('hangHall'), bedroom: () => t('hangBedroom') };
const ROOM_NAME: Record<WallRoom, () => string> = { living: () => t('roomLiving'), hall: () => t('roomHall'), bedroom: () => t('roomBedroom') };
const within = ([x, y]: Pt, b: Box) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

function sheetName(s: Sheet | 'keep'): string {
  if (s === 'keep') return t('keepDrawing');
  if ('paper' in s) return words(PAPERS.find(p => p.id === s.paper)!.name);
  if ('page' in s) return words(PAGES.find(p => p.id === s.page)!.name);
  return words(TRACES.find(x => x.id === s.trace)!.name);
}
const sheetId = (s: Sheet | 'keep') => s === 'keep' ? 'sheet-keep' : 'paper' in s ? `sheet-paper-${s.paper}` : 'page' in s ? `sheet-page-${s.page}` : `sheet-trace-${s.trace}`;

export class CraftScene extends RoomScene {
  run = new CraftRun();
  private status: HTMLElement | null = null;
  private shown = '';
  private progress: HomeProgress = readProgress(null);
  /** Seconds since each letter of a tracing page was traced (−1: not yet), for the stars. */
  private letterSince: number[] = [];
  private lastPicture: unknown = null;

  constructor() { super('Craft', 'hall', 'craft', 'hub'); }

  protected reset(): void { this.run = new CraftRun(); this.shown = ''; this.status = null; this.progress = readProgress(); this.letterSince = []; this.lastPicture = null; }

  /** What the controls depend on: when it changes, they are rebuilt (not while something is being drawn or dragged). */
  private get state(): string {
    const g = this.run, sel = g.selected !== null ? g.picture.stuck(g.selected) : undefined;
    return [g.mode, g.tool, g.colour, g.size, g.pattern, g.sym, g.stamp, g.stickerPage, g.alive, sel ? `${sel.id}:${sel.size}:${Math.round(sel.x / 20)}:${Math.round(sel.y / 20)}` : '', g.choosePage, g.chosen, g.picture.marks > 0, this.progress.drawings.length].join('|');
  }

  private spot(id: string, label: string, b: Box, act: () => void, opts: { instant?: boolean; zone?: boolean } = { instant: true }): void {
    this.hotspot(id, label, b.x * K, b.y * K, b.w * K, b.h * K, act, opts);
  }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('craftTitle'), 'craft-menu');
    this.status = this.mirror('p', '', 'craft-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.mode === 'drawing') this.drawingControls();
    else if (g.mode === 'choosing') this.choiceControls();
    else if (g.mode === 'gallery') this.galleryControls();
    else {
      this.panel(960, 300, 452, 330, 0xfff7df, 28, 0.98);
      this.label(t('hungTitle'), 996, 328, 44, '#294d3e', 380, true);
      this.label(t('hungBody'), 998, 400, 21, '#58674f', 380);
      this.button('craft-more', t('drawMore'), 998, 486, 260, () => this.run.choose());
      this.button('craft-pictures', t('actGallery'), 998, 556, 260, () => this.openGallery(), true);
      this.mirror('h2', t('hungTitle'), 'craft-panel-title'); this.mirror('p', t('hungBody'));
    }
  }

  private drawingControls(): void {
    const g = this.run;
    BRUSHES.forEach((b, i) => this.spot(`brush-${b.id}`, words(b.name), brushBox(i), () => g.setBrush(b.id)));
    if (g.tool === 'bucket') PATTERNS.forEach((p, i) => this.spot(`pattern-${p.id}`, words(p.name), patternBox(i), () => g.setPattern(p.id)));
    else {
      [t('sizeThin'), t('sizeMid'), t('sizeThick')].forEach((name, i) => this.spot(`size-${i}`, name, sizeBox(i), () => g.setSize(i)));
      this.spot('craft-sym', g.sym > 1 ? t('symOn').replace('{n}', String(g.sym)) : t('symOff'), SYM_BOX, () => g.cycleSym());
    }
    CRAYONS.forEach((k, i) => this.spot(`crayon-${i}`, `${words(k.name)} ${t('crayonWord')}`, colourBox(i), () => g.setColour(k.colour)));
    STICKER_PAGES.forEach((p, i) => this.spot(`tab-${p}`, PAGE_NAMES[p](), tabBox(i), () => g.setStickerPage(p)));
    // The stickers: fingers carry them onto the paper (the scene's own pointer); the buttons pick one for a tap or a key.
    stickersOn(g.stickerPage).forEach((s, i) => this.spot(`sticker-${s.id}`, words(s.name), cellBox(i), () => g.pickSticker(s.id), { zone: false }));
    ACTIONS.forEach((a, i) => this.spot(`craft-${a}`, a === 'play' && g.alive ? t('actStop') : ACTION_NAMES[a](), actionBox(i), () => this.act(a), { instant: a !== 'hang' && a !== 'new' && a !== 'gallery' }));
    // The chosen sticker's handles, for keyboards and screen readers (fingers use them on the canvas).
    const h = handles(g);
    if (h) {
      const at = (p: Pt): Box => ({ x: PAPER.x + p[0] - h.r, y: PAPER.y + p[1] - h.r, w: h.r * 2, h: h.r * 2 });
      this.spot('sticker-bigger', t('stickerBigger'), at(h.plus), () => g.resizeSelected(1), { zone: false });
      this.spot('sticker-smaller', t('stickerSmaller'), at(h.minus), () => g.resizeSelected(-1), { zone: false });
      this.spot('sticker-bin', t('stickerBin'), at([h.plus[0], Math.max(h.r, h.plus[1] - 40)]), () => g.removeSelected(), { zone: false });
    }
    this.mirror('p', t('craftKeys'));
  }

  private choiceControls(): void {
    const g = this.run, keep = g.picture.marks > 0;
    this.mirror('h2', t('choosePaper'), 'craft-panel-title');
    sheetsOn(g.choosePage, keep).forEach((s, i) => this.spot(sheetId(s), sheetName(s), thumbBox(i), () => { if (s === 'keep') g.keepDrawing(); else g.newPaper(s); }, {}));
    if (sheetPages(keep) > 1) this.spot('sheet-next', t('nextPage'), NEXT_BOX, () => g.turnChoosePage(sheetPages(keep)));
  }

  private galleryControls(): void {
    const g = this.run, p = this.progress;
    this.mirror('h2', t('galleryTitle'), 'craft-panel-title');
    p.drawings.forEach((_, i) => this.spot(`picture-${i}`, `${t('pictureWord')} ${i + 1}`, thumbBox(i), () => g.choosePicture(g.chosen === i ? null : i)));
    ROOMS.forEach((room, i) => this.spot(`hang-${room}`, ROOM_HANG[room](), roomBox(i), () => this.hangIn(room), {}));
    this.spot('picture-bin', t('galleryBin'), BIN_BOX, () => this.removeChosen(), {});
    this.spot('gallery-back', t('galleryBack'), BACK_BOX, () => g.keepDrawing(), {});
  }

  private act(a: Action): void {
    const g = this.run;
    if (a === 'sponge') g.setSponge();
    else if (a === 'undo') g.undo();
    else if (a === 'new') g.choose();
    else if (a === 'gallery') this.openGallery();
    else if (a === 'play') g.toggleAlive();
    else g.hang();
  }

  private openGallery(): void { this.progress = readProgress(); this.run.openGallery(); }

  private hangIn(room: WallRoom): void {
    const i = this.run.chosen;
    if (i === null) { this.sfx.play('boing'); return; }
    this.progress = hangDrawing(i, room);
    this.sfx.play('cheer');
    this.announce(t('hungWhere').replace('{room}', ROOM_NAME[room]()));
  }

  private removeChosen(): void {
    const i = this.run.chosen;
    if (i === null) { this.sfx.play('boing'); return; }
    this.progress = removeDrawing(i);
    this.run.choosePicture(null);
    this.sfx.play('swish');
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    const g = this.run;
    if (g.mode !== 'drawing') return false;
    const stickerChosen = g.selected !== null && g.tool === 'sticker';
    if (key.startsWith('arrow')) {
      if (stickerChosen) { const d = 10; g.nudgeSelected(key === 'arrowleft' ? -d : key === 'arrowright' ? d : 0, key === 'arrowup' ? -d : key === 'arrowdown' ? d : 0); }
      return true;
    }
    if (repeat) return false;
    if (key === ' ') { g.action(); return true; }
    if (/^[0-9]$/.test(key)) { g.setColour(CRAYONS[(Number(key) + 9) % 10].colour); return true; }
    if (key === 'z' || key === 'backspace') { g.undo(); return true; }
    if (key === 'b') { g.nextBrush(); return true; }
    if (key === 's') { g.cycleSym(); return true; }
    if (key === 'p') { g.toggleAlive(); return true; }
    if (key === 'n') { g.choose(); return true; }
    if (key === 'g') { this.openGallery(); return true; }
    if (key === '+' || key === '=') { g.resizeSelected(1); return true; }
    if (key === '-') { g.resizeSelected(-1); return true; }
    if (key === 'delete') { g.removeSelected(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', w: Pt): void {
    const g = this.run;
    if (g.mode !== 'drawing') return;
    const at: Pt = [w[0] - PAPER.x, w[1] - PAPER.y];
    if (kind === 'down') {
      // The chosen sticker's handles.
      const h = handles(g);
      if (h) {
        if (Math.hypot(at[0] - h.plus[0], at[1] - h.plus[1]) <= h.r + 6) { g.resizeSelected(1); return; }
        if (Math.hypot(at[0] - h.minus[0], at[1] - h.minus[1]) <= h.r + 6) { g.resizeSelected(-1); return; }
      }
      // A sticker from the sheet, carried by the finger.
      const cell = stickersOn(g.stickerPage).findIndex((_, i) => within(w, cellBox(i)));
      if (cell >= 0) { g.carryNew(stickersOn(g.stickerPage)[cell].id, at); return; }
      // A press a little outside the sheet still starts on its edge, so lines can run off the paper.
      if (at[0] < -20 || at[1] < -20 || at[0] > PAPER.w + 20 || at[1] > PAPER.h + 20) return;
      g.cursorShown = false;
      g.press(at);
    } else if (kind === 'move') g.drag(at);
    else g.release();
  }

  protected blurred(): void { this.run.release(); }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }

  protected tick(dt: number): void {
    const g = this.run, h = this.held;
    // The keyboard's pen (not while a sticker is chosen: then the arrows move the sticker).
    if (!(g.selected !== null && g.tool === 'sticker')) {
      const dx = Number(h.has('arrowright')) - Number(h.has('arrowleft')), dy = Number(h.has('arrowdown')) - Number(h.has('arrowup'));
      if (dx || dy) g.move(dx * CURSOR_SPEED * dt, dy * CURSOR_SPEED * dt);
    }
    if (g.picture !== this.lastPicture) { this.lastPicture = g.picture; this.letterSince = g.picture.traced.map(() => -1); }
    this.letterSince = this.letterSince.map(s => s < 0 ? s : s + dt);
    if (!g.busy && this.state !== this.shown) this.rebuild();
    for (const e of g.events.splice(0)) {
      const [kind, a] = e.split(':');
      switch (kind) {
        case 'draw': if (a === 'rainbow' || a === 'glitter') this.sfx.play('twinkle'); else if (a === 'stamp') this.sfx.play('plop'); else if (a === 'neon') this.sfx.play('swish'); break;
        case 'fill': this.sfx.play('plop'); break;
        case 'sticker': this.sfx.play('twinkle'); break;
        case 'grab': this.sfx.play('pickup'); break;
        case 'drop': this.sfx.play('plop'); break;
        case 'bin': this.sfx.play('crash'); this.announce(t('stickerBin')); break;
        case 'bigger': this.sfx.play('jump'); this.announce(t('stickerBigger')); break;
        case 'smaller': this.sfx.play('plop'); this.announce(t('stickerSmaller')); break;
        case 'wipe': this.sfx.play('swish'); this.announce(t('wiped')); break;
        case 'undo': case 'page': this.sfx.play('tick'); break;
        case 'paper': this.sfx.play('ready'); break;
        case 'empty': this.sfx.play('boing'); this.announce(t('nothingYet')); break;
        case 'letter': this.sfx.play('ding'); this.letterSince[Number(a)] = 0; this.announce(t('letterDone')); break;
        case 'traced': this.sfx.play('victory'); this.announce(t('nameDone')); break;
        case 'alive': this.sfx.play('cheer'); this.sfx.play('twinkle'); break;
        case 'hung':
          this.sfx.play('victory');
          this.progress = addDrawing(pictureToDataUrl(g.picture)); markDone('pyssel');
          this.announce(t('hungTitle'));
          break;
        case 'colour': { const k = CRAYONS.find(c => c.colour === a); if (k) this.announce(`${words(k.name)} ${t('crayonWord')}`); break; }
        case 'tool': { const b = BRUSHES.find(x => x.id === a); this.announce(b ? words(b.name) : a === 'sponge' ? t('actSponge') : ''); this.sfx.play('tick'); break; }
        case 'stamp': this.announce(words(STAMPS.find(s => s.id === a)!.name)); break;
        case 'size': this.announce([t('sizeThin'), t('sizeMid'), t('sizeThick')][Number(a)]); break;
        case 'sym': this.sfx.play('twinkle'); this.announce(Number(a) > 1 ? t('symOn').replace('{n}', a) : t('symOff')); break;
        case 'pattern': this.announce(words(PATTERNS.find(p => p.id === a)!.name)); break;
        case 'sticker-pick': this.announce(words(STICKERS.find(s => s.id === a)!.name)); break;
        case 'sticker-page': this.sfx.play('tick'); this.announce(PAGE_NAMES[a as StickerPage]()); break;
      }
    }
  }

  protected paintWorld(c: CanvasRenderingContext2D, scale: number): void {
    drawCraft(c, this.run, this.clock, scale, { pictures: this.progress.drawings.map(d => wallPicture(d)), hung: this.progress.hung }, this.letterSince);
  }
}
