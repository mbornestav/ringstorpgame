import { HELMET, JACKET, PAIRS, PAIR_GAP, TUNING, type PairId, type ShoeId, type Side, type ThingId } from './games/hemkomst';
import { PutAway, type Pt, type Thing, type ThingState } from './put-away';

// Hemkomst's rules, without Phaser: Carl-Otto is home, and the family's shoes lie all over the floor by the door. Each shoe
// goes to its pair's place on the bench (Pappa's and Mamma's on the seat, his own on the shelf below), his raincoat on his
// own low hook and his bike helmet on the shelf. Dragged there, or tapped and it hops there by itself; let go in the wrong
// place, it goes back and its place lights up. While a shoe is held, its partner wiggles.

export type HintTarget = ThingId;

/** Where a shoe stands in its pair's place. */
export const shoeHome = (pair: PairId, side: Side): Pt => {
  const p = PAIRS.find(x => x.id === pair)!, dx = PAIR_GAP * p.size * (side === 'L' ? -1 : 1);
  return [p.slot[0] + dx, p.slot[1]];
};

export const THINGS: Thing<ThingId>[] = [
  ...PAIRS.flatMap(p => (['L', 'R'] as const).map((side, i) => ({ id: `${p.id}-${side}` as ShoeId, start: p.starts[i], home: shoeHome(p.id, side) }))),
  { id: 'jacket', start: JACKET.start, home: JACKET.home },
  { id: 'helmet', start: HELMET.start, home: HELMET.home },
];

export const pairOf = (id: ThingId): PairId | null => id === 'jacket' || id === 'helmet' ? null : id.split('-')[0] as PairId;
export const partnerOf = (id: ThingId): ShoeId | null => {
  const pair = pairOf(id);
  return pair ? `${pair}-${id.endsWith('L') ? 'R' : 'L'}` as ShoeId : null;
};

export class HomecomingRun {
  private readonly put = new PutAway(THINGS, { hop: TUNING.hop, homeReach: TUNING.homeReach, grab: TUNING.grab, tap: TUNING.tap, arc: 90 });
  /** Seconds since everything was put away (−1: not yet), and whether the welcome is showing. */
  home = -1;
  elapsed = 0;
  idle = 0;
  events: string[] = [];

  get things(): ThingState<ThingId>[] { return this.put.items; }
  get held(): ThingId | null { return this.put.held; }
  get glow(): { id: ThingId; left: number } | null { return this.put.glow; }
  get left(): ThingState<ThingId>[] { return this.put.left; }
  get won(): boolean { return this.home >= TUNING.done; }
  /** Pairs with both shoes in place. */
  get pairs(): PairId[] { return PAIRS.filter(p => this.put.item(`${p.id}-L`).placed && this.put.item(`${p.id}-R`).placed).map(p => p.id); }

  /** The next thing to put away (shoes first, a pair at a time; then the jacket and the helmet), once nothing has happened for a while. */
  get hint(): HintTarget | null { return this.idle >= TUNING.hintAfter ? this.next : null; }
  private get next(): ThingId | null { return this.left[0]?.id ?? null; }

  grab(at: Pt): ThingId | null {
    if (this.home >= 0) return null;
    const id = this.put.grab(at);
    if (id) { this.idle = 0; this.events.push(`grab:${id}`); }
    return id;
  }
  drag(at: Pt): void { this.put.drag(at); }
  drop(at: Pt): void {
    const id = this.put.held;
    if (!id) return;
    if (this.put.drop(at) === 'wrong') this.events.push(`wrong:${id}`); else this.idle = 0;
  }
  send(id: ThingId): void { if (this.home < 0 && this.put.send(id)) this.idle = 0; }
  release(): void { this.put.release(); }

  /** Space: the next thing goes to its place. */
  primary(): void { const n = this.next; if (n) this.send(n); }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt); left -= dt; }
  }

  private step(dt: number): void {
    this.elapsed += dt; this.idle += dt;
    if (this.home >= 0) { const before = this.home; this.home += dt; if (before < TUNING.done && this.home >= TUNING.done) this.events.push('won'); }
    for (const id of this.put.step(dt)) {
      this.events.push(`placed:${id}`);
      const pair = pairOf(id), partner = partnerOf(id);
      if (pair && partner && this.put.item(partner).placed) this.events.push(`pair:${pair}`);
      if (this.put.done && this.home < 0) { this.home = 0; this.events.push('home'); }
    }
  }
}
