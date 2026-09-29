import { BAND_BOTTOM, BAND_TOP, WIDTH } from './layout';
import { CAST } from './gods-cast';
import { GODS_DOOR_X, GODS_START_X } from './gods-stage';
import { t, type Key } from './i18n';
import { PatrolCrew, type CrewHooks, type Patrol, type PatrolState, type Target } from './patrol';
import type { SideGame } from './game';
import { TOP_FLOOR, LOBBY_EXIT_X, LOBBY_LIFT_X, FLOOR_LIFT_X, DD_X, CABIN_X } from './interior-layout';
export { TOP_FLOOR, LOBBY_EXIT_X, LOBBY_LIFT_X, FLOOR_LIFT_X, DD_X, CABIN_X } from './interior-layout';

export { SIGHT_RANGE, SNEAK_SIGHT, HIDDEN_SIGHT, HEARING, PATROL_SPEED, CHASE_SPEED, GRAB_TIME } from './patrol';
export type { Patrol, PatrolState } from './patrol';

// Level 2: carrying Gods home from Kurirgatan 28D without fighting. Patrols watch the street and
// notice you only while the Gods are on your back; crouch behind cover, stash them, or keep out of sight.

export const FINE_KR = 150;
export const SPOT_REACH = 24;
export const payoutFor = (assignment: number) => Math.min(800, 300 + 100 * (assignment - 1));
export const patrolCount = (assignment: number) => 3 + Math.min(assignment - 1, 3);

export type Cargo = 'none' | 'carried' | 'stashed';
export type Scene = 'street' | 'lobby' | 'cabin' | 'floor';
export type GodsAction = 'enter' | 'exit' | 'lift' | 'step' | 'stash' | 'collect' | 'talk' | 'dd' | 'deliver';
export interface FloorNpc { id: string; x: number; y: number; facing: 1 | -1; talked: number }
export interface Ride { from: number; to: number; t: number; dur: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t0 = Math.imul(a ^ (a >>> 15), 1 | a);
    t0 = (t0 + Math.imul(t0 ^ (t0 >>> 7), 61 | t0)) ^ t0;
    return ((t0 ^ (t0 >>> 14)) >>> 0) / 4294967296;
  };
}

export class GodsRun {
  assignment = 1;
  cargo: Cargo = 'none';
  stashX: number | null = null;
  scene: Scene = 'street';
  floor = 0;
  ride: Ride | null = null;
  npcs: FloorNpc[] = [];
  /** Crouching out of sight behind cover. */
  hidden = false;
  /** D.D has handed over this assignment's Gods. */
  received = false;
  /** Times a patrol has noticed you on this run. */
  spotted = 0;
  fines = 0;
  payout = 0;
  /** Seconds left in handcuffs before the assignment restarts. */
  bust = 0;
  private seed = 1;
  private retries = 0;

  private readonly crew = new PatrolCrew();
  private readonly hooks: CrewHooks;

  constructor(private readonly g: SideGame) {
    const run = this;
    this.hooks = {
      targets: () => [run.target()],
      onAlarm: () => { run.spotted++; run.g.say('msg.spotted'); },
      onCaught: () => run.caught(),
      onSearch: o => {
        // A searching officer who passes close to your stash finds it.
        if (run.cargo === 'stashed' && run.stashX !== null && Math.abs(o.x - run.stashX) < 50) {
          run.cargo = 'none'; run.stashX = null; run.g.events.push('warn'); run.g.say('msg.g2StashFound');
        }
      },
      get events() { return run.g.events; },
    };
  }

  /** The patrols watching the street. */
  get patrols(): Patrol[] { return this.crew.patrols; }

  /** Marcus as the police see him: only conspicuous while the Gods are on his back. */
  private target(): Target {
    const p = this.g.player;
    return { id: 'p', x: p.x, y: p.y, z: p.z, moving: p.moving, sneaking: this.g.sneaking, hidden: this.hidden, visible: this.carrying, catchable: p.z < 10 && p.dodgeTimer <= 0 && p.cuffTimer <= 0 && p.hp > 0 };
  }

  reset(): void {
    this.assignment = 1; this.cargo = 'none'; this.stashX = null; this.scene = 'street'; this.floor = 0; this.ride = null;
    this.crew.patrols = []; this.npcs = []; this.hidden = false; this.received = false; this.spotted = 0; this.fines = 0; this.payout = 0;
    this.bust = 0; this.retries = 0;
  }

  /** Begins an assignment outside Kurirgatan 28D, with D.D on the phone. */
  begin(assignment: number): void {
    this.reset();
    this.assignment = assignment;
    this.seed = Math.floor(this.g.random() * 1e9);
    this.placeOutside(GODS_START_X);
    this.spawnPatrols();
    this.g.say('msg.dd2Call');
  }

  private placeOutside(x: number): void {
    const g = this.g, p = g.player;
    Object.assign(p, { x, y: BAND_TOP + 38, z: 0, vx: 0, vz: 0, facing: 1, cuffTimer: 0, dodgeTimer: 0, invulnerable: 0 });
    g.camera = clamp(x - WIDTH * 0.4, 0, g.stage.length - WIDTH);
  }

  private spawnPatrols(): void {
    const rng = seeded(this.seed + this.retries * 7919);
    const n = patrolCount(this.assignment), from = 1350, to = this.g.stage.homeX - 600, step = (to - from) / n;
    this.crew.patrols = Array.from({ length: n }, (_, i) => {
      const centre = from + step * (i + 0.5) + (rng() - 0.5) * step * 0.4, half = 130 + rng() * 90;
      const x = centre + (rng() - 0.5) * half;
      return {
        id: i + 1, x, y: 198 + Math.round(rng() * 34), z: 0, facing: rng() > 0.5 ? 1 : -1, walk: rng() * 6,
        x0: centre - half, x1: centre + half, state: 'walk' as PatrolState, timer: 0, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0,
      };
    });
  }

  // ---------------------------------------------------------------- floors and people

  /** The people on a floor: a random few from the cast, and D.D on the top floor. Seeded, so a floor stays the same within a run. */
  private populate(floor: number): void {
    const rng = seeded(this.seed * 31 + floor * 97 + this.retries * 13);
    const count = floor === TOP_FLOOR ? Math.floor(rng() * 2) : 1 + Math.floor(rng() * 3);
    const npcs: FloorNpc[] = [];
    const pool = [...CAST];
    for (let i = 0; i < count; i++) {
      const [a] = pool.splice(Math.floor(rng() * pool.length), 1);
      let x = 0;
      for (let tries = 0; tries < 12; tries++) {
        x = 130 + rng() * 320;
        if (npcs.every(o => Math.abs(o.x - x) > 70) && !(floor === TOP_FLOOR && Math.abs(x - DD_X) < 70)) break;
      }
      npcs.push({ id: a.id, x, y: 196 + Math.round(rng() * 34), facing: rng() > 0.5 ? 1 : -1, talked: 0 });
    }
    if (floor === TOP_FLOOR) npcs.push({ id: 'dd', x: DD_X, y: 214, facing: -1, talked: 0 });
    this.npcs = npcs;
  }

  // ---------------------------------------------------------------- stepping through the world

  private go(scene: Scene, x: number, y: number): void {
    const g = this.g;
    this.scene = scene;
    g.player.x = x; g.player.y = y; g.player.vx = 0; g.player.facing = 1;
    g.transition = 0.35;
    this.hidden = false;
    g.events.push('doors');
    g.camera = scene === 'street' ? clamp(x - WIDTH * 0.4, 0, g.stage.length - WIDTH) : 0;
  }

  pressFloor(n: number): boolean {
    if (this.scene !== 'cabin' || this.ride || this.g.transition > 0 || !Number.isInteger(n) || n < 0 || n > TOP_FLOOR) return false;
    if (n === this.floor) return false;
    this.ride = { from: this.floor, to: n, t: 0, dur: 0.9 + 0.32 * Math.abs(n - this.floor) };
    this.g.events.push('lift');
    return true;
  }

  private coverAt(x: number) { return this.g.stage.spots.find(s => Math.abs(s.x - x) < SPOT_REACH); }

  // ---------------------------------------------------------------- interaction

  interaction(): { kind: GodsAction; label: string } | null {
    const g = this.g, p = g.player;
    if (g.transition > 0 || g.mode !== 'playing' || this.bust > 0 || this.ride) return null;
    if (p.z > 0 || p.cuffTimer > 0) return null;
    switch (this.scene) {
      case 'street': {
        if (Math.abs(p.x - GODS_DOOR_X) < 26 && p.y < BAND_TOP + 46) return { kind: 'enter', label: t('act2.enter') };
        if (this.cargo === 'carried' && Math.abs(p.x - g.stage.homeX) < 22 && p.y < BAND_TOP + 30) return { kind: 'deliver', label: t('act2.deliver') };
        if (this.cargo === 'stashed' && this.stashX !== null && Math.abs(p.x - this.stashX) < SPOT_REACH + 6) return { kind: 'collect', label: t('act2.collect') };
        if (this.cargo === 'carried' && this.coverAt(p.x)) return { kind: 'stash', label: t('act2.stash') };
        return null;
      }
      case 'lobby':
        if (p.x < LOBBY_EXIT_X + 30) return { kind: 'exit', label: t('act2.exit') };
        if (p.x > LOBBY_LIFT_X - 44) return { kind: 'lift', label: t('act2.lift') };
        return this.npcNear() ? { kind: 'talk', label: t('act2.talk') } : null;
      case 'cabin':
        return { kind: 'step', label: this.floor === 0 ? t('act2.lobby') : t('act2.stepOut', { floor: this.floor }) };
      default: {
        const npc = this.npcNear();
        if (npc?.id === 'dd') return { kind: 'dd', label: t('act2.dd') };
        if (npc) return { kind: 'talk', label: t('act2.talk') };
        if (p.x < FLOOR_LIFT_X + 36) return { kind: 'lift', label: t('act2.lift') };
        return null;
      }
    }
  }

  private npcNear(): FloorNpc | undefined {
    const p = this.g.player;
    return this.npcs.filter(n => Math.abs(n.x - p.x) < 40 && Math.abs(n.y - p.y) < 30).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  }

  interact(): void {
    const action = this.interaction();
    if (!action) return;
    const g = this.g, p = g.player;
    switch (action.kind) {
      case 'enter': this.floor = 0; this.populate(0); this.go('lobby', 84, 216); g.say('msg.dd2Lift'); break;
      case 'exit': this.go('street', GODS_DOOR_X, BAND_TOP + 40); break;
      case 'lift': this.go('cabin', CABIN_X, 222); g.say('msg.cabinHint'); break;
      case 'step':
        this.populate(this.floor);
        if (this.floor === 0) this.go('lobby', LOBBY_LIFT_X - 60, 216);
        else this.go('floor', FLOOR_LIFT_X + 40, 214);
        break;
      case 'stash':
        this.cargo = 'stashed'; this.stashX = p.x; g.events.push('pickup'); g.say('msg.g2Stashed'); break;
      case 'collect':
        this.cargo = 'carried'; this.stashX = null; g.events.push('parcel'); g.say('msg.g2Collected'); break;
      case 'talk': {
        const npc = this.npcNear();
        if (!npc) break;
        npc.facing = p.x >= npc.x ? 1 : -1;
        g.say(`npc.${npc.id}.${npc.talked % 2 + 1}` as Key);
        npc.talked++;
        break;
      }
      case 'dd':
        if (!this.received) { this.received = true; this.cargo = 'carried'; g.events.push('gun'); g.say('msg.dd2Gods'); }
        else g.say('msg.dd2Go');
        break;
      case 'deliver': {
        this.payout = payoutFor(this.assignment);
        g.cash += this.payout;
        this.cargo = 'none';
        g.mode = 'victory';
        g.events.push('cash', 'victory');
        break;
      }
    }
    g.hasPackage = this.cargo === 'carried';
  }

  get objective(): string {
    if (this.scene !== 'street') return t(this.received ? 'obj2.out' : 'obj2.lift');
    if (this.cargo === 'carried') return t('obj2.home');
    if (this.cargo === 'stashed') return t('obj2.collect');
    return t(this.received ? 'obj2.home' : 'obj2.up');
  }

  // ---------------------------------------------------------------- per-frame

  update(dt: number): void {
    const g = this.g, p = g.player;
    g.hasPackage = this.cargo === 'carried';
    if (this.ride) {
      this.ride.t += dt;
      if (this.ride.t >= this.ride.dur) { this.floor = this.ride.to; this.ride = null; g.events.push('ding'); }
    }
    if (this.scene !== 'street') { this.hidden = false; return; }
    if (this.bust > 0) {
      this.bust -= dt;
      this.crew.update(dt, this.hooks);
      if (this.bust <= 0) this.retry();
      return;
    }
    this.hidden = !!this.coverAt(p.x) && g.sneaking && !p.moving && p.z <= 0;
    this.crew.update(dt, this.hooks);
  }

  private get carrying(): boolean { return this.cargo === 'carried'; }

  private caught(): void {
    const g = this.g, p = g.player;
    p.cuffTimer = 1.6; p.vx = 0; p.dodgeTimer = 0;
    const fine = Math.min(g.cash, FINE_KR);
    g.cash -= fine;
    this.fines++;
    this.cargo = 'none'; this.stashX = null;
    this.bust = 1.7;
    const officer = this.crew.patrols.find(o => o.state === 'cuff');
    if (officer) this.crew.calm(officer);
    g.events.push('cuff');
    g.say('msg.busted2', { fine });
  }

  /** Back outside 28D with a new job: the Gods were confiscated, so D.D will hand over another load. */
  private retry(): void {
    this.retries++;
    this.received = false; this.cargo = 'none'; this.stashX = null; this.scene = 'street'; this.floor = 0; this.ride = null;
    this.g.player.cuffTimer = 0;
    this.placeOutside(GODS_START_X);
    this.spawnPatrols();
    this.g.transition = 0.35;
    this.g.say('msg.dd2Retry');
  }
}
