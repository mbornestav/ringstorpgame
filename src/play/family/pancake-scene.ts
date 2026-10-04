import { getLang } from '../../side/i18n';
import { formatTime } from '../ui/text';
import type { Pt } from './art';
import { AT, COUNTER, LINES, NAMES, PAN, PAN_AREA, PLANT_BAND, PLANTS, TOP, TOPPING_AT, TUNING, WHISK_AREA, type Ingredient, type Topping } from './games/pannkakor';
import type { Words } from './games/kurragomma';
import { markDone } from './house';
import { PancakeRun } from './pancake-run';
import { drawKitchen } from './pancake-art';
import { K, RoomScene } from './room-scene';
import type { Bubble } from './seek-ui';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: Pannkakor, in the kitchen. Made for fingers first: a touch on an ingredient sends it into
// the bowl, rubbing anywhere in the bowl whisks, a tap on the pan pours, flips and slides the pancake onto the plate, and a
// finger on the pancakes paints the topping on. With a keyboard, Space does the next thing; with a screen reader, every
// step is a button.

const words = (w: Words) => w[getLang()];
const TOPPINGS = Object.keys(TOPPING_AT) as Topping[];
const INGREDIENTS: Ingredient[] = ['egg', 'milk', 'flour'];
const inRect = ([x, y]: Pt, r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
/** Carl-Otto's speech bubbles start over his head. */
const SPEAK: Pt = [80, 214];

export class PancakeScene extends RoomScene {
  run = new PancakeRun();
  private status: HTMLElement | null = null;
  private shown = '';
  private stirAngle = 0;
  private cheerUntil = 0;
  /** The last point of a finger stirring the bowl. */
  private stirFrom: Pt | null = null;

  constructor() { super('Pancake', 'kitchen', 'kitchen', 'hub'); }

  protected reset(): void {
    this.run = new PancakeRun(); this.shown = ''; this.status = null; this.stirAngle = 0; this.cheerUntil = 0; this.stirFrom = null;
    this.run.events.push('start');
  }

  /** What the controls depend on: when it changes, they are rebuilt. */
  private get state(): string { const g = this.run; return `${g.phase}|${g.next}|${g.panAction}|${g.topping}|${g.toppings.length > 0}`; }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('pancakeTitle'), 'pancake-menu');
    this.status = this.mirror('p', '', 'pancake-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    // The pots on the sill can be watered whenever.
    if (g.phase !== 'done') PLANTS.forEach((x, i) => this.hotspot(`plant-${i}`, t('waterPlant'), (x - 26) * K, PLANT_BAND.y * K, 52 * K, PLANT_BAND.h * K, () => g.water(i), { instant: true }));
    if (g.phase === 'batter') {
      for (const what of INGREDIENTS) {
        const w = what === 'egg' ? 128 : 78;
        this.hotspot(`add-${what}`, words(NAMES[what]), (AT[what] - w / 2) * K, (COUNTER - 140) * K, w * K, 150 * K, () => g.add(what), { instant: true });
      }
    } else if (g.phase === 'whisk') {
      this.hotspot('pancake-whisk', t('whiskIt'), WHISK_AREA.x * K, WHISK_AREA.y * K, WHISK_AREA.w * K, WHISK_AREA.h * K, () => g.stir(TUNING.stirTap), { zone: false });
    } else if (g.phase === 'fry') {
      const label = { pour: t('pourIt'), flip: t('flipIt'), plate: t('toPlate') }[g.panAction ?? 'pour'] ?? t('waitIt');
      this.hotspot('pancake-pan', g.panAction ? label : t('waitIt'), PAN_AREA.x * K, PAN_AREA.y * K, PAN_AREA.w * K, PAN_AREA.h * K, () => g.tapPan(), { zone: false });
    } else if (g.phase === 'toppings') {
      TOPPINGS.forEach((k, i) => this.hotspot(`topping-${k}`, `${i + 1}: ${words(NAMES[k])}`, (TOPPING_AT[k] - 42) * K, (COUNTER - 100) * K, 84 * K, 110 * K, () => g.setTopping(k), { instant: true }));
      this.hotspot('pancake-plate', `${t('toppingOn')}: ${words(NAMES[g.topping])}`, (TOP.x - TOP.rx) * K, (TOP.y - TOP.ry * 2) * K, TOP.rx * 2 * K, (COUNTER - TOP.y + TOP.ry * 2) * K, () => g.primary(), { zone: false });
      this.button('pancake-undo', t('undo'), 520, 45, 200, () => g.undoTopping(), true);
      this.button('pancake-done', t('pancakeDoneBtn'), 740, 45, 256, () => g.finish());
    } else this.overlay();
    if (g.phase !== 'done' && !this.touch) {
      this.panel(28, 739, 1100, 47, 0xfff8e5, 16, 0.92);
      this.label(t('pancakeKeys'), 49, 750, 18, '#3e5948', undefined, true);
    }
  }

  private overlay(): void {
    const g = this.run, y = 520, h = 236, body = `${t('pancakeDoneBody')} ${t('tookTime').replace('{time}', formatTime(g.elapsed))}`;
    this.panel(250, y, 940, h, 0xfff7df, 28, 0.98);
    this.label(t('pancakeDone'), 292, y + 28, 42, '#294d3e', 860, true);
    this.label(body, 294, y + 90, 21, '#58674f', 860);
    this.button('pancake-again', t('bakeAgain'), 294, y + h - 76, 260, () => { this.scene.restart(); });
    this.mirror('h2', t('pancakeDone'), 'pancake-panel-title'); this.mirror('p', body);
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    const g = this.run;
    if (key.startsWith('arrow') && g.phase === 'whisk') { g.stir(TUNING.stirTap * 0.6); return true; }
    if (repeat) return false;
    if ((key === ' ' || key === 'enter' || key === 'e') && g.phase !== 'done') { g.primary(); return true; }
    if (/^[1-5]$/.test(key) && g.phase === 'toppings') { g.setTopping(TOPPINGS[Number(key) - 1]); return true; }
    if ((key === 'z' || key === 'backspace') && g.phase === 'toppings') { g.undoTopping(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', at: Pt): void {
    const g = this.run;
    if (kind === 'up') { this.stirFrom = null; g.lift(); return; }
    if (g.phase === 'batter' && kind === 'down' && inRect(at, WHISK_AREA)) { const n = g.next; if (n) g.add(n); }
    else if (g.phase === 'whisk' && inRect(at, WHISK_AREA)) {
      // Any rubbing in the bowl whisks: round and round, back and forth, or tapping.
      if (kind === 'down') { g.stir(TUNING.stirTap * 0.5); this.stirFrom = at; }
      else if (this.stirFrom) {
        const d = Math.hypot(at[0] - this.stirFrom[0], at[1] - this.stirFrom[1]);
        g.stirBy(d); this.stirAngle += d / 40; this.stirFrom = at;
      }
    } else if (g.phase === 'fry' && kind === 'down' && inRect(at, PAN_AREA)) g.tapPan();
    else if (g.phase === 'toppings') {
      const dx = at[0] - TOP.x, dy = at[1] - TOP.y, onPlate = Math.hypot(dx / (TOP.rx * 1.15), dy / (TOP.ry * 2.2)) <= 1;
      if (kind === 'down' && onPlate) g.paint(dx, dy, true);
      else if (kind === 'move') g.paint(dx, dy, false);
    }
  }

  protected blurred(): void { this.stirFrom = null; this.run.lift(); }

  /** A label over the pan saying what a tap does now ("Vänta…" while the first side cooks without bubbles). */
  protected marks(): Bubble[] {
    const g = this.run;
    if (g.phase !== 'fry') return [];
    const a = g.panAction, ready = a !== 'flip' || g.pan.t >= TUNING.bubbles;
    const text = a === 'pour' ? t('pourIt') : a === 'flip' ? (ready ? t('flipIt') : t('waitIt')) : a === 'plate' ? t('toPlate') : '';
    return text ? [{ text, x: PAN.x, y: PAN.y - 140, until: 0, tone: ready ? 'look' : 'surprise' }] : [];
  }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }
  private line(w: Words, x = SPEAK[0], y = SPEAK[1], seconds = 2.6): void { this.bubbles.clear('friend'); this.say(words(w), x, y, 'friend', seconds); this.announce(words(w)); }
  private cheer(): void { this.cheerUntil = this.clock + 1.2; }

  protected tick(dt: number): void {
    const g = this.run;
    g.update(dt);
    if (g.phase === 'whisk' && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].some(k => this.held.has(k))) { g.stir(dt * 0.25); this.stirAngle += dt * 8; }
    if (this.state !== this.shown) this.rebuild();
    for (const e of g.events.splice(0)) {
      const [kind, a, b] = e.split(':');
      if (kind === 'start') this.line(LINES.start, SPEAK[0], SPEAK[1], 4);
      else if (kind === 'add') { if (a === 'egg') this.line(LINES.eggs[Number(b) - 1]); else this.line(a === 'milk' ? LINES.milk : LINES.flour); this.sfx.play('pickup'); }
      else if (kind === 'in') this.sfx.play(a === 'egg' ? 'crack' : a === 'milk' ? 'glug' : 'atjoo');
      else if (kind === 'whisk') { this.line(LINES.whisk, SPEAK[0], SPEAK[1], 3.5); this.sfx.play('ready'); }
      else if (kind === 'stir') { this.sfx.play('swish'); this.stirAngle += 0.4; }
      else if (kind === 'smooth') { this.line(LINES.smooth); this.sfx.play('cheer'); this.cheer(); }
      else if (kind === 'pour') this.sfx.play('glug');
      else if (kind === 'bubbles') this.sfx.play('blub');
      else if (kind === 'flip') this.sfx.play('jump');
      else if (kind === 'landed') { this.line(LINES[a as 'pale' | 'golden' | 'brown']); this.sfx.play('plop'); if (a === 'golden') this.cheer(); }
      else if (kind === 'slide') this.sfx.play('swish');
      else if (kind === 'stacked') { this.say(words(LINES.count[Number(a) - 1]), AT.plate, COUNTER - 120, 'surprise', 1.6); this.sfx.play('tick'); }
      else if (kind === 'toppings') { this.line(LINES.toppings, SPEAK[0], SPEAK[1], 4); this.sfx.play('cheer'); this.cheer(); }
      else if (kind === 'pick') { this.sfx.play('tick'); this.announce(words(NAMES[a as Topping])); }
      else if (kind === 'topping') this.sfx.play('plop');
      else if (kind === 'undo') this.sfx.play('tick');
      else if (kind === 'water') { this.say(words(LINES.plant), PLANTS[Number(a)], 200, 'surprise', 2); this.sfx.play('twinkle'); }
      else if (kind === 'done') { this.sfx.play('victory'); markDone('pannkakor'); this.cheer(); this.bubbles.clear(); }
    }
    if (g.phase === 'fry' && g.pan.state === 'empty' && g.panAction === 'pour' && g.idle > 2 && g.idle - dt <= 2) this.line(LINES.pour);
  }

  protected paintWorld(c: CanvasRenderingContext2D): void { drawKitchen(c, { run: this.run, stirAngle: this.stirAngle, cheerUntil: this.cheerUntil }, this.clock); }
}
