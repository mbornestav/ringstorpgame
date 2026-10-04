// Putting things where they live, for the rooms of the house (Godnatt's toys, Hemkomst's shoes): without Phaser. A finger
// picks a thing up where it lies; let go near its home, it goes in; only tapped, it hops home by itself; let go anywhere
// else, it hops back to where it lay and its home lights up for a moment. Nothing can go wrong.

export type Pt = [number, number];

export interface Thing<Id extends string> { id: Id; start: Pt; home: Pt }
export interface ThingState<Id extends string> {
  id: Id;
  at: Pt;
  placed: boolean;
  /** A hop under way: home, or back to where it lay. */
  hop: { from: Pt; to: Pt; since: number; home: boolean } | null;
}
export interface PutAwayTuning {
  /** Seconds a hop takes, and how high it arcs. */
  hop: number;
  arc?: number;
  /** A thing let go this close to its home goes in; a touch this close picks one up; a press that moves less is a tap. */
  homeReach: number;
  grab: number;
  tap: number;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export class PutAway<Id extends string> {
  items: ThingState<Id>[];
  /** The thing in a hand, if any. */
  held: Id | null = null;
  /** A thing whose home glows (after it was let go in the wrong place), and for how much longer. */
  glow: { id: Id; left: number } | null = null;
  private grabbedAt: Pt = [0, 0];

  constructor(private readonly things: readonly Thing<Id>[], private readonly tuning: PutAwayTuning) {
    this.items = things.map(t => ({ id: t.id, at: [...t.start] as Pt, placed: false, hop: null }));
  }

  private thing(id: Id): Thing<Id> { return this.things.find(t => t.id === id)!; }
  item(id: Id): ThingState<Id> { return this.items.find(t => t.id === id)!; }

  /** Things still to put away (not placed, and not already hopping home). */
  get left(): ThingState<Id>[] { return this.items.filter(t => !t.placed && !t.hop?.home); }
  get done(): boolean { return this.items.every(t => t.placed); }

  /** A finger goes down: picks up the nearest thing within reach. */
  grab(at: Pt, allowed: (id: Id) => boolean = () => true): Id | null {
    const near = this.left.filter(t => !t.hop && allowed(t.id) && dist(t.at, at) <= this.tuning.grab).sort((a, b) => dist(a.at, at) - dist(b.at, at))[0];
    if (!near) return null;
    this.held = near.id; this.grabbedAt = at;
    return near.id;
  }

  drag(at: Pt): void { if (this.held) this.item(this.held).at = at; }

  /** The finger lifts. Returns what happened: in (or only tapped, so hopping home), or wrong (hopping back). */
  drop(at: Pt): 'home' | 'wrong' | null {
    if (!this.held) return null;
    const id = this.held, t = this.item(id), def = this.thing(id);
    this.held = null;
    if (dist(at, def.home) <= this.tuning.homeReach || dist(at, this.grabbedAt) < this.tuning.tap) { this.send(id); return 'home'; }
    t.hop = { from: [...t.at] as Pt, to: [...def.start] as Pt, since: 0, home: false };
    this.glow = { id, left: 2.5 };
    return 'wrong';
  }

  /** A thing hops home by itself (a tap, a key, a screen reader's button). False if it is already home or on its way. */
  send(id: Id): boolean {
    const t = this.item(id);
    if (t.placed || t.hop?.home) return false;
    if (this.held === id) this.held = null;
    t.hop = { from: [...t.at] as Pt, to: this.thing(id).home, since: 0, home: true };
    return true;
  }

  /** Lets go of whatever is held, leaving it where it is. */
  release(): void { this.held = null; }

  /** Advances the hops. Returns the things that arrived home. */
  step(dt: number): Id[] {
    if (this.glow && (this.glow.left -= dt) <= 0) this.glow = null;
    const arrived: Id[] = [];
    for (const t of this.items) {
      if (!t.hop) continue;
      t.hop.since += dt;
      const u = Math.min(1, t.hop.since / this.tuning.hop);
      t.at = [t.hop.from[0] + (t.hop.to[0] - t.hop.from[0]) * u, t.hop.from[1] + (t.hop.to[1] - t.hop.from[1]) * u - Math.sin(u * Math.PI) * (this.tuning.arc ?? 70)];
      if (u >= 1) {
        const home = t.hop.home;
        t.at = [...t.hop.to] as Pt; t.hop = null;
        if (home) { t.placed = true; arrived.push(t.id); }
      }
    }
    return arrived;
  }
}
