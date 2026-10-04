import { ANIMALS, SONG, TOYS, TUNING, type AnimalId, type Pt, type ToyId } from './games/godnatt';

// Godnatt's rules, without Phaser: put the six toys where they live (dragged there, or tapped and they hop home by
// themselves), go to bed, say goodnight to the five animals on the wallpaper, and turn off the lamp. Nothing can go wrong:
// a toy let go in the wrong place goes back to the rug and its home lights up. The toy piano under the desk can be played
// at any time, freely or along with Blinka lilla stjärna.

export type Phase = 'tidy' | 'bed' | 'goodnight' | 'lamp' | 'asleep';
export type HintTarget = ToyId | AnimalId | 'bed' | 'lamp';

export interface ToyState {
  id: ToyId;
  at: Pt;
  placed: boolean;
  /** A hop under way: home, or back to the rug. */
  hop: { from: Pt; to: Pt; since: number; home: boolean } | null;
}

export interface Piano {
  open: boolean;
  /** Playing along: the next key of the song lights up. */
  along: boolean;
  next: number;
  /** Keys pressed, for their little bounce: key and seconds since. */
  pressed: Array<{ key: number; since: number }>;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export class GoodnightRun {
  phase: Phase = 'tidy';
  toys: ToyState[] = TOYS.map(t => ({ id: t.id, at: [...t.start] as Pt, placed: false, hop: null }));
  /** The toy in Carl-Otto's (or a finger's) hand, and where the press began. */
  held: ToyId | null = null;
  private grabbedAt: Pt = [0, 0];
  /** A toy whose home glows (after it was let go in the wrong place), and for how much longer. */
  glow: { toy: ToyId; left: number } | null = null;
  asleep: Array<{ id: AnimalId; since: number }> = [];
  /** Seconds since Carl-Otto got into bed, and since the lamp went out (−1: not yet). */
  inBed = -1;
  dark = -1;
  piano: Piano = { open: false, along: false, next: 0, pressed: [] };
  elapsed = 0;
  idle = 0;
  events: string[] = [];

  get left(): ToyState[] { return this.toys.filter(t => !t.placed && !(t.hop?.home)); }
  get won(): boolean { return this.dark >= TUNING.done; }

  get hint(): HintTarget | null {
    if (this.idle < TUNING.hintAfter || this.piano.open) return null;
    if (this.phase === 'tidy') return this.left[0]?.id ?? null;
    if (this.phase === 'bed') return 'bed';
    if (this.phase === 'goodnight') return ANIMALS.find(a => !this.asleep.some(s => s.id === a.id))?.id ?? null;
    if (this.phase === 'lamp') return 'lamp';
    return null;
  }

  private toy(id: ToyId): ToyState { return this.toys.find(t => t.id === id)!; }

  /** A finger (or the mouse) goes down at a point: picks up the nearest toy there. Returns it, if any. */
  grab(at: Pt): ToyId | null {
    if (this.phase !== 'tidy' || this.piano.open) return null;
    const near = this.left.filter(t => !t.hop && dist(t.at, at) <= TUNING.grab).sort((a, b) => dist(a.at, at) - dist(b.at, at))[0];
    if (!near) return null;
    this.held = near.id; this.grabbedAt = at; this.idle = 0;
    this.events.push(`grab:${near.id}`);
    return near.id;
  }

  drag(at: Pt): void { if (this.held) this.toy(this.held).at = at; }

  /** The finger lifts: home if it is near enough, home by itself if it was a tap, otherwise back to the rug. */
  drop(at: Pt): void {
    if (!this.held) return;
    const t = this.toy(this.held), def = TOYS.find(d => d.id === t.id)!;
    this.held = null;
    if (dist(at, def.home) <= TUNING.homeReach || dist(at, this.grabbedAt) < TUNING.tap) this.send(t.id);
    else {
      t.hop = { from: [...t.at] as Pt, to: [...def.start] as Pt, since: 0, home: false };
      this.glow = { toy: t.id, left: 2.5 };
      this.events.push(`wrong:${t.id}`);
    }
  }

  /** A toy hops home by itself (a tap, a key, a screen reader's button). */
  send(id: ToyId): void {
    const t = this.toy(id), def = TOYS.find(d => d.id === id)!;
    if (this.phase !== 'tidy' || t.placed || t.hop?.home) return;
    if (this.held === id) this.held = null;
    t.hop = { from: [...t.at] as Pt, to: def.home, since: 0, home: true };
    this.idle = 0;
  }

  /** A tap on the bed: in after tidying (before that, a gentle "tidy first"). */
  toBed(): void {
    if (this.phase === 'bed') { this.phase = 'goodnight'; this.inBed = 0; this.idle = 0; this.events.push('bed'); }
    else if (this.phase === 'tidy') this.events.push('notyet:bed');
  }

  sayGoodnight(id: AnimalId): void {
    if (this.phase !== 'goodnight') { if (this.phase === 'tidy' || this.phase === 'bed') this.events.push(`peek:${id}`); return; }
    if (this.asleep.some(a => a.id === id)) return;
    this.asleep.push({ id, since: 0 }); this.idle = 0;
    this.events.push(`night:${id}`);
    if (this.asleep.length === ANIMALS.length) { this.phase = 'lamp'; this.events.push('animals'); }
  }

  /** A tap on the lamp: out at the end (before that, a gentle "goodnight first"). */
  lampOff(): void {
    if (this.phase === 'lamp') { this.phase = 'asleep'; this.dark = 0; this.piano.open = false; this.events.push('lamp'); }
    else if (this.phase === 'goodnight') this.events.push('notyet:lamp');
  }

  openPiano(): void { if (this.phase !== 'asleep' && !this.piano.open) { this.piano.open = true; this.held = null; this.events.push('piano'); } }
  closePiano(): void { this.piano.open = false; }
  toggleAlong(): void { this.piano.along = !this.piano.along; this.piano.next = 0; }

  /** A key on the piano (0–7). Playing along, the right key moves the song on; any other just plays. */
  play(key: number): void {
    if (!this.piano.open || key < 0 || key > 7) return;
    this.piano.pressed.push({ key, since: 0 });
    this.events.push(`note:${key}`);
    this.idle = 0;
    if (this.piano.along && key === SONG[this.piano.next]) {
      this.piano.next++;
      if (this.piano.next === SONG.length) { this.piano.next = 0; this.events.push('song'); }
    }
  }

  /** Space: the next thing to do. */
  primary(): void {
    if (this.piano.open) { if (this.piano.along) this.play(SONG[this.piano.next]); return; }
    if (this.phase === 'tidy') { const t = this.left[0]; if (t) this.send(t.id); }
    else if (this.phase === 'bed') this.toBed();
    else if (this.phase === 'goodnight') { const a = ANIMALS.find(x => !this.asleep.some(s => s.id === x.id)); if (a) this.sayGoodnight(a.id); }
    else if (this.phase === 'lamp') this.lampOff();
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt); left -= dt; }
  }

  private step(dt: number): void {
    this.elapsed += dt; this.idle += dt;
    if (this.glow && (this.glow.left -= dt) <= 0) this.glow = null;
    for (const a of this.asleep) a.since += dt;
    if (this.inBed >= 0) this.inBed += dt;
    if (this.dark >= 0) { const before = this.dark; this.dark += dt; if (before < TUNING.done && this.dark >= TUNING.done) this.events.push('won'); }
    this.piano.pressed = this.piano.pressed.filter(p => (p.since += dt) < 0.4);
    for (const t of this.toys) {
      if (!t.hop) continue;
      t.hop.since += dt;
      const u = Math.min(1, t.hop.since / TUNING.hop);
      t.at = [t.hop.from[0] + (t.hop.to[0] - t.hop.from[0]) * u, t.hop.from[1] + (t.hop.to[1] - t.hop.from[1]) * u - Math.sin(u * Math.PI) * 70];
      if (u >= 1) {
        const home = t.hop.home;
        t.at = [...t.hop.to] as Pt; t.hop = null;
        if (home) {
          t.placed = true;
          this.events.push(`placed:${t.id}`);
          if (this.toys.every(x => x.placed)) { this.phase = 'bed'; this.idle = 0; this.events.push('tidy'); }
        }
      }
    }
  }
}
