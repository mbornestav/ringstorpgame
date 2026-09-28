import { computeScore, type Mode } from '../game';
import { turnRoute, type Route, type JunctionId } from './routes';
import { BAND_BOTTOM, BAND_TOP, PX_PER_M, WIDTH } from './layout';
import { stageFor, streetAt, type EnemyKind, type Encounter, type Stage, type StageSpawn } from './stage';

export type { EnemyKind } from './stage';
export type EnemyState = 'idle' | 'walk' | 'windup' | 'strike' | 'recover' | 'hurt' | 'down' | 'rise' | 'ko';
export type EncounterState = 'waiting' | 'active' | 'cleared';

/** Anyone on the street. Positions are stage pixels: x along the street, y the depth of the feet, z the height off the ground. */
export interface Fighter {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  flash: number;
  walk: number;
}
export interface SideEnemy extends Fighter {
  id: number;
  kind: EnemyKind;
  encounter: number;
  state: EnemyState;
  timer: number;
  cooldown: number;
  struck: boolean;
  /** Depth offset from the courier while waiting for a turn to attack. */
  lane: number;
  /** Knocked out and faded away. */
  gone: boolean;
}
export interface SidePlayer extends Fighter {
  invulnerable: number;
  attackTimer: number;
  attackLength: number;
  attackHit: boolean;
  combo: number;
  comboWindow: number;
  kick: boolean;
  kickHit: boolean;
  dodgeTimer: number;
  dodgeCooldown: number;
  hurtTimer: number;
  downTimer: number;
  riseTimer: number;
  moving: boolean;
}
export interface Effect { kind: 'spark' | 'smash' | 'dust' | 'heal'; x: number; y: number; z: number }

export const KINDS: Record<EnemyKind, { hp: number; speed: number; reach: number; windup: number; recover: number; damage: number; armor: boolean }> = {
  runner: { hp: 3, speed: 68, reach: 27, windup: 0.42, recover: 0.5, damage: 1, armor: false },
  // Bruisers and the boss shrug off jabs while winding up; only a finisher or a kick stops them.
  bruiser: { hp: 6, speed: 48, reach: 31, windup: 0.62, recover: 0.7, damage: 1, armor: true },
  boss: { hp: 14, speed: 56, reach: 35, windup: 0.56, recover: 0.62, damage: 2, armor: true },
};
/** Jab, cross and a hook that knocks down. */
export const COMBO = [
  { length: 0.22, at: 0.07, reach: 31, damage: 1 },
  { length: 0.24, at: 0.08, reach: 32, damage: 1 },
  { length: 0.36, at: 0.13, reach: 36, damage: 2 },
];
const KICK = { reach: 34, damage: 2 };
/** Blows only connect between fighters this close in depth. */
export const LANE = 10;
const SPEED_X = 96, SPEED_Y = 58;
/** The courier stays this far inside the screen edges. */
const EDGE = 18;
const JUMP_SPEED = 250, GRAVITY = 900;
const DODGE_SPEED = 250, DODGE_TIME = 0.26;
/** How many of a crew press the attack at once; the rest circle and wait their turn. */
const MAX_ENGAGED = 2;
const HOME_ENCOUNTER = 100;
const TURN_REACH = 72;
const BEST_KEY = 'ringstorp-side-best';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const BUSY = new Set<EnemyState>(['windup', 'strike', 'recover']);
const OUT = new Set<EnemyState>(['idle', 'down', 'rise', 'ko']);

export class SideGame {
  mode: Mode = 'title';
  route: Route = 'direct';
  stage: Stage = stageFor('direct');
  player!: SidePlayer;
  enemies: SideEnemy[] = [];
  encounters = new Map<number, EncounterState>();
  /** The crew holding the screen, if any. */
  active: Encounter | null = null;
  /** Left edge of the view, in stage pixels. */
  camera = 0;
  elapsed = 0;
  koCount = 0;
  hasPackage = false;
  healed = false;
  shopHealed = false;
  readonly decisions = new Map<JunctionId, 'straight' | 'turn'>();
  /** Brief fade when the camera turns onto another street. */
  transition = 0;
  checkpoint: number | null = null;
  continues = 0;
  crewSprung = false;
  score = 0;
  bestScore = 0;
  message = '';
  messageTimer = 0;
  /** Seconds left on the flashing GO arrow after a crew is cleared. */
  goTimer = 0;
  shake = 0;
  events: string[] = [];
  effects: Effect[] = [];
  private freeze = 0;
  private defeatTimer = 0;
  private fightTime = 0;
  private backup: EnemyKind[] = [];
  private backupTimer = 0;
  private nextId = 1000;
  private moveInput = { x: 0, y: 0 };
  private attackBuffer = 0;
  private jumpBuffer = 0;
  private dodgeBuffer = 0;

  constructor() {
    try { this.bestScore = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch { /* private mode */ }
    this.reset();
  }

  reset(route: Route = 'direct'): void {
    this.route = route;
    this.stage = stageFor(route);
    const { start } = this.stage;
    this.player = {
      x: start.x, y: start.y, z: 0, vx: 0, vz: 0, facing: 1, hp: 5, maxHp: 5, flash: 0, walk: 0,
      invulnerable: 0, attackTimer: 0, attackLength: 0, attackHit: false, combo: 0, comboWindow: 0, kick: false, kickHit: false,
      dodgeTimer: 0, dodgeCooldown: 0, hurtTimer: 0, downTimer: 0, riseTimer: 0, moving: false,
    };
    this.encounters = new Map(this.stage.encounters.map(e => [e.id, 'waiting' as EncounterState]));
    this.enemies = this.stage.encounters.filter(e => !e.home).flatMap(e => e.spawns.map(s => this.makeEnemy(s, e.id)));
    this.active = null;
    this.camera = 0;
    this.elapsed = 0;
    this.koCount = 0;
    this.hasPackage = false;
    this.healed = false;
    this.shopHealed = false;
    this.decisions.clear();
    this.transition = 0;
    this.checkpoint = null;
    this.continues = 0;
    this.crewSprung = false;
    this.score = 0;
    this.message = '';
    this.messageTimer = 0;
    this.goTimer = 0;
    this.shake = 0;
    this.events = [];
    this.effects = [];
    this.freeze = 0;
    this.defeatTimer = 0;
    this.backup = [];
    this.attackBuffer = this.jumpBuffer = this.dodgeBuffer = 0;
  }

  start(route: Route = 'direct'): void {
    this.reset(route);
    this.mode = 'playing';
    this.say('Pick up the package at Pålsjö kiosk');
    this.events.push('start');
  }

  togglePause(): void {
    if (this.mode === 'playing') this.mode = 'paused';
    else if (this.mode === 'paused') this.mode = 'playing';
  }

  get junctionAhead() {
    if (!this.hasPackage) return undefined;
    return this.stage.junctions.find(j => !this.decisions.has(j.id) && j.x >= this.player.x - TURN_REACH && j.x <= this.player.x + 280);
  }

  get interaction(): { kind: 'turn' | 'shop'; label: string } | null {
    if (!this.hasPackage || this.mode !== 'playing' || this.active || this.transition > 0) return null;
    const p = this.player;
    if (p.hp <= 0 || p.z > 0 || p.downTimer > 0 || p.hurtTimer > 0 || p.riseTimer > 0 || p.dodgeTimer > 0 || p.attackTimer > 0) return null;
    const j = this.junctionAhead;
    if (j && Math.abs(p.x - j.x) <= TURN_REACH) return { kind: 'turn', label: `Turn · ${j.turn}` };
    if (this.stage.shopX !== null && Math.abs(p.x - this.stage.shopX) < 28 && p.y < BAND_TOP + 24) {
      return { kind: 'shop', label: this.shopHealed ? 'Kurir Livs · supplies collected' : p.hp === p.maxHp ? 'Kurir Livs · health already full' : 'Kurir Livs · refill health' };
    }
    return null;
  }

  /** E is contextual: take a signed turn, or collect supplies at the shop door. */
  interact(): void {
    const action = this.interaction;
    if (!action) return;
    if (action.kind === 'shop') {
      if (this.shopHealed) { this.say('KURIR LIVS · SUPPLIES ALREADY COLLECTED'); return; }
      if (this.player.hp === this.player.maxHp) { this.say('HEALTH IS FULL · SAVE THE SUPPLIES'); return; }
      this.player.hp = this.player.maxHp;
      this.shopHealed = true;
      this.events.push('pickup');
      this.effects.push({ kind: 'heal', x: this.player.x, y: this.player.y, z: 30 });
      this.say('KURIR LIVS · HEALTH REFILLED');
      return;
    }
    const junction = this.junctionAhead!;
    const before = this.encounters;
    this.decisions.set(junction.id, 'turn');
    this.route = turnRoute(this.route, junction.id);
    this.stage = stageFor(this.route);
    // Completed crews, score, package, health and checkpoint survive the turn. Waiting crews
    // are placed on the new street; an active fight cannot be escaped by changing streets.
    this.encounters = new Map(this.stage.encounters.map(e => [e.id, before.get(e.id) === 'cleared' ? 'cleared' : 'waiting']));
    this.enemies = this.stage.encounters.filter(e => !e.home && this.encounters.get(e.id) !== 'cleared')
      .flatMap(e => e.spawns.map(s => this.makeEnemy(s, e.id)));
    this.effects = [];
    this.attackBuffer = this.jumpBuffer = this.dodgeBuffer = 0;
    this.player.vx = this.player.vz = 0;
    this.transition = 0.35;
    this.events.push('go');
    this.say(junction.id === 'romares' ? 'ROMARES VÄG · VIA MARCUS A' : 'KURIRGATAN · VIA KURIR LIVS');
  }

  /** After a knockout, carry on from Marcus A with full health at a score penalty. */
  continueFromCheckpoint(): void {
    if (this.mode !== 'defeat' || this.checkpoint === null) return;
    const p = this.player;
    Object.assign(p, {
      x: this.checkpoint, y: BAND_TOP + 12, z: 0, vx: 0, vz: 0, facing: 1, hp: p.maxHp, invulnerable: 2, flash: 0,
      attackTimer: 0, kick: false, dodgeTimer: 0, hurtTimer: 0, downTimer: 0, riseTimer: 0,
    });
    this.continues++;
    // The crew that won goes back to where it was waiting.
    if (this.active) {
      const e = this.active;
      this.koCount -= this.enemies.filter(x => x.encounter === e.id && x.hp <= 0).length;
      this.enemies = this.enemies.filter(x => x.encounter !== e.id);
      if (!e.home) this.enemies.push(...e.spawns.map(s => this.makeEnemy(s, e.id)));
      if (e.home) this.crewSprung = false;
      this.encounters.set(e.id, 'waiting');
      this.active = null;
      this.backup = [];
    }
    this.camera = clamp(this.checkpoint - WIDTH * 0.4, 0, this.stage.length - WIDTH);
    this.defeatTimer = 0;
    this.mode = 'playing';
    this.attackBuffer = this.jumpBuffer = this.dodgeBuffer = 0;
    this.say('BACK ON YOUR FEET AT MARCUS A');
    this.events.push('pickup');
  }

  setMovement(x: number, y: number): void { this.moveInput = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; }
  queueAttack(): void { this.attackBuffer = 0.2; }
  queueJump(): void { this.jumpBuffer = 0.12; }
  queueDodge(): void { this.dodgeBuffer = 0.12; }

  get homeCrewDown(): boolean {
    return this.crewSprung && this.encounters.get(HOME_ENCOUNTER) === 'cleared';
  }

  /** On the long route, until Marcus A is behind you. */
  get marcusAhead(): boolean {
    return this.stage.marcusX !== null && !this.healed && this.player.x < this.stage.marcusX + 90;
  }

  get objective(): string {
    if (!this.hasPackage) return 'Pick up the package · Pålsjö kiosk';
    if (this.marcusAhead) return 'Patch up at Marcus A · Långåkersgatan 4';
    if (this.stage.shopX !== null && !this.shopHealed && this.player.x < this.stage.shopX + 90) return 'Supplies at Kurir Livs · Kurirgatan 1';
    if (this.crewSprung && !this.homeCrewDown) return 'Shake off the crew · Ringstorpsvägen';
    if (this.active) return `Shake off the crew · ${this.street ?? 'Pålsjö'}`;
    return 'Take the package home · Ringstorpsvägen 55B';
  }

  get street(): string | undefined { return streetAt(this.stage, this.player.x); }
  get metresToHome(): number { return Math.max(0, (this.stage.homeX - this.player.x) / PX_PER_M); }
  encounterState(id: number): EncounterState { return this.encounters.get(id) ?? 'waiting'; }

  update(rawDt: number): void {
    if (this.mode !== 'playing') return;
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.goTimer = Math.max(0, this.goTimer - dt);
    this.shake = Math.max(0, this.shake - dt * 18);
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); return; }
    // Hit-stop: a few frames' pause sells the impact.
    if (this.freeze > 0) { this.freeze -= dt; return; }
    if (this.defeatTimer > 0) {
      this.defeatTimer -= dt;
      if (this.defeatTimer <= 0) { this.mode = 'defeat'; this.events.push('defeat'); return; }
    }
    this.updatePlayer(dt);
    this.updateEncounters(dt);
    const engaged = this.engaged();
    for (const e of this.enemies) this.updateEnemy(e, dt, engaged);
    this.separate(dt);
    this.updateCamera(dt);
    const p = this.player;
    p.x = clamp(p.x, Math.max(EDGE, this.camera + EDGE), Math.min(this.stage.length - EDGE, this.camera + WIDTH - EDGE));
    this.checkObjectives();
    for (const j of this.stage.junctions) if (!this.decisions.has(j.id) && p.x > j.x + TURN_REACH) this.decisions.set(j.id, 'straight');
    if (this.effects.length > 48) this.effects.splice(0, this.effects.length - 48);
  }

  // ---------------------------------------------------------------- courier

  private updatePlayer(dt: number): void {
    const p = this.player, input = this.moveInput;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.comboWindow = Math.max(0, p.comboWindow - dt);
    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.dodgeBuffer = Math.max(0, this.dodgeBuffer - dt);
    const grounded = p.z <= 0;

    if (p.downTimer > 0) {
      if (grounded) p.downTimer -= dt;
      if (p.downTimer <= 0 && p.hp > 0) p.riseTimer = 0.35;
    } else if (p.riseTimer > 0) p.riseTimer = Math.max(0, p.riseTimer - dt);
    else if (p.hurtTimer > 0) p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    const stunned = p.downTimer > 0 || p.riseTimer > 0 || p.hurtTimer > 0 || p.hp <= 0;

    if (!stunned) {
      if (this.dodgeBuffer > 0 && grounded && p.dodgeCooldown <= 0 && p.attackTimer <= 0) {
        this.dodgeBuffer = 0;
        if (input.x) p.facing = input.x > 0 ? 1 : -1;
        p.dodgeTimer = DODGE_TIME;
        p.dodgeCooldown = 0.8;
        p.invulnerable = Math.max(p.invulnerable, 0.32);
        this.events.push('dodge');
      }
      if (this.jumpBuffer > 0 && grounded && p.dodgeTimer <= 0 && p.attackTimer <= 0) {
        this.jumpBuffer = 0;
        p.vz = JUMP_SPEED;
        p.z = 0.01;
        p.vx = input.x * SPEED_X;
        if (input.x) p.facing = input.x > 0 ? 1 : -1;
        this.events.push('jump');
      }
      if (this.attackBuffer > 0) {
        if (p.z > 0 && !p.kick) {
          this.attackBuffer = 0;
          p.kick = true;
          p.kickHit = false;
          this.events.push('swing');
        } else if (p.z <= 0 && p.attackTimer <= 0 && p.dodgeTimer <= 0) {
          this.attackBuffer = 0;
          p.combo = p.comboWindow > 0 ? (p.combo % 3) + 1 : 1;
          const move = COMBO[p.combo - 1];
          p.attackTimer = p.attackLength = move.length;
          p.comboWindow = move.length + 0.32;
          p.attackHit = false;
          this.events.push('swing');
        }
      }
    }

    if (p.dodgeTimer > 0) {
      p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
      p.x += p.facing * DODGE_SPEED * dt;
      p.y += input.y * SPEED_Y * 0.5 * dt;
      p.walk += dt * 16;
    } else if (stunned || p.z > 0) {
      p.x += p.vx * dt;
      if (p.z <= 0) p.vx *= Math.max(0, 1 - dt * 8);
    } else if (p.attackTimer <= 0) {
      p.x += input.x * SPEED_X * dt;
      p.y += input.y * SPEED_Y * dt;
      if (input.x) p.facing = input.x > 0 ? 1 : -1;
      p.moving = !!(input.x || input.y);
      if (p.moving) p.walk += dt * 10;
    }
    if (p.attackTimer > 0 || stunned || p.z > 0) p.moving = false;
    p.y = clamp(p.y, BAND_TOP, BAND_BOTTOM);

    if (p.z > 0 || p.vz > 0) {
      p.vz -= GRAVITY * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0; p.vz = 0; p.kick = false;
        if (p.downTimer > 0) { p.vx *= 0.3; this.effects.push({ kind: 'dust', x: p.x, y: p.y, z: 0 }); this.events.push('thud'); }
        else p.vx = 0;
      }
    }

    if (p.attackTimer > 0) {
      const move = COMBO[p.combo - 1];
      const elapsed = p.attackLength - p.attackTimer;
      p.attackTimer = Math.max(0, p.attackTimer - dt);
      if (!p.attackHit && elapsed >= move.at) {
        p.attackHit = true;
        this.strike(move.reach, move.damage, p.combo === 3);
      }
    }
    if (p.kick && !p.kickHit && p.z > 3 && this.strike(KICK.reach, KICK.damage, true)) p.kickHit = true;
  }

  /** The courier's blow lands on everyone in reach and in lane. */
  private strike(reach: number, damage: number, knockdown: boolean): boolean {
    const p = this.player;
    let landed = false;
    for (const e of this.enemies) {
      if (e.hp <= 0 || OUT.has(e.state)) continue;
      const dx = (e.x - p.x) * p.facing;
      if (dx < -6 || dx > reach || Math.abs(e.y - p.y) > LANE || Math.abs(e.z - p.z) > 26) continue;
      this.hitEnemy(e, damage, knockdown);
      landed = true;
    }
    return landed;
  }

  private hitEnemy(e: SideEnemy, damage: number, knockdown: boolean): void {
    const dir = e.x >= this.player.x ? 1 : -1;
    const kind = KINDS[e.kind];
    e.hp = Math.max(0, e.hp - damage);
    e.flash = 0.16;
    e.facing = dir > 0 ? -1 : 1;
    const at = { x: e.x - dir * 6, y: e.y, z: e.z + (e.kind === 'boss' ? 32 : 26) };
    if (e.hp <= 0 || knockdown) {
      e.state = 'down';
      e.timer = 0.8;
      e.vx = dir * (e.kind === 'boss' ? 110 : 150);
      e.vz = 160;
      e.z = Math.max(e.z, 1);
      if (e.hp <= 0) this.koCount++;
      this.effects.push({ kind: 'smash', ...at });
      this.shake = 3;
      this.freeze = 0.08;
      this.events.push('smash');
    } else {
      if (!(kind.armor && e.state === 'windup')) { e.state = 'hurt'; e.timer = 0.3; }
      e.vx = dir * 55;
      this.effects.push({ kind: 'spark', ...at });
      this.freeze = 0.05;
      this.events.push('hit');
    }
  }

  private hurtPlayer(damage: number, dir: number): void {
    const p = this.player;
    if (p.invulnerable > 0 || p.dodgeTimer > 0 || p.downTimer > 0 || p.riseTimer > 0 || p.hp <= 0) return;
    p.hp = Math.max(0, p.hp - damage);
    p.flash = 0.25;
    p.attackTimer = 0; p.kick = false; p.combo = 0; p.comboWindow = 0;
    this.effects.push({ kind: 'spark', x: p.x, y: p.y, z: p.z + 28 });
    this.events.push('hurt');
    this.shake = 2;
    if (damage >= 2 || p.hp <= 0 || p.z > 0) {
      p.downTimer = 0.85;
      p.vx = dir * 130; p.vz = 150; p.z = Math.max(p.z, 1);
      p.invulnerable = 2;
      this.shake = 4;
    } else {
      p.hurtTimer = 0.3;
      p.vx = dir * 90;
      p.invulnerable = 1;
    }
    if (p.hp <= 0) this.defeatTimer = 1.2;
  }

  // ---------------------------------------------------------------- crews

  private makeEnemy(spawn: StageSpawn, encounter: number): SideEnemy {
    const hp = KINDS[spawn.kind].hp;
    return {
      id: spawn.id, kind: spawn.kind, encounter, x: spawn.x, y: spawn.y, z: 0, vx: 0, vz: 0, facing: -1, hp, maxHp: hp,
      flash: 0, walk: (spawn.id * 1.7) % 6, state: 'idle', timer: 0, cooldown: 0.5 + (spawn.id % 3) * 0.3, struck: false,
      lane: ((spawn.id % 4) - 1.5) * 18, gone: false,
    };
  }

  private naturalCamera(): number { return clamp(this.player.x - WIDTH * 0.4, 0, this.stage.length - WIDTH); }

  private updateCamera(dt: number): void {
    let target = Math.max(this.camera, this.naturalCamera());
    // Keep the package on screen until it has been picked up, and hold still while a crew is on.
    if (!this.hasPackage) target = Math.min(target, Math.max(0, this.stage.package.x - 48));
    if (this.active) target = Math.min(target, this.active.camera);
    target = Math.max(this.camera, target);
    this.camera += (target - this.camera) * Math.min(1, dt * 8);
    if (target - this.camera < 0.05) this.camera = target;
  }

  private updateEncounters(dt: number): void {
    if (!this.active) {
      const next = this.stage.encounters.find(e => this.encounters.get(e.id) === 'waiting');
      if (next && this.hasPackage && this.naturalCamera() >= next.camera - 0.5) this.activate(next);
      return;
    }
    const e = this.active;
    this.fightTime += dt;
    const crew = this.enemies.filter(x => x.encounter === e.id);
    if (this.backup.length && (crew.some(x => x.hp <= 0) || this.fightTime > 5)) {
      this.backupTimer -= dt;
      if (this.backupTimer <= 0) {
        const kind = this.backup.shift()!;
        const fromLeft = this.backup.length % 2 === 0;
        const spawn = { id: this.nextId++, kind, x: fromLeft ? this.camera - 24 : this.camera + WIDTH + 24, y: clamp(this.player.y + (fromLeft ? -14 : 14), BAND_TOP + 6, BAND_BOTTOM - 6) };
        const enemy = this.makeEnemy(spawn, e.id);
        enemy.state = 'walk';
        enemy.facing = fromLeft ? 1 : -1;
        this.enemies.push(enemy);
        this.backupTimer = 1.4;
        if (!this.messageTimer) this.say('BACKUP IS COMING');
        return;
      }
    }
    if (!this.backup.length && crew.every(x => x.hp <= 0)) {
      this.encounters.set(e.id, 'cleared');
      this.active = null;
      if (e.home) this.say('HOME FREE · STEP UP TO THE DOOR');
      else { this.goTimer = 3; this.events.push('go'); }
    }
  }

  private activate(e: Encounter): void {
    this.encounters.set(e.id, 'active');
    this.active = e;
    this.fightTime = 0;
    this.backup = [...e.backup];
    this.backupTimer = 0.4;
    const left = e.camera, right = e.camera + WIDTH;
    if (e.home) {
      // The crew steps out from both ends of the terrace.
      this.crewSprung = true;
      e.spawns.forEach((s, i) => {
        const enemy = this.makeEnemy(s, e.id);
        enemy.x = s.x < this.player.x ? left - 24 : right + 24 + i * 22;
        enemy.state = 'walk';
        this.enemies.push(enemy);
      });
      this.say('A CREW IS WAITING ON RINGSTORPSVÄGEN');
    } else {
      for (const enemy of this.enemies) {
        if (enemy.encounter !== e.id) continue;
        enemy.state = 'walk';
        enemy.x = clamp(enemy.x, left - 30, right + 30);
      }
      this.say(`CREW ON ${(this.street ?? 'the street').toUpperCase()}`);
    }
    this.events.push('crew');
  }

  /** The nearest crew members take turns to press the attack. */
  private engaged(): Set<SideEnemy> {
    const p = this.player;
    const fighting = this.enemies.filter(e => e.hp > 0 && !OUT.has(e.state));
    const busy = fighting.filter(e => BUSY.has(e.state));
    const waiting = fighting.filter(e => !BUSY.has(e.state))
      .sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.y - p.y) * 2) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y) * 2));
    return new Set([...busy, ...waiting.slice(0, Math.max(0, MAX_ENGAGED - busy.length))]);
  }

  private updateEnemy(e: SideEnemy, dt: number, engaged: Set<SideEnemy>): void {
    if (e.gone) return;
    const p = this.player, kind = KINDS[e.kind];
    e.flash = Math.max(0, e.flash - dt);
    e.cooldown = Math.max(0, e.cooldown - dt);
    if (e.z > 0 || e.vz > 0) {
      e.vz -= GRAVITY * dt;
      e.z += e.vz * dt;
      if (e.z <= 0) {
        e.z = 0; e.vz = 0;
        if (e.state === 'down') { e.vx *= 0.25; this.effects.push({ kind: 'dust', x: e.x, y: e.y, z: 0 }); this.events.push('thud'); }
      }
    }
    e.x += e.vx * dt;
    if (e.z <= 0) e.vx *= Math.max(0, 1 - dt * 9);
    if (e.state !== 'idle' && e.hp > 0) e.x = clamp(e.x, this.camera - 40, this.camera + WIDTH + 40);

    switch (e.state) {
      case 'idle':
        e.walk += dt * 1.5;
        e.facing = p.x < e.x ? -1 : 1;
        return;
      case 'ko':
        e.timer -= dt;
        if (e.timer <= 0) e.gone = true;
        return;
      case 'down':
        if (e.z > 0) return;
        e.timer -= dt;
        if (e.timer <= 0) {
          if (e.hp <= 0) { e.state = 'ko'; e.timer = 0.9; } else { e.state = 'rise'; e.timer = 0.4; }
        }
        return;
      case 'rise':
      case 'hurt':
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'walk'; e.cooldown = Math.max(e.cooldown, 0.3); }
        return;
      case 'windup':
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'strike'; e.timer = 0.12; e.struck = false; }
        return;
      case 'strike':
        if (!e.struck) {
          e.struck = true;
          const dx = (p.x - e.x) * e.facing;
          if (dx > -4 && dx < kind.reach + 6 && Math.abs(p.y - e.y) <= LANE && p.z < 18) this.hurtPlayer(kind.damage, e.facing);
        }
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'recover'; e.timer = kind.recover; }
        return;
      case 'recover':
        e.timer -= dt;
        if (e.timer <= 0) { e.state = 'walk'; e.cooldown = 0.45 + ((e.id * 7) % 5) * 0.12; }
        return;
    }

    // Walking: close in to punching range, or circle at a distance while waiting a turn.
    const isEngaged = engaged.has(e);
    let side = e.x < p.x ? -1 : 1;
    if (isEngaged) {
      // Two attackers on the same side: the one further back goes round to flank.
      const partner = [...engaged].find(o => o !== e && Math.sign(o.x - p.x) === side && Math.abs(o.x - p.x) < Math.abs(e.x - p.x));
      const room = side < 0 ? p.x + kind.reach < this.camera + WIDTH - 20 : p.x - kind.reach > this.camera + 20;
      if (partner && room) side = -side;
    }
    const tx = p.x + side * (isEngaged ? kind.reach - 5 : 70 + (e.id % 3) * 16);
    let ty = isEngaged ? p.y : clamp(p.y + e.lane, BAND_TOP + 4, BAND_BOTTOM - 4);
    // Walk around the courier rather than through them.
    if (Math.sign(e.x - p.x) !== side && Math.abs(e.x - p.x) < 40) ty = clamp(p.y + (e.y <= p.y ? -26 : 26), BAND_TOP, BAND_BOTTOM);
    const speed = kind.speed * (isEngaged ? 1 : 0.7);
    const dx = tx - e.x, dy = ty - e.y;
    e.x += clamp(dx, -speed * dt, speed * dt);
    e.y = clamp(e.y + clamp(dy, -speed * 0.62 * dt, speed * 0.62 * dt), BAND_TOP, BAND_BOTTOM);
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) e.walk += dt * 9;
    e.facing = p.x >= e.x ? 1 : -1;
    const open = p.downTimer <= 0 && p.riseTimer <= 0 && p.hp > 0 && p.z < 8;
    const gap = Math.abs(p.x - e.x);
    if (isEngaged && open && e.cooldown <= 0 && gap <= kind.reach && gap >= 10 && Math.abs(p.y - e.y) <= 5) {
      e.state = 'windup';
      e.timer = kind.windup;
      this.events.push('warn');
    }
  }

  /** Crew members don't stand inside each other. */
  private separate(dt: number): void {
    const list = this.enemies.filter(e => e.hp > 0 && !OUT.has(e.state));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) >= 16 || Math.abs(dy) >= 8) continue;
      const dir = dx > 0 ? 1 : dx < 0 ? -1 : a.id < b.id ? 1 : -1;
      const push = (16 - Math.abs(dx)) * Math.min(1, dt * 6) * 0.5 * dir;
      a.x -= push; b.x += push;
    }
  }

  // ---------------------------------------------------------------- mission

  private checkObjectives(): void {
    const p = this.player, st = this.stage;
    if (!this.hasPackage) {
      if (Math.abs(p.x - st.package.x) < 16 && Math.abs(p.y - st.package.y) < 14 && p.z < 12) {
        this.hasPackage = true;
        this.say('GOT THE PACKAGE · GET IT HOME');
        this.events.push('parcel');
        this.effects.push({ kind: 'heal', x: p.x, y: p.y, z: 30 });
      } else if (p.x > this.camera + WIDTH - 30 && !this.messageTimer) this.say('DON’T FORGET THE PACKAGE');
      return;
    }
    if (st.marcusX !== null && !this.healed && !this.active && p.hp > 0 && p.z <= 0 && Math.abs(p.x - st.marcusX) < 22 && p.y < BAND_TOP + 24) {
      this.healed = true;
      this.checkpoint = st.marcusX;
      p.hp = p.maxHp;
      this.say('MARCUS A PATCHED YOU UP · CHECKPOINT');
      this.events.push('pickup');
      this.effects.push({ kind: 'heal', x: p.x, y: p.y, z: 30 });
    }
    if (this.homeCrewDown && Math.abs(p.x - st.homeX) < 18 && p.y < BAND_TOP + 24 && p.z <= 0 && p.hp > 0) {
      this.score = computeScore(this.elapsed, p.hp, this.koCount, this.continues);
      this.bestScore = Math.max(this.bestScore, this.score);
      try { localStorage.setItem(BEST_KEY, String(this.bestScore)); } catch { /* private mode */ }
      this.mode = 'victory';
      this.events.push('victory');
    }
  }

  private say(message: string): void { this.message = message; this.messageTimer = 3.1; }
}
