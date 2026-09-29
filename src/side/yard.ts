import { BAND_BOTTOM, BAND_TOP } from './layout';
import { HEIST } from './heist-config';
import { PatrolCrew, type CrewHooks, type Patrol, type PatrolTuning, type Target } from './patrol';
import { DEFAULT_TUNING } from './patrol';
import { YARD } from './heist-stages';
import { t } from './i18n';
import type { TruckTone } from './vehicle-art';
import type { SideGame } from './game';

// The truck park at night: trailers to cut open, Goran working beside D.D and watching for police,
// and patrols whose view the trailers block.

export const TRUCK_Y = 206;
/** The trailer runs from -104 to +55 around its centre, and the tractor unit on to +104. */
export const TRAILER = { back: -104, front: 55, cab: 104 };
/** Where you stand to work on a trailer: in front of it, on the near side. */
export const WORK_Y = { min: TRUCK_Y + 3, max: TRUCK_Y + 40 };

export type TruckState = 'closed' | 'cutting' | 'cut';
export interface Truck { id: number; x: number; y: number; tone: TruckTone; state: TruckState; cut: number; crates: number; claim: 'dd' | 'goran' | null }
export type BuddyState = 'follow' | 'go' | 'cut' | 'grab' | 'haul' | 'hide' | 'board' | 'cuffed';
export interface Buddy {
  x: number; y: number; z: number; facing: 1 | -1; walk: number; moving: boolean;
  state: BuddyState; carry: number; truck: number | null; timer: number; quiet: number; whistle: number;
}
export type YardAction = 'cut' | 'grab' | 'load' | 'drive';

const TUNING: PatrolTuning = { ...DEFAULT_TUNING, sight: 200, chaseSpeed: 92, grabTime: 0.4, suspicionRate: 1.25 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class Yard {
  trucks: Truck[] = [];
  goran!: Buddy;
  readonly crew = new PatrolCrew(TUNING);
  /** Crates in the Taunus's boot. */
  trunk = 0;
  /** What D.D is carrying. */
  carry = 0;
  /** Cuts and grabs so far: the more noise, the likelier the chase on the way back. */
  noiseEvents = 0;
  /** True while someone is cutting or grabbing. */
  noisy = false;
  /** Progress of the current cut or grab, 0 to 1. */
  work = 0;
  /** D.D is out of the police's sight, crouched behind a trailer. */
  hidden = false;
  /** D.D and Goran are heading for the car. */
  leaving = false;
  /** Seconds in handcuffs before the job is called off. */
  bust = 0;
  busted: 'dd' | 'goran' | null = null;
  private leaveTimer = 0;
  private readonly hooks: CrewHooks;

  constructor(private readonly g: SideGame) {
    const yard = this;
    this.hooks = {
      targets: () => yard.targets(),
      blocked: (o, tg) => yard.blockedByTruck(o, tg),
      noise: o => yard.noiseFor(o),
      onAlarm: () => { yard.g.say('msg.h.spotted'); },
      onCaught: (o, tg) => yard.caught(o, tg),
      get events() { return yard.g.events; },
    };
  }

  get patrols(): Patrol[] { return this.crew.patrols; }

  reset(): void {
    this.trucks = []; this.crew.patrols = []; this.trunk = 0; this.carry = 0; this.noiseEvents = 0; this.noisy = false; this.work = 0;
    this.hidden = false; this.leaving = false; this.leaveTimer = 0; this.bust = 0; this.busted = null;
    this.goran = { x: YARD.carX + 40, y: 224, z: 0, facing: 1, walk: 0, moving: false, state: 'follow', carry: 0, truck: null, timer: 0, quiet: 0, whistle: 0 };
  }

  /** Lays out the yard: six tarpaulin trailers in a row and four patrols, all from the game's random source. */
  begin(rng: () => number): void {
    this.reset();
    const [lo, hi] = HEIST.cratesPerTruck;
    this.trucks = [830, 1330, 1830, 2330, 2830, 3330].map((x, i) => ({
      id: i + 1, x, y: TRUCK_Y, tone: Math.floor(rng() * 3) as TruckTone, state: 'closed' as TruckState, cut: 0, crates: lo + Math.floor(rng() * (hi - lo + 1)), claim: null,
    }));
    const beats: Array<[number, number, number]> = [[520, 1500, 228], [900, 2050, 190], [1800, 2900, 236], [2500, 3560, 191]];
    this.crew.patrols = beats.slice(0, HEIST.patrols).map(([x0, x1, y], i) => ({
      id: i + 1, x: x0 + rng() * (x1 - x0), y, z: 0, facing: rng() > 0.5 ? 1 : -1, walk: rng() * 6, x0, x1,
      state: 'walk' as const, timer: 0, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0,
    }));
    const p = this.g.player;
    Object.assign(p, { x: YARD.startX, y: 226, z: 0, vx: 0, vz: 0, facing: 1, cuffTimer: 0, dodgeTimer: 0, invulnerable: 0 });
  }

  // ---------------------------------------------------------------- what the police can see

  private targets(): Target[] {
    const g = this.g, p = g.player, b = this.goran;
    const list: Target[] = [{
      id: 'dd', x: p.x, y: p.y, z: p.z, moving: p.moving, sneaking: g.sneaking, hidden: this.hidden, visible: true,
      catchable: p.z < 10 && p.dodgeTimer <= 0 && p.cuffTimer <= 0 && p.hp > 0,
    }];
    if (b.state !== 'board') list.push({ id: 'goran', x: b.x, y: b.y, z: 0, moving: b.moving, sneaking: false, hidden: b.state === 'hide' && !b.moving, visible: true, catchable: b.state !== 'cuffed' });
    return list;
  }

  /** A trailer between officer and target, on opposite sides of its length, blocks the view. */
  private blockedByTruck(o: Patrol, t: Target): boolean {
    for (const tr of this.trucks) {
      const a = o.y - tr.y, b = t.y - tr.y;
      if (a * b >= 0) continue;
      const crossX = o.x + (t.x - o.x) * (tr.y - o.y) / (t.y - o.y);
      if (crossX > tr.x + TRAILER.back && crossX < tr.x + TRAILER.cab) return true;
    }
    return false;
  }

  /** Cutting and grabbing is loud: the nearest noisy person within earshot. */
  private noiseFor(o: Patrol): { x: number; radius: number } | null {
    const src: number[] = [];
    if (this.noisy) src.push(this.g.player.x);
    const b = this.goran;
    if (b.state === 'cut' || b.state === 'grab') src.push(b.x);
    const near = src.filter(x => Math.abs(x - o.x) < HEIST.noiseRadius).sort((a, c) => Math.abs(a - o.x) - Math.abs(c - o.x))[0];
    return near === undefined ? null : { x: near, radius: HEIST.noiseRadius };
  }

  private caught(o: Patrol, t: Target): void {
    const g = this.g;
    this.busted = t.id === 'goran' ? 'goran' : 'dd';
    if (t.id === 'goran') this.goran.state = 'cuffed';
    else { g.player.cuffTimer = 1.8; g.player.vx = 0; g.player.dodgeTimer = 0; }
    this.bust = 1.8;
    this.crew.calm(o);
    g.events.push('cuff');
    g.say(t.id === 'goran' ? 'msg.h.goranBusted' : 'msg.h.ddBusted');
  }

  // ---------------------------------------------------------------- D.D's work

  private truckNear(x: number, y: number): Truck | undefined {
    if (y < WORK_Y.min - 2 || y > WORK_Y.max) return undefined;
    return this.trucks.filter(tr => x > tr.x + TRAILER.back + 10 && x < tr.x + TRAILER.front + 30)
      .sort((a, b) => Math.abs(a.x - 24 - x) - Math.abs(b.x - 24 - x))[0];
  }

  private get carX(): number { return YARD.carX; }

  interaction(): { kind: YardAction; label: string; truck?: Truck } | null {
    const g = this.g, p = g.player;
    if (g.transition > 0 || g.mode !== 'playing' || this.bust > 0 || this.leaving || p.z > 0 || p.cuffTimer > 0) return null;
    if (Math.abs(p.x - this.carX) < 70 && p.y > 190) {
      if (this.carry > 0) return { kind: 'load', label: t('act3.load', { n: this.carry }) };
      if (this.trunk > 0) return { kind: 'drive', label: t('act3.drive', { crates: this.trunk }) };
    }
    const tr = this.truckNear(p.x, p.y);
    if (!tr) return null;
    if (tr.state !== 'cut') return { kind: 'cut', label: t('act3.cut'), truck: tr };
    if (tr.crates > 0 && this.carry < HEIST.carryMax) return { kind: 'grab', label: t('act3.grab', { n: tr.crates }), truck: tr };
    return null;
  }

  /** A tap of E: loads the boot or drives off; on a truck, a quick tap adds to the cut for anyone using the mouse. */
  interact(): void {
    const a = this.interaction();
    if (!a) return;
    const g = this.g;
    if (a.kind === 'load') {
      this.trunk = Math.min(HEIST.trunk, this.trunk + this.carry);
      this.carry = 0;
      g.events.push('crate');
      g.say('msg.h.loaded', { n: this.trunk });
    } else if (a.kind === 'drive') {
      this.leaving = true; this.leaveTimer = 0;
      this.goran.state = 'board'; this.goran.truck = null;
      g.say('msg.h.leaving');
    } else if (a.truck) this.applyWork(a.truck, a.kind, 0.6);
  }

  /** Cutting or grabbing by D.D: hold E in reach of a trailer. */
  private applyWork(tr: Truck, kind: 'cut' | 'grab', amount: number): void {
    const g = this.g;
    tr.claim = 'dd';
    this.noisy = true;
    if (kind === 'cut') {
      const before = tr.cut;
      tr.cut = Math.min(1, tr.cut + amount / HEIST.cutTime);
      tr.state = tr.cut >= 1 ? 'cut' : 'cutting';
      if (before < 1 && tr.cut >= 1) { this.noiseEvents++; g.events.push('tear'); g.say('msg.h.opened'); this.work = 0; }
      else if (Math.floor(before * 8) !== Math.floor(tr.cut * 8)) g.events.push('tear');
      this.work = tr.cut;
    } else {
      this.work = Math.min(1, this.work + amount / HEIST.grabTime);
      if (this.work >= 1) {
        this.work = 0; tr.crates--; this.carry++; this.noiseEvents += 0.4; g.events.push('crate');
      }
    }
  }

  // ---------------------------------------------------------------- per frame

  /** Returns true when the whole job is over. */
  update(dt: number): boolean {
    const g = this.g, p = g.player;
    g.hasPackage = this.carry > 0;
    this.noisy = false;
    if (this.bust > 0) {
      this.bust -= dt;
      this.crew.update(dt, this.hooks);
      this.updateGoran(dt);
      return this.bust <= 0;
    }
    // D.D holds E in reach of a trailer.
    const a = this.interaction();
    let worked: Truck | null = null;
    if (g.using && a?.truck && (a.kind === 'cut' || a.kind === 'grab') && !p.moving) { this.applyWork(a.truck, a.kind, dt); worked = a.truck; }
    else this.work = a?.kind === 'cut' && a.truck ? a.truck.cut : 0;
    // A trailer D.D has walked away from is free for Goran again.
    for (const tr of this.trucks) if (tr.claim === 'dd' && tr !== worked) tr.claim = null;
    this.hidden = g.sneaking && !p.moving && p.z <= 0 && !!this.trucks.find(tr => p.y < tr.y - 1 && p.x > tr.x + TRAILER.back && p.x < tr.x + TRAILER.cab);
    this.updateGoran(dt);
    this.crew.update(dt, this.hooks);
    if (this.leaving) {
      this.leaveTimer += dt;
      const b = this.goran;
      if ((Math.abs(b.x - this.carX) < 26 && b.state === 'board') || this.leaveTimer > 7) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- Goran

  private danger(): Patrol | undefined {
    const b = this.goran;
    return this.crew.patrols.find(o => o.state !== 'cuff' && Math.abs(o.x - b.x) < 300 && Math.abs(o.y - b.y) < 70
      && (o.state === 'chase' || o.state === 'alert' || o.state === 'search' || (b.x - o.x) * o.facing > 0));
  }

  private walkTo(b: Buddy, x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - b.x, dy = y - b.y;
    const step = speed * dt;
    b.moving = Math.abs(dx) > 2 || Math.abs(dy) > 2;
    if (Math.abs(dx) > 1) { b.x += clamp(dx, -step, step); b.facing = dx > 0 ? 1 : -1; }
    if (Math.abs(dy) > 1) b.y = clamp(b.y + clamp(dy, -step * 0.65, step * 0.65), BAND_TOP, BAND_BOTTOM);
    if (b.moving) b.walk += dt * 10;
    return Math.abs(dx) <= 2 && Math.abs(dy) <= 2;
  }

  private updateGoran(dt: number): void {
    const g = this.g, b = this.goran, p = g.player;
    b.whistle = Math.max(0, b.whistle - dt);
    b.moving = false;
    if (b.state === 'cuffed') return;
    if (b.state === 'board') { this.walkTo(b, this.carX + 6, 226, 96, dt); return; }
    const danger = this.danger();
    if (danger) {
      b.quiet = 0;
      if (b.state !== 'hide') { b.state = 'hide'; b.truck = null; }
      if (b.whistle <= 0) { b.whistle = 6; g.events.push('whistle'); g.say('msg.h.gPolis'); }
    }
    if (b.state === 'hide') {
      // Behind the nearest trailer, out of sight.
      const tr = [...this.trucks].sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
      if (tr) this.walkTo(b, clamp(b.x, tr.x - 80, tr.x + 30), tr.y - 12, 100, dt);
      if (!danger) { b.quiet += dt; if (b.quiet > 2) b.state = 'follow'; }
      return;
    }
    // Free: find work if D.D has started on a trailer, or fall in behind him.
    if (b.state === 'follow') {
      const wants = this.trucks.filter(tr => tr.state !== 'cut' && tr.claim !== 'dd' && Math.abs(tr.x - p.x) < 800 && Math.abs(tr.x - p.x) > 160)
        .sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
      const ddWorking = this.trucks.some(tr => tr.claim === 'dd' && tr.state !== 'closed');
      if (wants && ddWorking && this.trunk + this.carry < HEIST.trunk) { b.state = 'go'; b.truck = wants.id; wants.claim = 'goran'; }
      else this.walkTo(b, p.x - p.facing * 55, clamp(p.y + 8, BAND_TOP + 6, BAND_BOTTOM - 4), 88, dt);
      return;
    }
    const tr = this.trucks.find(x => x.id === b.truck);
    if (b.state === 'go') {
      if (!tr || tr.claim === 'dd') { b.state = 'follow'; return; }
      if (this.walkTo(b, tr.x - 24, tr.y + 20, 88, dt)) { b.state = tr.state === 'cut' ? 'grab' : 'cut'; b.timer = 0; }
    } else if (b.state === 'cut') {
      if (!tr) { b.state = 'follow'; return; }
      b.timer += dt;
      tr.cut = Math.min(1, b.timer / (HEIST.cutTime * 1.2));
      tr.state = tr.cut >= 1 ? 'cut' : 'cutting';
      if (tr.cut >= 1) { this.noiseEvents++; g.events.push('tear'); b.state = 'grab'; b.timer = 0; }
    } else if (b.state === 'grab') {
      if (!tr) { b.state = 'follow'; return; }
      b.timer += dt;
      if (b.timer >= HEIST.grabTime * 1.1) {
        b.timer = 0;
        if (tr.crates > 0 && b.carry < HEIST.carryMax) { tr.crates--; b.carry++; this.noiseEvents += 0.4; g.events.push('crate'); }
        if (tr.crates <= 0 || b.carry >= HEIST.carryMax) { b.state = 'haul'; tr.claim = null; }
      }
    } else if (b.state === 'haul') {
      if (this.walkTo(b, this.carX + 4, 228, 70, dt)) {
        this.trunk = Math.min(HEIST.trunk, this.trunk + b.carry);
        b.carry = 0; g.events.push('crate');
        b.state = 'follow'; b.truck = null;
      }
    }
  }
}
