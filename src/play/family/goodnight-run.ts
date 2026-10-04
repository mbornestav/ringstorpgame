import { ANIMALS, SONG, TOYS, TUNING, type AnimalId, type Pt, type ToyId } from './games/godnatt';
import { PutAway, type ThingState } from './put-away';

// Godnatt's rules, without Phaser: put the six toys where they live (dragged there, or tapped and they hop home by
// themselves), go to bed, say goodnight to the five animals on the wallpaper, and turn off the lamp. Nothing can go wrong:
// a toy let go in the wrong place goes back to the rug and its home lights up. The toy piano under the desk can be played
// at any time, freely or along with Blinka lilla stjärna.

export type Phase = 'tidy' | 'bed' | 'goodnight' | 'lamp' | 'asleep';
export type HintTarget = ToyId | AnimalId | 'bed' | 'lamp';

export type ToyState = ThingState<ToyId>;

export interface Piano {
  open: boolean;
  /** Playing along: the next key of the song lights up. */
  along: boolean;
  next: number;
  /** Keys pressed, for their little bounce: key and seconds since. */
  pressed: Array<{ key: number; since: number }>;
}

export class GoodnightRun {
  phase: Phase = 'tidy';
  /** The toys: where they are, which are home, and the one in a hand. */
  private readonly put = new PutAway(TOYS, { hop: TUNING.hop, homeReach: TUNING.homeReach, grab: TUNING.grab, tap: TUNING.tap });
  get toys(): ToyState[] { return this.put.items; }
  get held(): ToyId | null { return this.put.held; }
  /** A toy whose home glows (after it was let go in the wrong place). */
  get glow(): { id: ToyId; left: number } | null { return this.put.glow; }
  asleep: Array<{ id: AnimalId; since: number }> = [];
  /** Seconds since Carl-Otto got into bed, and since the lamp went out (−1: not yet). */
  inBed = -1;
  dark = -1;
  piano: Piano = { open: false, along: false, next: 0, pressed: [] };
  elapsed = 0;
  idle = 0;
  events: string[] = [];

  get left(): ToyState[] { return this.put.left; }
  get won(): boolean { return this.dark >= TUNING.done; }

  get hint(): HintTarget | null {
    if (this.idle < TUNING.hintAfter || this.piano.open) return null;
    if (this.phase === 'tidy') return this.left[0]?.id ?? null;
    if (this.phase === 'bed') return 'bed';
    if (this.phase === 'goodnight') return ANIMALS.find(a => !this.asleep.some(s => s.id === a.id))?.id ?? null;
    if (this.phase === 'lamp') return 'lamp';
    return null;
  }

  /** A finger (or the mouse) goes down at a point: picks up the nearest toy there. Returns it, if any. */
  grab(at: Pt): ToyId | null {
    if (this.phase !== 'tidy' || this.piano.open) return null;
    const id = this.put.grab(at);
    if (id) { this.idle = 0; this.events.push(`grab:${id}`); }
    return id;
  }

  drag(at: Pt): void { this.put.drag(at); }

  /** The finger lifts: home if it is near enough, home by itself if it was a tap, otherwise back to the rug. */
  drop(at: Pt): void {
    const id = this.put.held;
    if (!id) return;
    if (this.put.drop(at) === 'wrong') this.events.push(`wrong:${id}`);
    else this.idle = 0;
  }

  /** A toy hops home by itself (a tap, a key, a screen reader's button). */
  send(id: ToyId): void {
    if (this.phase === 'tidy' && this.put.send(id)) this.idle = 0;
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

  openPiano(): void { if (this.phase !== 'asleep' && !this.piano.open) { this.piano.open = true; this.put.release(); this.events.push('piano'); } }
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
    for (const a of this.asleep) a.since += dt;
    if (this.inBed >= 0) this.inBed += dt;
    if (this.dark >= 0) { const before = this.dark; this.dark += dt; if (before < TUNING.done && this.dark >= TUNING.done) this.events.push('won'); }
    this.piano.pressed = this.piano.pressed.filter(p => (p.since += dt) < 0.4);
    for (const id of this.put.step(dt)) {
      this.events.push(`placed:${id}`);
      if (this.put.done) { this.phase = 'bed'; this.idle = 0; this.events.push('tidy'); }
    }
  }
}
