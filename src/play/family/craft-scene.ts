import { getLang } from '../../side/i18n';
import type { Pt } from './art';
import { crayonBox, drawCraft, pictureToDataUrl, stickerBox, thumbBox } from './craft-art';
import { CURSOR_SPEED, CraftRun, type Tool } from './craft-run';
import type { Words } from './games/kurragomma';
import { CRAYONS, PAGES, PAPER, STICKERS, type PageId } from './games/pyssel';
import { addDrawing, markDone } from './house';
import { K, RoomScene } from './room-scene';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: Pysselhörnan, the craft table in the hall. Draw with the crayons, fill the parts of a
// colouring page with the bucket, put stickers on, and put the picture up: it then hangs on the wall in the living room
// (Filmkväll). By pointer or touch on the paper; by keyboard, the arrows move a pen and Space puts it down.

const words = (w: Words) => w[getLang()];
const TOOLS: Array<[Tool, () => string]> = [['crayon', () => t('toolCrayon')], ['bucket', () => t('toolBucket')], ['eraser', () => t('toolEraser')]];
const SIZE_NAMES = [() => t('sizeThin'), () => t('sizeMid'), () => t('sizeThick')];

export class CraftScene extends RoomScene {
  run = new CraftRun();
  private status: HTMLElement | null = null;
  private shown = '';

  constructor() { super('Craft', 'hall', 'craft', 'hub'); }

  protected reset(): void { this.run = new CraftRun(); this.shown = ''; this.status = null; }

  /** What the interface shows: when it changes, the controls are rebuilt. */
  private get state(): string {
    const g = this.run;
    return `${g.mode}|${g.tool}|${g.colour}|${g.size}|${g.sticker}|${g.picture.marks > 0}`;
  }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('craftTitle'), 'craft-menu');
    this.status = this.mirror('p', '', 'craft-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.mode === 'drawing') {
      this.button('craft-hang', t('hang'), 760, 45, 236, () => this.hang());
      CRAYONS.forEach((k, i) => {
        const b = crayonBox(i);
        this.hotspot(`crayon-${i}`, `${words(k.name)} ${t('crayonWord')}`, (b.x - 16) * K, b.y * K, (b.w + 16) * K, b.h * K, () => this.run.setColour(k.colour));
      });
      STICKERS.forEach((s, i) => { const b = stickerBox(i); this.hotspot(`sticker-${s.id}`, words(s.name), b.x * K, b.y * K, b.w * K, b.h * K, () => this.run.setSticker(s.id)); });
      TOOLS.forEach(([tool, name], i) => this.button(`tool-${tool}`, name(), 978 + i * 147, 508, 138, () => this.run.setTool(tool), g.tool !== tool));
      SIZE_NAMES.forEach((name, i) => this.button(`size-${i}`, name(), 978 + i * 147, 576, 138, () => this.run.setSize(i), g.size !== i || g.tool === 'bucket' || g.tool === 'sticker'));
      this.button('craft-undo', t('undo'), 978, 644, 205, () => this.run.undo(), true);
      this.button('craft-new', t('newPaper'), 1195, 644, 223, () => this.run.choose(), true);
      if (!this.touch) {
        this.panel(970, 716, 448, 66, 0xfff8e5, 14, 0.92);
        this.label(t('craftKeys'), 986, 724, 14, '#3e5948', 420, true);
      }
    } else if (g.mode === 'choosing') {
      this.panel(970, 540, 448, 110, 0xfff7df, 22, 0.97);
      this.label(t('choosePaper'), 996, 574, 30, '#294d3e', 400, true);
      this.mirror('h2', t('choosePaper'), 'craft-panel-title');
      const sheets: Array<[string, string, () => void]> = [
        ['paper-blank', t('blankPaper'), () => this.run.newPaper(null)],
        ...PAGES.map(p => [`paper-${p.id}`, words(p.name), () => this.run.newPaper(p.id as PageId)] as [string, string, () => void]),
      ];
      if (g.picture.marks) sheets.push(['paper-keep', t('keepDrawing'), () => this.run.keepDrawing()]);
      sheets.forEach(([id, name, act], i) => { const b = thumbBox(i); this.button(id, name, b.x * K, (b.y + b.h + 8) * K, b.w * K, act, true); });
    } else {
      this.panel(960, 300, 452, 330, 0xfff7df, 28, 0.98);
      this.label(t('hungTitle'), 996, 328, 44, '#294d3e', 380, true);
      this.label(t('hungBody'), 998, 400, 21, '#58674f', 380);
      this.button('craft-more', t('drawMore'), 998, 540, 260, () => this.run.choose());
      this.mirror('h2', t('hungTitle'), 'craft-panel-title'); this.mirror('p', t('hungBody'));
    }
  }

  private hang(): void { this.run.hang(); }

  protected keyDown(key: string, repeat: boolean): boolean {
    const g = this.run;
    if (key.startsWith('arrow')) return g.mode === 'drawing';
    if (repeat) return false;
    if (key === ' ' && g.mode === 'drawing') { g.action(); return true; }
    if (/^[0-9]$/.test(key) && g.mode === 'drawing') { g.setColour(CRAYONS[(Number(key) + 9) % 10].colour); return true; }
    if ((key === 'z' || key === 'backspace') && g.mode === 'drawing') { g.undo(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', [wx, wy]: Pt): void {
    const g = this.run, at: Pt = [wx - PAPER.x, wy - PAPER.y];
    if (kind === 'down') {
      if (g.mode === 'choosing') {
        const i = [0, 1, 2, 3, 4, 5].find(n => { const b = thumbBox(n); return wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h; });
        if (i === undefined) return;
        if (i === 0) g.newPaper(null); else if (i <= PAGES.length) g.newPaper(PAGES[i - 1].id); else if (g.picture.marks) g.keepDrawing();
        return;
      }
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
    const dx = Number(h.has('arrowright')) - Number(h.has('arrowleft')), dy = Number(h.has('arrowdown')) - Number(h.has('arrowup'));
    if (dx || dy) g.move(dx * CURSOR_SPEED * dt, dy * CURSOR_SPEED * dt);
    if (this.state !== this.shown) this.rebuild();
    for (const e of g.events.splice(0)) {
      if (e === 'fill') this.sfx.play('plop');
      else if (e === 'sticker') this.sfx.play('twinkle');
      else if (e === 'undo') this.sfx.play('tick');
      else if (e === 'paper') { this.sfx.play('ready'); this.announce(g.picture.page ? words(g.picture.page.name) : t('blankPaper')); }
      else if (e === 'empty') { this.sfx.play('boing'); this.announce(t('nothingYet')); }
      else if (e === 'hung') {
        this.sfx.play('victory');
        addDrawing(pictureToDataUrl(g.picture)); markDone('pyssel');
        this.announce(t('hungTitle'));
      } else if (e.startsWith('colour:')) { const k = CRAYONS.find(c => c.colour === e.slice(7)); if (k) this.announce(`${words(k.name)} ${t('crayonWord')}`); }
      else if (e.startsWith('tool:')) this.announce(TOOLS.find(([tool]) => tool === e.slice(5))![1]());
      else if (e.startsWith('size:')) this.announce(SIZE_NAMES[Number(e.slice(5))]());
      else if (e.startsWith('sticker-pick:')) this.announce(words(STICKERS.find(s => s.id === e.slice(13))!.name));
    }
  }

  protected paintWorld(c: CanvasRenderingContext2D, scale: number): void { drawCraft(c, this.run, this.clock, scale); }
}
