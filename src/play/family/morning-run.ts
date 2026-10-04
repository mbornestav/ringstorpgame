import { BULBS, MAMMA_HEAD, TEDDY_START, TUNING, type Pt, type Wake } from './games/godmorgon';

// God morgon's rules, without Phaser: wake Mamma and Pappa three ways, in any order (open the curtains, tickle Pappa's
// foot, put Nallen on Mamma's nose), then bounce on their bed until the star lamp's eight bulbs are lit, a hug, and off to
// preschool. Nothing can go wrong: every tap on the bed is a bounce (a tap in the air is kept for the landing), and Nallen
// let go anywhere but Mamma's nose just hops back to the armchair.

export type Phase = 'wake' | 'awake' | 'bounce' | 'hug' | 'ready';
export type HintTarget = 'curtains' | 'foot' | 'teddy' | 'bed';
export interface Feather { x: number; y: number; vx: number; vy: number; spin: number; life: number }

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Where Nallen sits on Mamma's face. */
export const NOSE: Pt = [MAMMA_HEAD[0] - 4, MAMMA_HEAD[1] - 22];

export class MorningRun {
  phase: Phase = 'wake';
  woke: Wake[] = [];
  /** Seconds since the curtains began to open (−1: still closed). */
  curtains = -1;
  tickles = 0;
  /** Seconds since the last tickle (the foot wiggles for a moment). */
  tickleSince = 99;
  teddy: { at: Pt; hop: { from: Pt; to: Pt; since: number } | null; onNose: boolean } = { at: [...TEDDY_START] as Pt, hop: null, onNose: false };
  held = false;
  private grabbedAt: Pt = [0, 0];
  /** Seconds since Mamma and Pappa woke (−1: asleep). */
  awakeSince = -1;
  /** Carl-Otto's height over the mattress, and his speed upwards. */
  z = 0;
  vz = 0;
  /** A tap made in the air, waiting for the landing (seconds left). */
  buffered = 0;
  bulbs = 0;
  feathers: Feather[] = [];
  hugSince = -1;
  elapsed = 0;
  idle = 0;
  events: string[] = [];
  private random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; }

  get hint(): HintTarget | null {
    if (this.idle < TUNING.hintAfter) return null;
    if (this.phase === 'wake') return !this.woke.includes('curtains') ? 'curtains' : !this.woke.includes('tickle') ? 'foot' : !this.woke.includes('teddy') ? 'teddy' : null;
    return this.phase === 'bounce' ? 'bed' : null;
  }

  private wake(how: Wake): void {
    if (this.woke.includes(how)) return;
    this.woke.push(how); this.idle = 0;
    this.events.push(`wake:${how}`);
    if (this.woke.length === 3) { this.phase = 'awake'; this.awakeSince = 0; this.events.push('awake'); }
  }

  openCurtains(): void { if (this.phase === 'wake' && this.curtains < 0) { this.curtains = 0; this.wake('curtains'); } }

  /** A tap (or a rub) on Pappa's foot: three tickles wake him. */
  tickle(): void {
    if (this.phase !== 'wake' || this.woke.includes('tickle')) return;
    this.tickles++; this.tickleSince = 0; this.idle = 0;
    this.events.push(`tickle:${this.tickles}`);
    if (this.tickles >= TUNING.tickles) this.wake('tickle');
  }

  /** A finger goes down: picks up Nallen if it is there. */
  grab(at: Pt): boolean {
    const t = this.teddy;
    if (this.phase !== 'wake' || t.onNose || t.hop || dist(at, t.at) > TUNING.grab) return false;
    this.held = true; this.grabbedAt = at; this.idle = 0;
    this.events.push('grab');
    return true;
  }
  drag(at: Pt): void { if (this.held) this.teddy.at = at; }
  /** Let go on Mamma's face (or only tapped): onto her nose. Anywhere else: back to the armchair. */
  drop(at: Pt): void {
    if (!this.held) return;
    this.held = false;
    if (dist(at, NOSE) <= TUNING.reach || dist(at, this.grabbedAt) < TUNING.tap) this.sendTeddy();
    else { this.teddy.hop = { from: [...this.teddy.at] as Pt, to: [...TEDDY_START] as Pt, since: 0 }; this.events.push('teddy:back'); }
  }
  /** Nallen hops onto Mamma's nose by itself (a tap, a key). */
  sendTeddy(): void {
    const t = this.teddy;
    if (this.phase !== 'wake' || t.onNose || t.hop?.to === NOSE) return;
    this.held = false;
    t.hop = { from: [...t.at] as Pt, to: NOSE, since: 0 };
    this.idle = 0;
  }

  /** A tap while bouncing: up now if he is on the mattress, or on landing. */
  jump(): void {
    if (this.phase !== 'bounce') return;
    this.idle = 0;
    if (this.z <= 0.5) this.takeoff(); else this.buffered = TUNING.buffer;
  }

  private takeoff(): void {
    this.buffered = 0;
    this.vz = TUNING.jump + this.bulbs * TUNING.jumpGain;
    this.z = 0.01;
    if (this.bulbs < BULBS) { this.bulbs++; this.events.push(`bulb:${this.bulbs}`); }
    // A puff of feathers from the pillows.
    for (let i = 0; i < 5; i++) this.feathers.push({ x: 200 + this.random() * 160, y: 320, vx: (this.random() - 0.5) * 120, vy: -120 - this.random() * 120, spin: this.random() * 6, life: 2.5 + this.random() });
  }

  /** Space: the next thing to do. */
  primary(): void {
    if (this.phase === 'wake') {
      if (!this.woke.includes('curtains')) this.openCurtains();
      else if (!this.woke.includes('tickle')) this.tickle();
      else this.sendTeddy();
    } else if (this.phase === 'bounce') this.jump();
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let left = Math.min(seconds, 0.25);
    while (left > 0) { const dt = Math.min(left, 1 / 60); this.step(dt); left -= dt; }
  }

  private step(dt: number): void {
    this.elapsed += dt; this.idle += dt; this.tickleSince += dt;
    if (this.curtains >= 0) this.curtains += dt;
    const t = this.teddy;
    if (t.hop) {
      t.hop.since += dt;
      const u = Math.min(1, t.hop.since / TUNING.hop);
      t.at = [t.hop.from[0] + (t.hop.to[0] - t.hop.from[0]) * u, t.hop.from[1] + (t.hop.to[1] - t.hop.from[1]) * u - Math.sin(u * Math.PI) * 80];
      if (u >= 1) {
        const nose = t.hop.to === NOSE;
        t.at = [...t.hop.to] as Pt; t.hop = null;
        if (nose) { t.onNose = true; this.wake('teddy'); }
      }
    }
    for (const f of this.feathers) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy = Math.min(f.vy + 160 * dt, 40); f.vx *= 0.99; f.life -= dt; }
    this.feathers = this.feathers.filter(f => f.life > 0);
    if (this.phase === 'awake') {
      this.awakeSince += dt;
      if (this.awakeSince >= TUNING.toBounce) { this.phase = 'bounce'; this.idle = 0; this.events.push('bounce'); }
      return;
    }
    if (this.phase === 'hug') {
      this.hugSince += dt;
      if (this.hugSince >= TUNING.hug) { this.phase = 'ready'; this.events.push('ready'); }
      return;
    }
    if (this.phase !== 'bounce') return;
    this.buffered = Math.max(0, this.buffered - dt);
    this.z += this.vz * dt;
    this.vz -= TUNING.gravity * dt;
    if (this.z <= 0 && this.vz < 0) {
      this.z = 0;
      this.events.push('land');
      if (this.bulbs >= BULBS) { this.phase = 'hug'; this.hugSince = 0; this.vz = 0; this.events.push('hug'); }
      else if (this.buffered > 0) this.takeoff();
      else this.vz = TUNING.hopSpeed;
    }
  }
}
