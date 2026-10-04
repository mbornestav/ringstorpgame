import { EGGS, PANCAKES, PLANTS, TOP, TUNING, type Doneness, type Ingredient, type Topping } from './games/pannkakor';

// Pannkakor's rules, without Phaser: three eggs, the milk and the flour into the bowl (in any order), whisk until the batter
// is smooth, then five pancakes, each poured, flipped and slid onto the plate, and toppings on top. Nothing can go wrong: a
// pancake flipped early is a little pale and one flipped late a little brown, and both are "yummy anyway". The pots of
// herbs on the windowsill can be watered at any time.

export type Phase = 'batter' | 'whisk' | 'fry' | 'toppings' | 'done';
export type PanState = 'empty' | 'pouring' | 'side1' | 'flying' | 'side2' | 'sliding';
/** What sparkles when nothing has happened for a while. */
export type HintTarget = Ingredient | 'bowl' | 'pan' | 'plate' | 'done';

export interface Pan {
  state: PanState;
  /** Seconds in this state. */
  t: number;
  /** How long the first side cooked (set when flipped). */
  side1: number;
}
/** A topping on the top pancake, relative to its middle. */
export interface Placed { kind: Topping; x: number; y: number; turn: number }
/** An ingredient on its way into the bowl. */
export interface Pour { what: Ingredient; since: number; landed: boolean }

export const donenessOf = (side1: number): Doneness => side1 < TUNING.bubbles ? 'pale' : side1 < TUNING.brown ? 'golden' : 'brown';

export class PancakeRun {
  phase: Phase = 'batter';
  eggs = 0;
  milk = false;
  flour = false;
  pours: Pour[] = [];
  /** How smooth the batter is, 0 (lumpy) to 1. */
  smooth = 0;
  pan: Pan = { state: 'empty', t: 0, side1: 0 };
  stack: Doneness[] = [];
  toppings: Placed[] = [];
  topping: Topping = 'jam';
  /** Seconds since each pot was watered, or -1 while it is thirsty. */
  plants: number[] = PLANTS.map(() => -1);
  elapsed = 0;
  /** Seconds since the last thing done. */
  idle = 0;
  /** Sound and reaction cues since the scene last read them. */
  events: string[] = [];
  private brush: [number, number] | null = null;
  private random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; }

  /** The next ingredient the recipe still needs, if any. */
  get next(): Ingredient | null { return this.eggs < EGGS ? 'egg' : !this.milk ? 'milk' : !this.flour ? 'flour' : null; }
  /** Pancakes' worth of batter still in the bowl. */
  get batterLeft(): number { return PANCAKES - this.stack.length - (this.pan.state === 'empty' ? 0 : 1); }
  /** What a tap on the pan would do now. */
  get panAction(): 'pour' | 'flip' | 'plate' | null {
    if (this.phase !== 'fry') return null;
    const p = this.pan;
    if (p.state === 'empty') return this.batterLeft > 0 ? 'pour' : null;
    if (p.state === 'side1') return 'flip';
    if (p.state === 'side2' && p.t >= TUNING.side2) return 'plate';
    return null;
  }
  get hint(): HintTarget | null {
    if (this.idle < TUNING.hintAfter) return null;
    if (this.phase === 'batter') return this.next;
    if (this.phase === 'whisk') return 'bowl';
    if (this.phase === 'fry') return this.panAction === 'flip' && this.pan.t < TUNING.bubbles ? null : this.panAction ? 'pan' : null;
    if (this.phase === 'toppings') return this.toppings.length >= 6 ? 'done' : 'plate';
    return null;
  }

  /** An ingredient into the bowl. False when it is not needed (already in, or the batter is done). */
  add(what: Ingredient): boolean {
    if (this.phase !== 'batter') return false;
    if (what === 'egg') { if (this.eggs >= EGGS) return false; this.eggs++; this.events.push(`add:egg:${this.eggs}`); }
    else if (what === 'milk') { if (this.milk) return false; this.milk = true; this.events.push('add:milk'); }
    else { if (this.flour) return false; this.flour = true; this.events.push('add:flour'); }
    this.pours.push({ what, since: 0, landed: false });
    this.idle = 0;
    return true;
  }

  /** Whisking: `amount` is a share of the work (1 makes it smooth). */
  stir(amount: number): void {
    if (this.phase !== 'whisk' || amount <= 0) return;
    const before = this.smooth;
    this.smooth = Math.min(1, this.smooth + amount);
    this.idle = 0;
    // A cue every tenth of the way, for a swish.
    if (Math.floor(before * 10) !== Math.floor(this.smooth * 10)) this.events.push('stir');
    if (this.smooth >= 1) { this.phase = 'fry'; this.events.push('smooth'); }
  }
  /** Whisking by moving a finger or the mouse `distance` world pixels in the bowl. */
  stirBy(distance: number): void { this.stir(distance / TUNING.whiskWork); }

  /** A tap on the pan: pour, flip or slide onto the plate, whichever fits. Returns what it did. */
  tapPan(): 'pour' | 'flip' | 'plate' | null {
    const action = this.panAction, p = this.pan;
    if (action === 'pour') { this.pan = { state: 'pouring', t: 0, side1: 0 }; this.events.push('pour'); }
    else if (action === 'flip') { p.side1 = p.t; p.state = 'flying'; p.t = 0; this.events.push('flip'); }
    else if (action === 'plate') { p.state = 'sliding'; p.t = 0; this.events.push('slide'); }
    if (action) this.idle = 0;
    return action;
  }

  setTopping(kind: Topping): void { this.topping = kind; this.brush = null; this.events.push(`pick:${kind}`); }

  /** Puts the chosen topping on the top pancake at (x, y) from its middle, kept on the pancake. */
  place(x: number, y: number): boolean {
    if (this.phase !== 'toppings' || this.toppings.length >= TUNING.maxToppings) return false;
    // Inside the pancake's face (a little in from its edge).
    const k = Math.hypot(x / (TOP.rx * 0.86), y / (TOP.ry * 0.8));
    if (k > 1) { x /= k; y /= k; }
    this.toppings.push({ kind: this.topping, x, y, turn: (this.random() - 0.5) * 1.2 });
    this.idle = 0;
    this.events.push(`topping:${this.topping}`);
    return true;
  }

  /** A finger drawn across the pancake leaves a line of toppings: `start` on touching down. */
  paint(x: number, y: number, start: boolean): void {
    if (this.phase !== 'toppings') return;
    if (start || !this.brush || Math.hypot(x - this.brush[0], y - this.brush[1]) >= TUNING.toppingStep) {
      if (this.place(x, y)) this.brush = [x, y];
    }
  }
  lift(): void { this.brush = null; }

  undoTopping(): void { if (this.phase === 'toppings' && this.toppings.pop()) this.events.push('undo'); }

  /** The toppings are on: the pancakes are ready. */
  finish(): boolean {
    if (this.phase !== 'toppings') return false;
    this.phase = 'done'; this.lift();
    this.events.push('done');
    return true;
  }

  water(i: number): void {
    if (i < 0 || i >= this.plants.length) return;
    this.plants[i] = 0;
    this.events.push(`water:${i}`);
  }

  /** Space, Enter or E: the next thing to do. */
  primary(): void {
    if (this.phase === 'batter') { const n = this.next; if (n) this.add(n); }
    else if (this.phase === 'whisk') this.stir(TUNING.stirTap);
    else if (this.phase === 'fry') this.tapPan();
    else if (this.phase === 'toppings') this.place((this.random() - 0.5) * TOP.rx * 1.5, (this.random() - 0.5) * TOP.ry * 1.4);
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt); left -= dt; }
  }

  private step(dt: number): void {
    this.elapsed += dt; this.idle += dt;
    this.plants = this.plants.map(s => s < 0 ? s : s + dt);
    for (const p of this.pours) {
      p.since += dt;
      if (!p.landed && p.since >= TUNING.into) { p.landed = true; this.events.push(`in:${p.what}`); }
    }
    this.pours = this.pours.filter(p => p.since < TUNING.into + 0.6);
    if (this.phase === 'batter' && !this.next && this.pours.every(p => p.landed)) { this.phase = 'whisk'; this.events.push('whisk'); }
    if (this.phase !== 'fry') return;
    const p = this.pan;
    p.t += dt;
    if (p.state === 'pouring' && p.t >= TUNING.pour) { p.state = 'side1'; p.t = 0; }
    else if (p.state === 'side1' && p.t - dt < TUNING.bubbles && p.t >= TUNING.bubbles) this.events.push('bubbles');
    else if (p.state === 'flying' && p.t >= TUNING.flight) { p.state = 'side2'; p.t = 0; this.events.push(`landed:${donenessOf(p.side1)}`); }
    else if (p.state === 'side2' && p.t >= TUNING.autoPlate) { p.state = 'sliding'; p.t = 0; this.events.push('slide'); }
    else if (p.state === 'sliding' && p.t >= TUNING.slide) {
      this.stack.push(donenessOf(p.side1));
      this.pan = { state: 'empty', t: 0, side1: 0 };
      this.events.push(`stacked:${this.stack.length}`);
      if (this.stack.length === PANCAKES) { this.phase = 'toppings'; this.idle = 0; this.events.push('toppings'); }
    }
  }
}
