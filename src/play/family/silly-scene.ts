import { getLang } from '../../side/i18n';
import type { Words } from './games/kurragomma';
import { FACES, ITEMS, LINES, type ItemId } from './games/toa';
import { addDrawing, markDone } from './house';
import { K, RoomScene } from './room-scene';
import { drawToilet, photoDataUrl, trayAt } from './silly-art';
import { SillyRun } from './silly-run';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: Fånig i spegeln, in the little toilet. A tap on a thing on the tray puts it on Carl-Otto in
// the mirror (or takes it off); "Ny min" pulls the next silly face; "Ta kort!" takes a photo, which hangs on the walls of
// the house like a drawing from the craft corner. Nothing to win. With a keyboard, 1–9 put things on, F pulls a face and P
// takes the photo.

const words = (w: Words) => w[getLang()];

export class SillyScene extends RoomScene {
  run = new SillyRun();
  private status: HTMLElement | null = null;

  constructor() { super('Silly', 'toilet', 'toilet', 'hub'); }

  protected reset(): void { this.run = new SillyRun(); this.status = null; this.run.events.push('start'); }

  protected build(): void {
    const g = this.run;
    this.topBar(t('sillyTitle'), 'silly-menu');
    this.status = this.mirror('p', '', 'silly-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    ITEMS.forEach((it, i) => { const [x, y] = trayAt(i); this.hotspot(`wear-${it.id}`, `${i + 1}: ${words(it.name)}`, (x - 48) * K, (y - 34) * K, 96 * K, 96 * K, () => g.toggle(it.id), { instant: true }); });
    // Over the pink wall on the right: a new face, the photo, and taking everything off.
    this.button('silly-face', t('sillyFace'), 1112, 500, 290, () => g.nextFace(), true);
    this.button('silly-photo', t('sillyPhoto'), 1112, 420, 290, () => g.photo());
    this.button('silly-clear', t('sillyClear'), 38, 500, 290, () => g.clear(), true);
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    if (repeat) return false;
    const g = this.run;
    if (/^[1-9]$/.test(key)) { g.toggle(ITEMS[Number(key) - 1].id); return true; }
    if (key === 'f' || key === ' ') { g.nextFace(); return true; }
    if (key === 'p' || key === 'enter') { g.photo(); return true; }
    if (key === 'backspace' || key === 'delete') { g.clear(); return true; }
    return false;
  }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }

  protected tick(dt: number): void {
    const g = this.run;
    g.update(dt);
    for (const e of g.events.splice(0)) {
      const [kind, a] = e.split(':');
      if (kind === 'start') { this.say(words(LINES.start), 480, 60, 'friend', 4); this.announce(words(LINES.start)); }
      else if (kind === 'on' || kind === 'off') { this.sfx.play(kind === 'on' ? 'boing' : 'plop'); this.announce(`${words(ITEMS.find(i => i.id === (a as ItemId))!.name)}${kind === 'off' ? ` – ${t('sillyOff')}` : ''}`); }
      else if (kind === 'face') { this.sfx.play('giggle'); const f = FACES[Number(a)]; this.bubbles.clear('surprise'); this.say(words(f.name), 650, 150, 'surprise', 1.4); this.announce(words(f.name)); }
      else if (kind === 'clear') this.sfx.play('swish');
      else if (kind === 'first' || kind === 'photo') {
        this.sfx.play('cash');
        addDrawing(photoDataUrl(g));
        if (kind === 'first') markDone('spegel');
        this.bubbles.clear('friend'); this.say(words(LINES.photo), 480, 60, 'friend', 3); this.announce(words(LINES.photo));
      }
    }
  }

  protected paintWorld(c: CanvasRenderingContext2D): void { drawToilet(c, this.run, this.clock); }
}
