import { Drive } from './drive';
import { HEIST, chaseChance, payoutFor } from './heist-config';
import { BACK, OUT, YARD, roadBackStage, roadOutStage, yardStage } from './heist-stages';
import { t, type Key } from './i18n';
import { WIDTH } from './layout';
import { Yard, type YardAction } from './yard';
import type { Car, SideGame } from './game';

// Level 3, The Kapell Job, as D.D: pick up Goran, drive out past Statoil to the industrial estate, cut
// open trailers in the truck park without being seen, then drive the Gods back to Kurirgatan.

export type Phase = 'pickup' | 'out' | 'yard' | 'back' | 'done' | 'failed';
export type Failure = 'busted' | 'goran' | 'wrecked' | 'arrested';
export type HeistAction = YardAction;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Lines said as the car passes these points on the way out; Goran talks, D.D answers. */
const OUT_CUES: Array<[number, Key]> = [
  [1500, 'msg.h.gGo'], [4000, 'msg.h.gStatoil'], [4500, 'msg.dd3Statoil'], [6300, 'msg.h.gBildeve'], [8600, 'msg.dd3Almost'], [11300, 'msg.dd3Lights'],
];

export class HeistRun {
  phase: Phase = 'pickup';
  drive: Drive | null = null;
  readonly yard: Yard;
  failure: Failure | null = null;
  /** Crates delivered, damage taken and pay, for the result screen. */
  delivered = 0;
  damageTaken = 0;
  payout = 0;
  fine = 0;
  chased = false;
  /** Goran walking up to the car during the pickup, in stage x. */
  pickupX = OUT.goranX;
  private t = 0;
  private cues = new Set<number>();
  private rng: () => number;

  constructor(private readonly g: SideGame) {
    this.yard = new Yard(g);
    this.rng = () => g.random();
  }

  reset(): void {
    this.phase = 'pickup'; this.drive = null; this.failure = null; this.delivered = 0; this.damageTaken = 0; this.payout = 0; this.fine = 0;
    this.chased = false; this.pickupX = OUT.goranX; this.t = 0; this.cues.clear(); this.yard.reset();
  }

  get driving(): boolean { return this.phase === 'pickup' || this.phase === 'out' || this.phase === 'back'; }
  get crates(): number { return this.yard.trunk; }
  get damage(): number { return this.drive?.damage ?? this.damageTaken; }
  /** Noise meter for the HUD, 0 to 1, from how much cutting has been done. */
  get noise(): number { return clamp(this.yard.noiseEvents / 8, 0, 1); }

  begin(): void {
    const g = this.g;
    this.reset();
    g.stage = roadOutStage();
    this.drive = new Drive({ length: OUT.length, maxSpeed: HEIST.maxSpeedOut, finish: OUT.finish, start: OUT.start, density: 1.5, waves: [], rng: this.rng });
    this.drive.car.crew = 1;
    g.player.x = OUT.start;
    g.camera = clamp(OUT.start - 150, 0, OUT.length - WIDTH);
    g.cars = this.drive.all();
    g.say('msg.dd3Call');
  }

  private beginYard(): void {
    const g = this.g;
    this.damageTaken = this.drive?.damage ?? 0;
    g.stage = yardStage();
    this.yard.begin(this.rng);
    this.drive = null;
    this.phase = 'yard';
    g.transition = 0.45;
    g.camera = clamp(YARD.startX - WIDTH * 0.4, 0, YARD.length - WIDTH);
    g.cars = [{ id: 1, kind: 'taunus', x: YARD.carX, y: 214, dir: 1, speed: 0, state: 'stopped', timer: 0, stopAt: null, wheel: 0, handed: false, lights: false }];
    g.events.push('doors');
    g.say('msg.dd3Yard');
  }

  private beginBack(): void {
    const g = this.g;
    g.stage = roadBackStage();
    const crates = this.yard.trunk;
    this.chased = this.rng() < chaseChance(crates, this.yard.noiseEvents);
    this.drive = new Drive({
      length: BACK.length, maxSpeed: HEIST.maxSpeedBack, finish: BACK.finish, start: BACK.start, density: 1.6,
      waves: this.chased ? HEIST.waves : [], rng: this.rng,
    });
    this.drive.damage = 0;
    this.phase = 'back';
    g.transition = 0.45;
    g.player.x = BACK.start;
    g.camera = clamp(BACK.start - 150, 0, BACK.length - WIDTH);
    g.cars = this.drive.all();
    g.events.push('doors');
    g.say('msg.dd3Back');
  }

  private fail(reason: Failure): void {
    const g = this.g;
    if (this.phase === 'failed') return;
    this.phase = 'failed';
    this.failure = reason;
    this.damageTaken = this.drive?.damage ?? this.damageTaken;
    this.fine = Math.min(g.cash, HEIST.fine);
    g.cash -= this.fine;
    g.mode = 'defeat';
    g.events.push('defeat');
  }

  private finish(): void {
    const g = this.g;
    this.phase = 'done';
    this.delivered = this.yard.trunk;
    this.damageTaken = this.drive?.damage ?? 0;
    this.payout = payoutFor(this.delivered, this.damageTaken);
    g.cash += this.payout;
    g.mode = 'victory';
    g.events.push('cash', 'victory');
  }

  // ---------------------------------------------------------------- per frame

  update(dt: number): void {
    const g = this.g;
    this.t += dt;
    if (this.phase === 'pickup') {
      this.pickupX = Math.max(OUT.start - 30, this.pickupX - 62 * dt);
      if (this.pickupX <= OUT.start - 30) { this.phase = 'out'; if (this.drive) this.drive.car.crew = 2; g.events.push('doors'); }
      if (this.drive) g.cars = this.drive.all();
      return;
    }
    if (this.phase === 'out' || this.phase === 'back') { this.updateDriving(dt); return; }
    if (this.phase === 'yard') {
      const over = this.yard.update(dt);
      if (over) {
        if (this.yard.busted) this.fail(this.yard.busted === 'goran' ? 'goran' : 'busted');
        else this.beginBack();
      }
      return;
    }
  }

  private updateDriving(dt: number): void {
    const g = this.g, d = this.drive!;
    const input = g.input;
    d.update(dt, { throttle: input.x, lane: input.y < -0.5 ? -1 : input.y > 0.5 ? 1 : 0 });
    if (d.crashed) { g.events.push('crash'); g.shake = 6; g.say('msg.h.crash'); }
    for (const n of d.notes.splice(0)) { g.say(n === 'police' ? 'msg.h.gPolice' : 'msg.h.lost'); if (n === 'police') g.events.push('siren'); }
    g.player.x = d.car.x;
    g.cars = d.all();
    // The camera runs ahead of a fast car, and eases back when it slows.
    const want = clamp(d.car.x - 150 - d.car.speed * 0.18, 0, d.opts.length - WIDTH);
    g.camera += (want - g.camera) * Math.min(1, dt * 8);
    if (this.phase === 'out') {
      for (const [x, key] of OUT_CUES) if (d.car.x > x && !this.cues.has(x)) { this.cues.add(x); g.say(key); if (key === 'msg.dd3Lights') d.car.lights = false; }
    }
    if (d.ended) { this.fail(d.ended === 'wrecked' ? 'wrecked' : 'arrested'); return; }
    if (d.arrived) { if (this.phase === 'out') this.beginYard(); else this.finish(); }
  }

  // ---------------------------------------------------------------- interaction

  interaction(): { kind: HeistAction; label: string } | null {
    return this.phase === 'yard' ? this.yard.interaction() : null;
  }

  interact(): void { if (this.phase === 'yard') this.yard.interact(); }

  get objective(): string {
    switch (this.phase) {
      case 'pickup': return t('obj3.pickup');
      case 'out': return t('obj3.out');
      case 'yard': return this.yard.leaving ? t('obj3.leaving') : this.yard.trunk + this.yard.carry > 0 ? t('obj3.load', { n: this.yard.trunk }) : t('obj3.cut');
      case 'back': return this.chased && (this.drive?.police.length ?? 0) > 0 ? t('obj3.chase') : t('obj3.back');
      default: return t('obj3.back');
    }
  }

  /** All the cars to draw right now. */
  get cars(): Car[] { return this.g.cars; }
}
