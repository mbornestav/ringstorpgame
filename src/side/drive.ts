import { HEIST } from './heist-config';
import type { Car } from './game';

// The driving model for Level 3: two lanes, one direction, slow traffic to overtake, and (on the
// way back) police who chase you up the road. Pure logic: no drawing, no DOM.

export const LANE_FAR = 206, LANE_NEAR = 244;
export const HALF: Record<string, number> = { taunus: 52, civil: 50, truck: 104, police: 53, bmw: 50 };

export interface DriveInput { throttle: number; lane: -1 | 0 | 1 }
export type DriveEnd = 'wrecked' | 'arrested' | null;

interface Rng { (): number }

export interface DriveOptions {
  length: number;
  maxSpeed: number;
  /** Where the trip ends, and the car is brought to a stop. */
  finish: number;
  start: number;
  /** Traffic per 1000 px of road ahead. */
  density: number;
  /** Seconds after the start at which a wave of police cars appears behind you; empty for none. */
  waves: readonly number[];
  rng: Rng;
}

export class Drive {
  readonly car: Car;
  traffic: Car[] = [];
  police: Car[] = [];
  damage = 0;
  /** Seconds until a collision can hurt again. */
  hitCooldown = 0;
  /** Seconds until a police car can ram again. */
  ramCooldown = 0;
  /** How long the police have had you boxed in, in seconds. */
  boxed = 0;
  time = 0;
  ended: DriveEnd = null;
  arrived = false;
  /** Set on a collision, for the screen shake and the crash sound. */
  crashed = false;
  private lane: 0 | 1 = 1;
  private laneFrom = LANE_NEAR;
  private laneTo = LANE_NEAR;
  private laneT = 1;
  private nextId = 100;
  private waveIndex = 0;
  private lostFor = new Map<number, number>();
  /** Messages for the game to show: 'police' when the first wave appears, 'lost' when they are gone. */
  notes: string[] = [];
  private hadPolice = false;

  constructor(readonly opts: DriveOptions) {
    this.car = { id: 1, kind: 'taunus', x: opts.start, y: LANE_NEAR, dir: 1, speed: 0, state: 'driving', timer: 0, stopAt: null, wheel: 0, handed: false, lights: true };
    this.seedTraffic();
  }

  get laneOfCar(): 0 | 1 { return this.lane; }
  get changingLane(): boolean { return this.laneT < 1; }

  /** Everything on the road, for drawing. */
  all(): Car[] { return [...this.traffic, ...this.police, this.car]; }

  private seedTraffic(): void {
    const o = this.opts;
    for (let x = o.start + 500; x < o.finish - 600; x += 1000 / o.density * (0.7 + o.rng() * 0.6)) this.spawn(x);
  }

  private spawn(x: number): void {
    const o = this.opts, lane = o.rng() > 0.5 ? 1 : 0;
    const y = lane ? LANE_NEAR : LANE_FAR;
    const truck = o.rng() < 0.22;
    const kind = truck ? 'truck' : 'civil';
    const half = HALF[kind];
    if (this.traffic.some(t => t.y === y && Math.abs(t.x - x) < half + HALF[t.kind] + 260)) return;
    this.traffic.push({
      id: this.nextId++, kind, x, y, dir: 1, speed: truck ? 95 + o.rng() * 45 : 115 + o.rng() * 85,
      state: 'driving', timer: 0, stopAt: null, wheel: 0, handed: false, tone: Math.floor(o.rng() * 8), lights: true, len: half * 2,
    });
  }

  update(dt: number, input: DriveInput): void {
    if (this.ended) return;
    const o = this.opts, car = this.car;
    this.time += dt;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.ramCooldown = Math.max(0, this.ramCooldown - dt);
    this.crashed = false;
    // Speed: throttle, brake, or coast.
    if (input.throttle > 0) car.speed += HEIST.accel * input.throttle * dt;
    else if (input.throttle < 0) car.speed -= HEIST.brake * -input.throttle * dt;
    else car.speed -= HEIST.drag * dt;
    let cap = o.maxSpeed;
    // Coming into the gate or the garage, the car slows itself.
    const toGo = o.finish - car.x;
    if (toGo < 500) cap = Math.min(cap, Math.max(70, toGo * 0.75));
    car.speed = Math.max(0, Math.min(cap, car.speed));
    car.braking = input.throttle < 0 || car.speed < 4;
    car.x += car.speed * dt;
    car.wheel += car.speed * dt / 7;
    // Lane changes take a moment, and cannot be undone half way.
    if (this.laneT >= 1) {
      if (input.lane < 0 && this.lane === 1) this.startLane(0);
      else if (input.lane > 0 && this.lane === 0) this.startLane(1);
    }
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / HEIST.laneTime);
      const e = this.laneT * this.laneT * (3 - 2 * this.laneT);
      car.y = this.laneFrom + (this.laneTo - this.laneFrom) * e;
    }
    this.updateTraffic(dt);
    this.updatePolice(dt);
    this.collide(car, this.traffic);
    if (this.damage >= HEIST.wreckAt) { this.ended = 'wrecked'; return; }
    if (this.boxed >= HEIST.boxedAfter) { this.ended = 'arrested'; return; }
    if (car.x >= o.finish - 6 && car.speed < 90) { this.arrived = true; car.speed = 0; }
  }

  private startLane(lane: 0 | 1): void {
    this.lane = lane;
    this.laneFrom = this.car.y;
    this.laneTo = lane ? LANE_NEAR : LANE_FAR;
    this.laneT = 0;
  }

  private updateTraffic(dt: number): void {
    const car = this.car, o = this.opts;
    for (const t of this.traffic) {
      // Nobody drives through the car in front.
      const ahead = this.traffic.filter(u => u !== t && u.y === t.y && u.x > t.x && u.x - t.x < 220).sort((a, b) => a.x - b.x)[0];
      if (ahead && ahead.x - t.x < 160 && ahead.speed < t.speed) t.speed = ahead.speed;
      t.x += t.speed * dt;
      t.wheel += t.speed * dt / 7;
    }
    this.traffic = this.traffic.filter(t => t.x > car.x - 520);
    // Keep the road ahead populated.
    const gap = 1000 / o.density;
    const furthest = this.traffic.reduce((m, t) => Math.max(m, t.x), car.x);
    if (furthest < car.x + 1500 && car.x < o.finish - 900 && o.rng() < dt * 2) this.spawn(Math.max(furthest, car.x + 1100) + gap * (0.5 + o.rng() * 0.8));
  }

  private updatePolice(dt: number): void {
    const o = this.opts, car = this.car;
    if (this.waveIndex < o.waves.length && this.time >= o.waves[this.waveIndex]) {
      const cars = this.waveIndex === 0 ? 1 : 2;
      for (let i = 0; i < cars; i++) {
        const lane = o.rng() > 0.5 ? LANE_NEAR : LANE_FAR;
        this.police.push({
          id: this.nextId++, kind: 'police', x: car.x - 330 - i * 170, y: lane, dir: 1, speed: Math.max(car.speed * 0.9, 200), state: 'driving',
          timer: 0, stopAt: null, wheel: 0, handed: false, lights: true, siren: true,
        });
      }
      this.waveIndex++;
      if (!this.hadPolice) { this.hadPolice = true; this.notes.push('police'); }
    }
    let boxedNow = false;
    for (const p of this.police) {
      const gap = car.x - p.x;
      const target = gap > 60 ? Math.min(HEIST.policeMax, car.speed * 1.04 + gap * 0.12 + 30) : Math.max(car.speed * 0.98, 20);
      p.speed += Math.max(-420 * dt, Math.min(260 * dt, target - p.speed));
      // They pull into your lane as they close, and swing round anything slower in their way.
      const blocker = this.traffic.find(t => t.y === p.y && t.x > p.x && t.x - p.x < 150);
      const wantY = blocker ? (p.y === LANE_NEAR ? LANE_FAR : LANE_NEAR) : gap < 320 ? car.y : p.y;
      p.y += Math.max(-90 * dt, Math.min(90 * dt, wantY - p.y));
      p.x += p.speed * dt;
      p.wheel += p.speed * dt / 7;
      if (Math.abs(gap) < 76 && Math.abs(p.y - car.y) < 40) boxedNow = true;
      this.collide(p, this.traffic, false);
      // A ram from behind.
      if (this.hitCooldown <= 0 && this.ramCooldown <= 0 && gap > 0 && gap < HALF.police + HALF.taunus - 8 && Math.abs(p.y - car.y) < 14 && p.speed > car.speed + 15) {
        this.hit(car, p);
        this.ramCooldown = 4;
        p.speed = Math.max(0, p.speed - 140);
      }
      // Out of sight for long enough, and they give up.
      const lost = gap > HEIST.lostGap;
      this.lostFor.set(p.id, lost ? (this.lostFor.get(p.id) ?? 0) + dt : 0);
    }
    if (boxedNow && car.speed < 120) this.boxed += dt; else this.boxed = Math.max(0, this.boxed - dt * 0.7);
    const before = this.police.length;
    this.police = this.police.filter(p => (this.lostFor.get(p.id) ?? 0) < HEIST.lostAfter);
    if (before > 0 && this.police.length === 0 && this.waveIndex >= o.waves.length) this.notes.push('lost');
  }

  /** Bumping traffic costs speed and a point of damage; police shrug off the same bump. */
  private collide(a: Car, others: Car[], hurts = true): void {
    for (const b of others) {
      if (b === a) continue;
      const reach = (HALF[a.kind] + HALF[b.kind]) * 0.9;
      if (Math.abs(a.x - b.x) < reach && Math.abs(a.y - b.y) < 14) {
        if (hurts) { if (this.hitCooldown <= 0) this.hit(a, b); }
        else if (a.x <= b.x) { a.speed = Math.min(a.speed, b.speed); a.x = Math.min(a.x, b.x - reach); }
      }
    }
  }

  private hit(a: Car, b: Car): void {
    if (a === this.car) {
      this.damage++;
      this.hitCooldown = HEIST.hitCooldown;
      this.crashed = true;
      a.speed = Math.max(0, Math.min(a.speed, b.speed) * 0.55);
      if (b.kind !== 'police') b.speed += 25;
      // Shove clear so the same bump doesn't count twice.
      if (b.x > a.x) b.x = Math.max(b.x, a.x + (HALF[a.kind] + HALF[b.kind]) * 0.9);
    }
  }
}
