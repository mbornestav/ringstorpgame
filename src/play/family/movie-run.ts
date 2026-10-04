import { DINING, ITEMS, PLACES, REACH, ROOM, SOFA_REACH, SOFA_X, START_X, SURPRISES, TUNING, type Item, type PlaceKind, type SurpriseKind } from './games/filmkvall';
import { shuffle } from './hide-run';

// Filmkväll's rules, without Phaser: Carl-Otto looks around the living room for the five things a movie night needs, carries
// them to the sofa, and once everything is there the TV comes on. There is no way to lose: the next place to look sparkles
// when nothing has happened for a while.

export type MovieMode = 'ready' | 'gathering' | 'paused' | 'watching' | 'won';

export interface Spot {
  kind: PlaceKind;
  x: number;
  /** What is hidden here this round: one of the things, or a surprise. */
  item: Item | null;
  surprise: SurpriseKind | null;
  opened: boolean;
  /** Seconds since it was opened, for the pop-up. */
  since: number;
}

/** A found thing: popping up at its place, then in Carl-Otto's arms. */
export interface Carried { item: Item; from: number; since: number }

/** A thing on the sofa, and how long it has been there (it settles in with a little bounce). */
export interface Placed { item: Item; since: number }

export class MovieRun {
  mode: MovieMode = 'ready';
  x = START_X;
  facing: 1 | -1 = -1;
  /** Where a tap asked Carl-Otto to walk to. */
  target: number | null = null;
  walking = false;
  elapsed = 0;
  /** Seconds since the last find or the last thing put on the sofa. */
  idle = 0;
  /** Seconds since everything was on the sofa. */
  watch = 0;
  spots: Spot[] = [];
  carrying: Carried[] = [];
  placed: Placed[] = [];
  /** Sound and reaction cues since the scene last read them. */
  events: string[] = [];
  private paused: MovieMode = 'gathering';
  private random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; this.deal(); }

  /** Things still hidden somewhere. */
  get left(): number { return ITEMS.length - this.placed.length - this.carrying.length; }
  get tvOn(): boolean { return (this.mode === 'watching' || this.mode === 'won') && this.watch >= TUNING.tvOn; }
  /** The things in his arms (not those still popping up). */
  get arms(): Carried[] { return this.carrying.filter(c => c.since >= TUNING.popOut); }
  /** The unopened place Carl-Otto can look in now, if any. */
  get near(): Spot | null {
    if (this.mode !== 'gathering') return null;
    let best: Spot | null = null;
    for (const s of this.spots) if (!s.opened && Math.abs(s.x - this.x) <= REACH && (!best || Math.abs(s.x - this.x) < Math.abs(best.x - this.x))) best = s;
    return best;
  }
  /** Where the sparkle goes once nothing has happened for a while: the nearest hidden thing, or the sofa when all are found. */
  get hint(): number | null {
    if (this.mode !== 'gathering' || this.idle < TUNING.hintAfter) return null;
    const hidden = this.spots.filter(s => s.item && !s.opened).sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x));
    return hidden[0]?.x ?? (this.carrying.length ? SOFA_X : null);
  }

  /**
   * Hides each thing in a place it fits, every one in a different place, and puts surprises in the rest. The doorway, left
   * empty, is a peek into the dining room.
   */
  private deal(): void {
    let taken = new Map<PlaceKind, Item>();
    for (let attempt = 0; attempt < 50; attempt++) {
      taken = new Map();
      // The fussiest things choose first, so a deal almost never has to start over.
      const items = shuffle(ITEMS, this.random).sort((a, b) => a.fits.length - b.fits.length);
      for (const item of items) {
        const free = shuffle(item.fits, this.random).find(k => !taken.has(k));
        if (free) taken.set(free, item);
      }
      if (taken.size === ITEMS.length) break;
    }
    const surprises = shuffle(SURPRISES, this.random);
    let next = 0;
    this.spots = PLACES.map(p => {
      const item = taken.get(p.kind) ?? null;
      const surprise = item ? null : p.kind === 'doorway' ? DINING.kind : surprises[next++ % surprises.length].kind;
      return { kind: p.kind, x: p.x, item, surprise, opened: false, since: 0 };
    }).sort((a, b) => a.x - b.x);
  }

  /** A new round: everything hidden again, Carl-Otto by the sofa. */
  start(): void {
    this.deal();
    this.mode = 'gathering'; this.elapsed = 0; this.idle = 0; this.watch = 0;
    this.x = START_X; this.facing = -1; this.target = null; this.walking = false;
    this.carrying = []; this.placed = []; this.events = ['start'];
  }

  pause(): void { if (this.mode === 'gathering') { this.paused = this.mode; this.mode = 'paused'; } }
  resume(): void { if (this.mode === 'paused') this.mode = this.paused; }

  /** Walk to a place in the room (a tap). */
  walkTo(x: number): void { if (this.mode === 'gathering') this.target = Math.max(60, Math.min(ROOM - 60, x)); }

  /** Looks in the nearest place in reach. Returns it, or null if there is nothing to look in. */
  look(): Spot | null {
    const spot = this.near;
    if (!spot) return null;
    spot.opened = true; spot.since = 0;
    if (spot.item) {
      this.carrying.push({ item: spot.item, from: spot.x, since: 0 });
      this.idle = 0;
      this.events.push(`found:${spot.item.id}`);
    } else this.events.push(`surprise:${spot.surprise}`);
    return spot;
  }

  update(seconds: number, dir = 0): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt, dir); left -= dt; }
  }

  private step(dt: number, dir: number): void {
    if (this.mode === 'ready' || this.mode === 'paused') return;
    for (const p of this.placed) p.since += dt;
    if (this.mode === 'watching' || this.mode === 'won') {
      const before = this.watch;
      this.watch += dt;
      if (before < TUNING.tvOn && this.watch >= TUNING.tvOn) this.events.push('tv');
      if (this.mode === 'watching' && this.watch >= TUNING.showtime) { this.mode = 'won'; this.events.push('won'); }
      return;
    }
    if (this.mode !== 'gathering') return;
    this.elapsed += dt;
    this.idle += dt;
    // Walking: held keys win over a tapped destination.
    let move = Math.sign(dir);
    if (move !== 0) this.target = null;
    else if (this.target !== null) {
      const gap = this.target - this.x;
      if (Math.abs(gap) < 4) this.target = null; else move = Math.sign(gap);
    }
    this.walking = move !== 0;
    if (move) {
      this.facing = move > 0 ? 1 : -1;
      this.x = Math.max(60, Math.min(ROOM - 60, this.x + move * TUNING.walk * dt));
    }
    for (const s of this.spots) if (s.opened) s.since += dt;
    for (const c of this.carrying) c.since += dt;
    // At the sofa, everything in his arms goes onto it.
    if (Math.abs(this.x - SOFA_X) <= SOFA_REACH) {
      const ready = this.arms;
      if (ready.length) {
        this.carrying = this.carrying.filter(c => !ready.includes(c));
        for (const c of ready) { this.placed.push({ item: c.item, since: 0 }); this.events.push(`placed:${c.item.id}`); }
        this.idle = 0;
      }
    }
    if (this.placed.length === ITEMS.length) {
      this.mode = 'watching'; this.watch = 0; this.walking = false; this.target = null;
      this.events.push('watch');
    }
  }
}
