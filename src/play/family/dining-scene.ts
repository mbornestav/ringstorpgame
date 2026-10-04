import { getLang } from '../../side/i18n';
import type { Pt } from './art';
import { drawDining } from './dining-art';
import { DiningRun, slotAt } from './dining-run';
import { CANDLES, COUNT, FOOD_AT, LINES, NAMES, PLACES, SOURCE, WARES } from './games/duka';
import { LINES as MORNING_LINES } from './games/godmorgon';
import type { Words } from './games/kurragomma';
import { markDone, readProgress } from './house';
import { K, RoomScene } from './room-scene';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: Duka bordet, in the dining room. For fingers first: a plate, a glass or a knife and fork is
// taken from the trolley's stacks with a finger and put on a place (or the stack is just tapped, and the next one goes to
// the next empty place by itself); then taps on the candlestick light its candles, a tap on the food brings it to the
// table, and the family sits down to eat. With a keyboard, Space does the next thing. The next step of the evening is movie
// night, in the room next door.

const words = (w: Words) => w[getLang()];
const SPEAK: Pt = [116, 330];

export class DiningScene extends RoomScene {
  run = new DiningRun();
  private status: HTMLElement | null = null;
  private shown = '';

  constructor() { super('Dining', 'dining', 'dining', 'hub'); }

  protected reset(): void {
    // The pancakes come in if Carl-Otto has made them in the kitchen; otherwise it is meatballs.
    this.run = new DiningRun(readProgress().done.includes('pannkakor') ? 'pancakes' : 'meatballs');
    this.shown = ''; this.status = null;
    this.run.events.push('start');
  }

  /** Only what changes the controls (a rebuild costs a frame of taps on new zones). */
  private get state(): string { const g = this.run; return `${g.phase}|${WARES.map(w => g.left(w) > 0).join()}`; }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('diningTitle'), 'dining-menu');
    this.status = this.mirror('p', '', 'dining-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.phase === 'set') {
      // Screen readers and keyboards: a button per stack (fingers take from the stacks on the canvas).
      for (const w of WARES) if (g.left(w) > 0) this.hotspot(`ware-${w}`, words(NAMES[w]), (SOURCE[w][0] - 46) * K, (SOURCE[w][1] - 60) * K, 92 * K, 72 * K, () => g.send(w), { zone: false });
    } else if (g.phase === 'candles') this.hotspot('dining-candles', t('lightCandles'), (CANDLES.x - 56) * K, (CANDLES.y - 50) * K, 112 * K, 80 * K, () => g.light(), { instant: true });
    else if (g.phase === 'serve') this.hotspot('dining-food', t('serveFood'), (FOOD_AT[0] - 60) * K, (FOOD_AT[1] - 50) * K, 120 * K, 70 * K, () => g.serve(), { instant: true });
    else if (g.phase === 'done') this.overlay();
    if (!this.touch && g.phase !== 'eat' && g.phase !== 'done') {
      this.panel(28, 739, 520, 47, 0xfff8e5, 16, 0.92);
      this.label(t('homecomingKeys'), 49, 750, 18, '#3e5948', undefined, true);
    }
  }

  private overlay(): void {
    const y = 520, h = 236;
    this.panel(250, y, 940, h, 0xfff7df, 28, 0.98);
    this.label(t('diningDone'), 292, y + 28, 42, '#294d3e', 860, true);
    this.label(t('diningDoneBody'), 294, y + 90, 21, '#58674f', 860);
    this.button('dining-movie', t('toMovie'), 294, y + h - 80, 340, () => this.scene.start('Movie'));
    this.button('dining-again', t('goodnightAgain'), 660, y + h - 80, 260, () => this.scene.restart(), true);
    this.mirror('h2', t('diningDone'), 'dining-panel-title'); this.mirror('p', t('diningDoneBody'));
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    if (repeat || this.run.phase === 'eat' || this.run.phase === 'done') return false;
    if (key === ' ' || key === 'enter') { this.run.primary(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', at: Pt): void {
    const g = this.run;
    if (kind === 'down') g.grab(at); else if (kind === 'move') g.drag(at); else g.drop(at);
  }

  protected blurred(): void { const h = this.run.held; if (h) this.run.drop(h.at); }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }
  private line(w: Words, at: Pt = SPEAK, tone: 'friend' | 'surprise' = 'friend', seconds = 2.8): void { this.bubbles.clear(tone); this.say(words(w), at[0], at[1], tone, seconds); this.announce(words(w)); }

  protected tick(dt: number): void {
    const g = this.run;
    g.update(dt);
    if (this.state !== this.shown) this.rebuild();
    for (const e of g.events.splice(0)) {
      const [kind, a, b] = e.split(':');
      if (kind === 'start') this.line(LINES.start, SPEAK, 'friend', 4);
      else if (kind === 'grab') this.sfx.play('pickup');
      else if (kind === 'wrong') { this.sfx.play('boing'); this.line(LINES.wrong); }
      else if (kind === 'laid') this.sfx.play(b === 'glass' ? 'ding' : 'plop');
      else if (kind === 'count' && a === 'plate') { const n = Number(b), place = PLACES[n - 1]; const [x, y] = slotAt(place.id, 'plate'); this.say(words(COUNT[n - 1]), x, y - 30, 'surprise', 1.4); }
      else if (kind === 'set') { this.sfx.play('cheer'); this.line(LINES.set, SPEAK, 'friend', 3.5); }
      else if (kind === 'candle') { this.sfx.play('twinkle'); const n = Number(a); this.say(words(MORNING_LINES.count[n - 1]), CANDLES.x, CANDLES.y - 60, 'surprise', 0.9); }
      else if (kind === 'candles') this.line(LINES.candles, SPEAK, 'friend', 3);
      else if (kind === 'serve') { this.sfx.play('swish'); this.line(g.food === 'pancakes' ? LINES.pancakes : LINES.meatballs); }
      else if (kind === 'eat') { this.sfx.play('cheer'); this.line(LINES.eat, [480, 190], 'surprise', 3); }
      else if (kind === 'thanks') { this.sfx.play('victory'); markDone('duka'); this.bubbles.clear(); this.line(LINES.thanks, [180, 300], 'friend', 3); }
    }
  }

  protected paintWorld(c: CanvasRenderingContext2D): void { drawDining(c, this.run, this.clock); }
}
