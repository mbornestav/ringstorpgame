import { distance, moveWithCollision, normalize, segmentBlocked, type Vec2 } from './geometry';
import { METRES_PER_UNIT } from './map';
import { BOUNDS, HOME, HOME_CREW, HOME_CREW_RANGE, HOME_GROUP, MARCUS_A, OBSTACLES, PACKAGE, ROUTES, SPAWNS, START, type EnemySpawn } from './world';

export type Mode = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
export type Route = 'direct' | 'marcus';
export type EnemyKind = 'runner' | 'bruiser' | 'boss';
export type EnemyState = 'idle' | 'chase' | 'windup' | 'recover' | 'ko';
export interface Enemy {
  id: number;
  kind: EnemyKind;
  group: number;
  pos: Vec2;
  home: Vec2;
  facing: Vec2;
  hp: number;
  state: EnemyState;
  timer: number;
  flash: number;
  knock: Vec2;
  walk: number;
}
export interface Player {
  pos: Vec2;
  facing: Vec2;
  hp: number;
  maxHp: number;
  invulnerable: number;
  attackTimer: number;
  attackCooldown: number;
  attackHit: boolean;
  combo: number;
  comboWindow: number;
  dodgeTimer: number;
  dodgeCooldown: number;
  walk: number;
  flash: number;
}

export const ROUTE_NAMES: Record<Route, string> = { direct: 'Direct · Johan Banérs gata', marcus: 'Via Marcus A · Långåkersgatan' };
const CONTINUE_PENALTY = 400;

function makeEnemy(spawn: EnemySpawn, id: number): Enemy {
  const { kind, group, pos } = spawn;
  return {
    id, kind, group, pos: { ...pos }, home: { ...pos }, facing: { x: -1, y: 0 },
    hp: kind === 'boss' ? 9 : kind === 'bruiser' ? 4 : 2,
    state: 'idle', timer: 0, flash: 0, knock: { x: 0, y: 0 }, walk: 0,
  };
}

export function computeScore(seconds: number, hp: number, koCount: number, continues: number): number {
  return Math.max(0, Math.floor(7000 - seconds * 12)) + hp * 160 + koCount * 85 + 1500 - continues * CONTINUE_PENALTY;
}

export function hasClearStrike(a: Vec2, b: Vec2, facing: Vec2, reach: number): boolean {
  const d = distance(a, b);
  if (d > reach || d < 0.01) return false;
  const direction = normalize({ x: b.x - a.x, y: b.y - a.y });
  if (direction.x * facing.x + direction.y * facing.y < 0.12) return false;
  return !segmentBlocked(a, b, OBSTACLES);
}

export class Game {
  mode: Mode = 'title';
  route: Route = 'direct';
  player!: Player;
  enemies: Enemy[] = [];
  elapsed = 0;
  koCount = 0;
  hasPackage = false;
  healed = false;
  checkpoint: Vec2 | null = null;
  continues = 0;
  crewSprung = false;
  waypoint = 0;
  score = 0;
  bestScore = 0;
  message = '';
  messageTimer = 0;
  events: string[] = [];
  private moveInput: Vec2 = { x: 0, y: 0 };
  private attackQueued = false;
  private dodgeQueued = false;

  constructor() {
    try { this.bestScore = Number(localStorage.getItem('ringstorp-best') || 0) || 0; } catch { /* private mode */ }
    this.reset();
  }

  reset(): void {
    this.player = {
      pos: { ...START }, facing: { x: 0, y: -1 }, hp: 5, maxHp: 5,
      invulnerable: 0, attackTimer: 0, attackCooldown: 0, attackHit: false,
      combo: 0, comboWindow: 0, dodgeTimer: 0, dodgeCooldown: 0, walk: 0, flash: 0,
    };
    this.enemies = SPAWNS.map((spawn, id) => makeEnemy(spawn, id));
    this.elapsed = 0;
    this.koCount = 0;
    this.hasPackage = false;
    this.healed = false;
    this.checkpoint = null;
    this.continues = 0;
    this.crewSprung = false;
    this.waypoint = 0;
    this.score = 0;
    this.message = '';
    this.messageTimer = 0;
    this.events = [];
    this.attackQueued = false;
    this.dodgeQueued = false;
  }

  start(route: Route = this.route): void {
    this.reset();
    this.route = route;
    this.mode = 'playing';
    this.say('Pick up the package at Pålsjö kiosk');
    this.events.push('start');
  }

  /** Switches the planned route; the guide arrow picks up from the nearest point on it. */
  toggleRoute(): void {
    this.route = this.route === 'direct' ? 'marcus' : 'direct';
    const path = ROUTES[this.route];
    let best = 0;
    path.forEach((p, i) => { if (distance(p, this.player.pos) < distance(path[best], this.player.pos)) best = i; });
    this.waypoint = best;
    this.say(this.route === 'marcus' ? 'ROUTE · VIA MARCUS A' : 'ROUTE · DIRECT HOME');
  }

  togglePause(): void {
    if (this.mode === 'playing') this.mode = 'paused';
    else if (this.mode === 'paused') this.mode = 'playing';
  }

  /** After a knockout, carry on from Marcus A with full health at a score penalty. */
  continueFromCheckpoint(): void {
    if (this.mode !== 'defeat' || !this.checkpoint) return;
    const p = this.player;
    p.pos = { ...this.checkpoint };
    p.hp = p.maxHp;
    p.invulnerable = 2;
    this.continues++;
    for (const e of this.enemies) {
      if (e.state !== 'ko' && distance(e.pos, p.pos) < 10) { e.pos = { ...e.home }; e.state = 'idle'; }
    }
    const path = ROUTES.marcus;
    this.route = 'marcus';
    this.waypoint = path.indexOf(MARCUS_A) + 1;
    this.mode = 'playing';
    this.say('BACK ON YOUR FEET AT MARCUS A');
    this.events.push('pickup');
  }

  setMovement(x: number, y: number): void { this.moveInput = normalize({ x, y }); }
  queueAttack(): void { this.attackQueued = true; }
  queueDodge(): void { this.dodgeQueued = true; }

  get homeCrewDown(): boolean { return this.crewSprung && this.enemies.filter(e => e.group === HOME_GROUP).every(e => e.state === 'ko'); }

  get objective(): string {
    if (!this.hasPackage) return 'Pick up the package · Pålsjö kiosk';
    if (this.route === 'marcus' && !this.healed) return 'Patch up at Marcus A · Långåkersgatan 4';
    if (this.crewSprung && !this.homeCrewDown) return 'Shake off the crew · Ringstorpsvägen';
    return 'Take the package home · Ringstorpsvägen 55B';
  }

  /** Where the guide arrow points: the package, then the next waypoint on the chosen route. */
  get target(): Vec2 {
    if (!this.hasPackage) return PACKAGE;
    const path = ROUTES[this.route];
    return path[Math.min(this.waypoint, path.length - 1)];
  }

  /** Metres to the goal of the current objective. */
  get targetMetres(): number { return distance(this.player.pos, this.target) * METRES_PER_UNIT; }

  update(rawDt: number): void {
    if (this.mode !== 'playing') return;
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.comboWindow = Math.max(0, p.comboWindow - dt);
    p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
    p.flash = Math.max(0, p.flash - dt);

    if (this.dodgeQueued && p.dodgeCooldown <= 0 && p.attackTimer <= 0) {
      p.dodgeTimer = 0.27;
      p.dodgeCooldown = 0.95;
      p.invulnerable = Math.max(p.invulnerable, 0.32);
      this.events.push('dodge');
    }
    this.dodgeQueued = false;

    if (this.attackQueued && p.attackCooldown <= 0 && p.dodgeTimer <= 0) {
      p.combo = p.comboWindow > 0 ? (p.combo % 3) + 1 : 1;
      p.comboWindow = 0.68;
      p.attackTimer = 0.30;
      p.attackCooldown = 0.32;
      p.attackHit = false;
      this.events.push('swing');
    }
    this.attackQueued = false;

    const direction = this.moveInput;
    if (direction.x || direction.y) {
      if (p.dodgeTimer <= 0) p.facing = { ...direction };
      p.walk += dt * (p.dodgeTimer > 0 ? 18 : 9);
    }
    const moveDirection = p.dodgeTimer > 0 ? p.facing : direction;
    const speed = p.dodgeTimer > 0 ? 8.7 : p.attackTimer > 0 ? 2.1 : 3.9;
    p.pos = moveWithCollision(p.pos, { x: moveDirection.x * speed * dt, y: moveDirection.y * speed * dt }, 0.35, OBSTACLES, BOUNDS);

    if (p.attackTimer > 0 && p.attackTimer <= 0.18 && !p.attackHit) {
      p.attackHit = true;
      let landed = false;
      for (const enemy of this.enemies) {
        if (enemy.state === 'ko' || !hasClearStrike(p.pos, enemy.pos, p.facing, p.combo === 3 ? 1.8 : 1.55)) continue;
        enemy.hp -= p.combo === 3 ? 2 : 1;
        enemy.flash = 0.18;
        enemy.knock = { x: p.facing.x * 4.5, y: p.facing.y * 4.5 };
        enemy.state = enemy.hp <= 0 ? 'ko' : 'recover';
        enemy.timer = enemy.hp <= 0 ? 0 : 0.43;
        if (enemy.hp <= 0) this.koCount++;
        landed = true;
      }
      if (landed) this.events.push('hit');
    }

    for (const enemy of this.enemies) this.updateEnemy(enemy, dt);
    this.checkObjectives();
  }

  private updateEnemy(e: Enemy, dt: number): void {
    e.flash = Math.max(0, e.flash - dt);
    if (e.state === 'ko') return;
    const radius = e.kind === 'boss' ? 0.5 : 0.36;
    if (Math.abs(e.knock.x) + Math.abs(e.knock.y) > 0.01) {
      e.pos = moveWithCollision(e.pos, { x: e.knock.x * dt, y: e.knock.y * dt }, radius, OBSTACLES, BOUNDS);
      e.knock.x *= Math.max(0, 1 - dt * 9);
      e.knock.y *= Math.max(0, 1 - dt * 9);
    }
    const toPlayer = { x: this.player.pos.x - e.pos.x, y: this.player.pos.y - e.pos.y };
    const range = distance(e.pos, this.player.pos);
    if (e.state === 'windup' || e.state === 'recover') {
      e.timer -= dt;
      if (e.timer <= 0) {
        if (e.state === 'windup') {
          if (hasClearStrike(e.pos, this.player.pos, e.facing, e.kind === 'boss' ? 1.9 : 1.5)) this.hurtPlayer(e.kind === 'boss' ? 2 : 1, e.facing);
          e.state = 'recover';
          e.timer = e.kind === 'runner' ? 0.45 : 0.65;
        } else e.state = 'chase';
      }
      return;
    }
    if (range < (e.kind === 'boss' ? 10 : 6.2)) e.state = 'chase';
    else if (range > 9 && distance(e.pos, e.home) < 0.6) e.state = 'idle';
    if (e.state === 'idle') return;
    if (range < (e.kind === 'boss' ? 1.9 : 1.4) && !segmentBlocked(e.pos, this.player.pos, OBSTACLES)) {
      e.state = 'windup';
      e.timer = e.kind === 'runner' ? 0.48 : e.kind === 'boss' ? 0.64 : 0.68;
      e.facing = normalize(toPlayer);
      return;
    }
    const goal = range > 9 ? e.home : this.player.pos;
    const direction = normalize({ x: goal.x - e.pos.x, y: goal.y - e.pos.y });
    if (direction.x || direction.y) e.facing = direction;
    const speed = e.kind === 'runner' ? 1.75 : e.kind === 'boss' ? 1.6 : 1.3;
    e.pos = moveWithCollision(e.pos, { x: direction.x * speed * dt, y: direction.y * speed * dt }, radius, OBSTACLES, BOUNDS);
    e.walk += dt * 7;
  }

  private hurtPlayer(amount: number, from: Vec2): void {
    const p = this.player;
    if (p.invulnerable > 0 || p.dodgeTimer > 0) return;
    p.hp = Math.max(0, p.hp - amount);
    p.invulnerable = 1.05;
    p.flash = 0.28;
    p.pos = moveWithCollision(p.pos, { x: from.x * 0.65, y: from.y * 0.65 }, 0.35, OBSTACLES, BOUNDS);
    this.events.push('hurt');
    if (p.hp <= 0) {
      this.mode = 'defeat';
      this.events.push('defeat');
    }
  }

  private checkObjectives(): void {
    const p = this.player;
    if (!this.hasPackage) {
      if (distance(p.pos, PACKAGE) < 1.1) {
        this.hasPackage = true;
        this.say('GOT THE PACKAGE · GET IT HOME');
        this.events.push('parcel');
      }
      return;
    }
    const path = ROUTES[this.route];
    for (let i = path.length - 1; i >= this.waypoint; i--) {
      if (distance(p.pos, path[i]) < 4.5) { this.waypoint = i + 1; break; }
    }
    if (!this.healed && distance(p.pos, MARCUS_A) < 1.6) {
      this.healed = true;
      this.checkpoint = { ...MARCUS_A };
      p.hp = p.maxHp;
      this.say('MARCUS A PATCHED YOU UP · CHECKPOINT');
      this.events.push('pickup');
    }
    if (!this.crewSprung && distance(p.pos, HOME) < HOME_CREW_RANGE) {
      this.crewSprung = true;
      HOME_CREW.forEach((spawn, i) => this.enemies.push(makeEnemy(spawn, 100 + i)));
      this.say('A CREW IS WAITING ON RINGSTORPSVÄGEN');
    }
    if (this.homeCrewDown && distance(p.pos, HOME) < 1.8) {
      this.score = computeScore(this.elapsed, p.hp, this.koCount, this.continues);
      this.bestScore = Math.max(this.bestScore, this.score);
      try { localStorage.setItem('ringstorp-best', String(this.bestScore)); } catch { /* private mode */ }
      this.mode = 'victory';
      this.events.push('victory');
    }
  }

  private say(message: string): void { this.message = message; this.messageTimer = 3.1; }
}
