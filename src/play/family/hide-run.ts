import { COUNT_X, DOOR_X, FRIENDS, PLACES, REACH, SURPRISES, TUNING, YARD, type Friend, type PlaceKind, type SurpriseKind } from './games/kurragomma';

// Kurragömma's rules, without Phaser: Carl-Otto counts to ten, then walks the yard and looks in hiding places until all
// his friends are found. There is no way to lose: hints grow stronger the longer nothing is found.

export type HideMode = 'ready' | 'counting' | 'seeking' | 'paused' | 'won';

export interface Spot {
  kind: PlaceKind;
  x: number;
  /** Who, or what, is there this round. */
  friend: Friend | null;
  surprise: SurpriseKind | null;
  opened: boolean;
  /** Seconds since it was opened, for the pop-out animation. */
  since: number;
  /** Seconds to the next giggle, while a friend is still hidden here. */
  giggleIn: number;
  /** Seconds left of the current "hihi" bubble. */
  giggling: number;
}

/** A found friend on the way to the door, then waiting there. */
export interface Runner { friend: Friend; x: number; from: number; t: number; home: boolean; slot: number }

/** A small seeded generator, so a round can be replayed exactly. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export class HideRun {
  mode: HideMode = 'ready';
  x = COUNT_X;
  facing: 1 | -1 = -1;
  /** Where a tap asked Carl-Otto to walk to. */
  target: number | null = null;
  /** The number counted so far (0 before, 10 when done). */
  count = 0;
  elapsed = 0;
  /** Seconds since the last find (or since counting ended). */
  idle = 0;
  walking = false;
  spots: Spot[] = [];
  runners: Runner[] = [];
  /** Sound and reaction cues since the scene last read them. */
  events: string[] = [];
  private countTimer = 0;
  private paused: HideMode = 'seeking';
  private random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; this.deal(); }

  get found(): Friend[] { return this.runners.map(r => r.friend); }
  get left(): number { return FRIENDS.length - this.runners.length; }
  /** The unopened place Carl-Otto can look in now, if any. */
  get near(): Spot | null {
    let best: Spot | null = null;
    for (const s of this.spots) if (!s.opened && Math.abs(s.x - this.x) <= REACH && (!best || Math.abs(s.x - this.x) < Math.abs(best.x - this.x))) best = s;
    return best;
  }
  /** The friend the teacher points at once nothing has been found for a while. */
  get hint(): Spot | null {
    if (this.mode !== 'seeking' || this.idle < TUNING.hintAfter) return null;
    const hidden = this.spots.filter(s => s.friend && !s.opened);
    return hidden.sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0] ?? null;
  }

  /** New hiding places for everyone, and surprises in the rest. */
  private deal(): void {
    const places = shuffle(PLACES, this.random), surprises = shuffle(SURPRISES, this.random);
    const friends = shuffle(FRIENDS, this.random);
    this.spots = places.map((p, i) => ({
      kind: p.kind, x: p.x, friend: friends[i] ?? null, surprise: friends[i] ? null : surprises[(i - friends.length) % surprises.length].kind,
      opened: false, since: 0, giggleIn: 2 + this.random() * 6, giggling: 0,
    })).sort((a, b) => a.x - b.x);
  }

  /** Face the wall and count. */
  start(): void {
    this.deal();
    this.mode = 'counting'; this.count = 0; this.countTimer = 0; this.elapsed = 0; this.idle = 0;
    this.x = COUNT_X; this.facing = -1; this.target = null; this.walking = false;
    this.runners = []; this.events = [];
  }

  /** Stop counting early: "Nu kommer jag!" */
  skipCount(): void { if (this.mode === 'counting') this.go(); }

  private go(): void {
    this.mode = 'seeking'; this.count = 10; this.idle = 0; this.facing = 1;
    this.events.push('go');
  }

  pause(): void { if (this.mode === 'seeking' || this.mode === 'counting') { this.paused = this.mode; this.mode = 'paused'; } }
  resume(): void { if (this.mode === 'paused') this.mode = this.paused; }

  /** Walk to a hiding place (a tap on it). */
  walkTo(spot: Spot): void { if (this.mode === 'seeking') this.target = spot.x; }

  /** Looks in the nearest place in reach. Returns what was there, or null if there is nothing to look in. */
  look(): Spot | null {
    if (this.mode !== 'seeking') return null;
    const spot = this.near;
    if (!spot) return null;
    spot.opened = true; spot.since = 0; spot.giggling = 0;
    if (spot.friend) {
      const slot = this.runners.length;
      this.runners.push({ friend: spot.friend, x: spot.x, from: spot.x, t: -TUNING.popOut, home: false, slot });
      this.idle = 0;
      this.events.push(`found:${spot.friend.id}`);
    } else this.events.push(`surprise:${spot.surprise}`);
    return spot;
  }

  update(seconds: number, dir = 0): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt, dir); left -= dt; }
  }

  private step(dt: number, dir: number): void {
    if (this.mode === 'counting') {
      this.countTimer += dt;
      while (this.countTimer >= TUNING.countStep && this.mode === 'counting') {
        this.countTimer -= TUNING.countStep;
        this.count++;
        this.events.push('count');
        if (this.count >= 10) this.go();
      }
      return;
    }
    if (this.mode !== 'seeking') return;
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
      this.x = Math.max(60, Math.min(YARD - 60, this.x + move * TUNING.walk * dt));
    }
    for (const s of this.spots) {
      if (s.opened) { s.since += dt; continue; }
      s.giggling = Math.max(0, s.giggling - dt);
      if (!s.friend) continue;
      s.giggleIn -= dt;
      if (s.giggleIn <= 0) {
        const [a, b] = TUNING.giggle;
        s.giggleIn = a + this.random() * (b - a);
        if (Math.abs(s.x - this.x) <= TUNING.earshot) { s.giggling = 1.4; this.events.push('giggle'); }
      }
    }
    // Found friends pop out, then run to the door and wait there in a row.
    for (const r of this.runners) {
      r.t += dt;
      if (r.t < 0 || r.home) continue;
      const doorX = DOOR_X + 40 + r.slot * 44;
      const k = Math.min(1, r.t / Math.max(0.6, Math.abs(r.from - doorX) / 320));
      r.x = r.from + (doorX - r.from) * k;
      if (k >= 1) { r.home = true; this.events.push('cheer'); }
    }
    if (this.runners.length === FRIENDS.length && this.runners.every(r => r.home)) { this.mode = 'won'; this.events.push('won'); }
  }
}
