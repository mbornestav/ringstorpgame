import { CLOSE_FACE, HANDS, TUNING, type Pt } from './games/badrum';
import { TOOTH_SPOTS, onFace } from './mirror-face';

// Tänder och tvål's rules, without Phaser: up on the stool, two pumps of soap, rub the hands until they are all bubbles (the
// bubbles float up and can be popped), rinse, dry on the towel; then toothpaste on the brush, brush away the eight sugar
// bugs (friendly, giggly, and gone into the sink when brushed), rinse the mouth, and smile. Nothing can go wrong: every
// step waits, and the next thing to touch sparkles.

export type Phase = 'stool' | 'soap' | 'rub' | 'rinse' | 'dry' | 'paste' | 'brush' | 'spit' | 'done';
export interface Bubble { x: number; y: number; r: number; vx: number; age: number }
export interface Bug { at: Pt; colour: string; hp: number; /** Seconds since brushed away (−1: still on the tooth). */ gone: number }

const COLOURS = ['#f07fb0', '#62b046', '#f2c230', '#8a56b8', '#f08a2c', '#6fbde8', '#e2432f', '#62b046'];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export class BathRun {
  phase: Phase = 'stool';
  /** Seconds since he stepped up (the face rises into the mirror). */
  up = -1;
  pumps = 0;
  /** The soap lather on the hands, 0–1; and the water running (seconds, −1: off). */
  lather = 0;
  water = -1;
  bubbles: Bubble[] = [];
  bugs: Bug[] = TOOTH_SPOTS.map((p, i) => ({ at: onFace(CLOSE_FACE.x, CLOSE_FACE.y, CLOSE_FACE.k, p), colour: COLOURS[i], hp: 1, gone: -1 }));
  /** The toothbrush, where a finger holds it (null: in the cup), and the foam it has made. */
  brush: Pt | null = null;
  foam = 0;
  done = -1;
  elapsed = 0;
  idle = 0;
  events: string[] = [];
  private rubbed = 0;
  private scrubbed = 0;
  private random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; }

  get left(): Bug[] { return this.bugs.filter(b => b.gone < 0); }
  get won(): boolean { return this.phase === 'done'; }
  get hint(): Phase | null { return this.idle >= TUNING.hintAfter && this.phase !== 'done' ? this.phase : null; }

  private next(p: Phase, event: string): void { this.phase = p; this.idle = 0; this.events.push(event); }

  stepUp(): void { if (this.phase === 'stool') { this.up = 0; this.next('soap', 'up'); } }
  pump(): void {
    if (this.phase !== 'soap') return;
    this.pumps++; this.idle = 0; this.events.push(`pump:${this.pumps}`);
    if (this.pumps >= TUNING.pumps) this.next('rub', 'rub');
  }
  /** Rubbing the hands: `distance` world pixels of a finger (or the keyboard's share). */
  rub(distance: number): void {
    if (this.phase !== 'rub' || distance <= 0) return;
    this.idle = 0;
    this.lather = Math.min(1, this.lather + distance / TUNING.rubWork);
    this.rubbed += distance;
    while (this.rubbed > 60) {
      this.rubbed -= 60; this.events.push('rubbing');
      if (this.bubbles.length < TUNING.bubbles) this.bubbles.push({ x: HANDS.x + 30 + this.random() * (HANDS.w - 60), y: HANDS.y + 20, r: 8 + this.random() * 12, vx: (this.random() - 0.5) * 30, age: 0 });
    }
    if (this.lather >= 1) this.next('rinse', 'lather');
  }
  /** A tap on a bubble pops it. */
  pop(at: Pt): boolean {
    const i = this.bubbles.findIndex(b => dist([b.x, b.y], at) <= b.r + 14);
    if (i < 0) return false;
    this.bubbles.splice(i, 1); this.events.push('pop');
    return true;
  }
  rinse(): void { if (this.phase === 'rinse' && this.water < 0) { this.water = 0; this.idle = 0; this.events.push('water'); } }
  dry(): void { if (this.phase === 'dry') this.next('paste', 'dried'); }
  paste(): void { if (this.phase === 'paste') this.next('brush', 'brush'); }

  /** The brush held at a point (a finger on the mirror), moved `distance` since the last point: it scrubs the bugs near it. */
  scrub(at: Pt, distance: number): void {
    if (this.phase !== 'brush') return;
    this.brush = at;
    if (distance <= 0) return;
    this.idle = 0;
    this.foam = Math.min(1, this.foam + distance / 2400);
    this.scrubbed += distance;
    while (this.scrubbed > TUNING.noteEvery) { this.scrubbed -= TUNING.noteEvery; this.events.push('note'); }
    for (const b of this.left) if (dist(b.at, at) <= TUNING.scrubReach) this.hurt(b, distance / TUNING.bugWork);
  }
  lift(): void { this.brush = null; }

  /** The keyboard (or a screen reader's button) brushes the next bug a bit. */
  scrubNext(): void {
    if (this.phase !== 'brush') return;
    const b = this.left[0];
    if (!b) return;
    this.idle = 0; this.brush = b.at; this.foam = Math.min(1, this.foam + 0.05);
    this.events.push('note');
    this.hurt(b, TUNING.scrubTap);
  }

  private hurt(b: Bug, amount: number): void {
    b.hp -= amount;
    if (b.hp > 0) return;
    b.gone = 0;
    this.events.push(`bug:${this.bugs.indexOf(b)}`);
    if (!this.left.length) { this.brush = null; this.next('spit', 'clean'); }
  }

  spit(): void { if (this.phase === 'spit') { this.done = 0; this.foam = 0; this.next('done', 'done'); } }

  /** Space: the next thing to do. */
  primary(): void {
    switch (this.phase) {
      case 'stool': this.stepUp(); break;
      case 'soap': this.pump(); break;
      case 'rub': this.rub(TUNING.rubWork * TUNING.rubTap); break;
      case 'rinse': this.rinse(); break;
      case 'dry': this.dry(); break;
      case 'paste': this.paste(); break;
      case 'brush': this.scrubNext(); break;
      case 'spit': this.spit(); break;
    }
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt); left -= dt; }
  }

  private step(dt: number): void {
    this.elapsed += dt; this.idle += dt;
    if (this.up >= 0) this.up += dt;
    if (this.done >= 0) this.done += dt;
    for (const b of this.bubbles) { b.age += dt; b.y -= TUNING.bubbleRise * dt; b.x += Math.sin(b.age * 2 + b.r) * b.vx * dt; }
    // Bubbles drift up to the top of the mirror and pop by themselves.
    for (const b of this.bubbles.filter(x => x.y < 90)) this.events.push('pop');
    this.bubbles = this.bubbles.filter(b => b.y >= 90);
    for (const b of this.bugs) if (b.gone >= 0) b.gone += dt;
    if (this.water >= 0) {
      this.water += dt;
      this.lather = Math.max(0, this.lather - dt / TUNING.rinse);
      if (this.water >= TUNING.rinse && this.phase === 'rinse') { this.water = -1; this.lather = 0; this.bubbles = []; this.next('dry', 'rinsed'); }
    }
  }
}
