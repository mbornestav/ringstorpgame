import { CANDLES, OFFSET, PLACES, SOURCE, TUNING, WARES, type PlaceId, type Pt, type Ware } from './games/duka';

// Duka bordet's rules, without Phaser: a plate, a glass and a knife and fork at each of the four places (Mamma, Pappa,
// Carl-Otto and Nallen), taken from the stacks on the serving trolley: dragged to a place, or the stack tapped and the next
// one goes to the next empty place by itself. Then the five candles lit one by one, the food carried in (the pancakes from
// the kitchen if Carl-Otto made them, otherwise meatballs), and dinner. Nothing can go wrong: a plate let go away from the
// places goes back on its stack, and the empty places light up.

export type Phase = 'set' | 'candles' | 'serve' | 'eat' | 'done';
export type Food = 'pancakes' | 'meatballs';
export type HintTarget = Ware | 'candles' | 'food';

export interface Laid { place: PlaceId; ware: Ware }
export interface Moving { ware: Ware; from: Pt; to: Pt; since: number; place: PlaceId | null }

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Where a ware goes at a place. */
export function slotAt(place: PlaceId, ware: Ware): Pt {
  const p = PLACES.find(x => x.id === place)!, [dx, dy] = OFFSET[ware];
  return [p.at[0] + dx * p.scale, p.at[1] + dy * p.scale];
}

export class DiningRun {
  phase: Phase = 'set';
  laid: Laid[] = [];
  moving: Moving[] = [];
  /** A ware in a hand, taken from its stack. */
  held: { ware: Ware; at: Pt } | null = null;
  private grabbedAt: Pt = [0, 0];
  /** A ware whose empty places glow (after it was let go away from them). */
  glow: { ware: Ware; left: number } | null = null;
  lit = 0;
  /** Seconds since the food was brought in, and since dinner began (−1: not yet). */
  served = -1;
  eating = -1;
  elapsed = 0;
  idle = 0;
  events: string[] = [];

  constructor(readonly food: Food = 'meatballs') {}

  /** Places still without this ware (and none on its way there). */
  free(ware: Ware): PlaceId[] {
    return PLACES.map(p => p.id).filter(id => !this.laid.some(l => l.place === id && l.ware === ware) && !this.moving.some(m => m.place === id && m.ware === ware));
  }
  /** How many are left on the trolley. */
  left(ware: Ware): number { return this.free(ware).length - (this.held?.ware === ware ? 1 : 0); }
  get won(): boolean { return this.phase === 'done'; }

  get hint(): HintTarget | null {
    if (this.idle < TUNING.hintAfter) return null;
    if (this.phase === 'set') return WARES.find(w => this.left(w) > 0) ?? null;
    if (this.phase === 'candles') return 'candles';
    if (this.phase === 'serve') return 'food';
    return null;
  }

  /** A finger goes down on a stack: one ware from it is in the hand. */
  grab(at: Pt): Ware | null {
    if (this.phase !== 'set' || this.held) return null;
    const ware = WARES.find(w => this.left(w) > 0 && dist(at, SOURCE[w]) <= TUNING.grab);
    if (!ware) return null;
    this.held = { ware, at }; this.grabbedAt = at; this.idle = 0;
    this.events.push(`grab:${ware}`);
    return ware;
  }
  drag(at: Pt): void { if (this.held) this.held.at = at; }

  /** Let go near an empty place, it goes there; only tapped, to the next empty place; anywhere else, back to its stack. */
  drop(at: Pt): void {
    const h = this.held;
    if (!h) return;
    this.held = null;
    if (dist(at, this.grabbedAt) < TUNING.tap) { this.send(h.ware); return; }
    const near = this.free(h.ware).map(id => ({ id, d: dist(at, slotAt(id, h.ware)) })).filter(x => x.d <= TUNING.reach).sort((a, b) => a.d - b.d)[0];
    if (near) { this.move(h.ware, at, near.id); this.idle = 0; return; }
    this.moving.push({ ware: h.ware, from: at, to: SOURCE[h.ware], since: 0, place: null });
    this.glow = { ware: h.ware, left: 2.5 };
    this.events.push(`wrong:${h.ware}`);
  }

  private move(ware: Ware, from: Pt, place: PlaceId): void { this.moving.push({ ware, from, to: slotAt(place, ware), since: 0, place }); }

  /** The next one from a stack goes to the next empty place by itself. */
  send(ware: Ware): void {
    if (this.phase !== 'set') return;
    const place = this.free(ware)[0];
    if (!place) return;
    this.move(ware, SOURCE[ware], place); this.idle = 0;
  }

  /** A tap on the candlestick lights the next candle. */
  light(): void {
    if (this.phase !== 'candles') return;
    this.lit++; this.idle = 0;
    this.events.push(`candle:${this.lit}`);
    if (this.lit >= CANDLES.count) { this.phase = 'serve'; this.events.push('candles'); }
  }

  /** A tap on the food: onto the table, and dinner begins. */
  serve(): void { if (this.phase === 'serve' && this.served < 0) { this.served = 0; this.idle = 0; this.events.push('serve'); } }

  /** Space: the next thing to do. */
  primary(): void {
    if (this.phase === 'set') { const w = WARES.find(x => this.left(x) > 0); if (w) this.send(w); }
    else if (this.phase === 'candles') this.light();
    else if (this.phase === 'serve') this.serve();
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt); left -= dt; }
  }

  private step(dt: number): void {
    this.elapsed += dt; this.idle += dt;
    if (this.glow && (this.glow.left -= dt) <= 0) this.glow = null;
    for (const m of this.moving) m.since += dt;
    for (const m of this.moving.filter(x => x.since >= TUNING.hop)) {
      if (!m.place) continue;
      this.laid.push({ place: m.place, ware: m.ware });
      this.events.push(`laid:${m.place}:${m.ware}`);
      const n = this.laid.filter(l => l.ware === m.ware).length;
      this.events.push(`count:${m.ware}:${n}`);
    }
    this.moving = this.moving.filter(x => x.since < TUNING.hop);
    if (this.phase === 'set' && this.laid.length === PLACES.length * WARES.length) { this.phase = 'candles'; this.idle = 0; this.events.push('set'); }
    if (this.served >= 0 && this.phase === 'serve') { this.served += dt; if (this.served >= TUNING.serve) { this.phase = 'eat'; this.eating = 0; this.events.push('eat'); } }
    if (this.phase === 'eat') { this.eating += dt; if (this.eating >= TUNING.eat) { this.phase = 'done'; this.events.push('thanks'); } }
  }
}
