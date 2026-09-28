import { distance, moveWithCollision, normalize, segmentHitsRect, type Vec2 } from './geometry';
import { BOUNDS, DROPOFF, OBSTACLES, PARCELS, START, type Parcel } from './world';

export type Mode = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
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
export interface Pickup { x: number; y: number; taken: boolean }

const initialEnemies: Array<[EnemyKind, number, number, number]> = [
  ['runner', 0, 26, 9.8], ['runner', 0, 30.5, 13.5], ['bruiser', 0, 28.7, 15.7],
  ['runner', 1, 60.5, 8.5], ['runner', 1, 65.5, 11], ['bruiser', 1, 64, 14.4], ['runner', 1, 68, 8.4],
  ['runner', 2, 92, 10], ['bruiser', 2, 97, 14], ['runner', 2, 99, 9.4], ['bruiser', 2, 94, 15.8],
  ['runner', -1, 13, 11.5], ['runner', -1, 43, 12.3], ['runner', -1, 83, 11.8],
];

function makeEnemy(kind: EnemyKind, group: number, x: number, y: number, id: number): Enemy {
  return {
    id, kind, group, pos: { x, y }, home: { x, y }, facing: { x: -1, y: 0 },
    hp: kind === 'boss' ? 9 : kind === 'bruiser' ? 4 : 2,
    state: 'idle', timer: 0, flash: 0, knock: { x: 0, y: 0 }, walk: 0,
  };
}

export function computeScore(seconds: number, hp: number, koCount: number, recovered: number): number {
  return Math.max(0, Math.floor(7000 - seconds * 12)) + hp * 160 + koCount * 85 + recovered * 500;
}

export function hasClearStrike(a: Vec2, b: Vec2, facing: Vec2, reach: number): boolean {
  const d = distance(a, b);
  if (d > reach || d < 0.01) return false;
  const direction = normalize({ x: b.x - a.x, y: b.y - a.y });
  if (direction.x * facing.x + direction.y * facing.y < 0.12) return false;
  return !OBSTACLES.some(rect => segmentHitsRect(a, b, rect));
}

export class Game {
  mode: Mode = 'title';
  player!: Player;
  enemies: Enemy[] = [];
  parcels: Parcel[] = [];
  pickups: Pickup[] = [];
  elapsed = 0;
  koCount = 0;
  bossSpawned = false;
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
      pos: { ...START }, facing: { x: 1, y: 0 }, hp: 5, maxHp: 5,
      invulnerable: 0, attackTimer: 0, attackCooldown: 0, attackHit: false,
      combo: 0, comboWindow: 0, dodgeTimer: 0, dodgeCooldown: 0, walk: 0, flash: 0,
    };
    this.enemies = initialEnemies.map(([kind, group, x, y], id) => makeEnemy(kind, group, x, y, id));
    this.parcels = PARCELS.map(parcel => ({ ...parcel }));
    this.pickups = [{ x: 37, y: 11.3, taken: false }, { x: 73, y: 12.7, taken: false }, { x: 103, y: 8.5, taken: false }];
    this.elapsed = 0;
    this.koCount = 0;
    this.bossSpawned = false;
    this.score = 0;
    this.message = '';
    this.messageTimer = 0;
    this.events = [];
    this.attackQueued = false;
    this.dodgeQueued = false;
  }

  start(): void {
    this.reset();
    this.mode = 'playing';
    this.say('Recover the three stolen parcels');
    this.events.push('start');
  }

  togglePause(): void {
    if (this.mode === 'playing') this.mode = 'paused';
    else if (this.mode === 'paused') this.mode = 'playing';
  }

  setMovement(x: number, y: number): void { this.moveInput = normalize({ x, y }); }
  queueAttack(): void { this.attackQueued = true; }
  queueDodge(): void { this.dodgeQueued = true; }

  get recoveredCount(): number { return this.parcels.filter(p => p.recovered).length; }
  get bossDefeated(): boolean { return this.bossSpawned && this.enemies.filter(e => e.group === 3).every(e => e.state === 'ko'); }

  get objective(): string {
    const parcel = this.parcels.find(p => !p.recovered);
    if (parcel) {
      const clear = this.enemies.filter(e => e.group === this.parcels.indexOf(parcel)).every(e => e.state === 'ko');
      return clear ? `Recover parcel · ${parcel.name}` : `Clear the crew · ${parcel.name}`;
    }
    return this.bossDefeated ? 'Reach the Tågaborg drop-off' : 'Face the final crew · Tågaborg';
  }

  get target(): Vec2 {
    const parcel = this.parcels.find(p => !p.recovered);
    if (parcel) return parcel;
    return this.bossDefeated ? DROPOFF : { x: 107, y: 12 };
  }

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
    const speed = p.dodgeTimer > 0 ? 8.7 : p.attackTimer > 0 ? 2.1 : 3.65;
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
    if (Math.abs(e.knock.x) + Math.abs(e.knock.y) > 0.01) {
      e.pos = moveWithCollision(e.pos, { x: e.knock.x * dt, y: e.knock.y * dt }, 0.36, OBSTACLES, BOUNDS);
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
    if (range < (e.kind === 'boss' ? 1.9 : 1.4) && !OBSTACLES.some(r => segmentHitsRect(e.pos, this.player.pos, r))) {
      e.state = 'windup';
      e.timer = e.kind === 'runner' ? 0.48 : e.kind === 'boss' ? 0.64 : 0.68;
      e.facing = normalize(toPlayer);
      return;
    }
    const goal = range > 9 ? e.home : this.player.pos;
    const direction = normalize({ x: goal.x - e.pos.x, y: goal.y - e.pos.y });
    if (direction.x || direction.y) e.facing = direction;
    const speed = e.kind === 'runner' ? 1.65 : e.kind === 'boss' ? 1.55 : 1.22;
    e.pos = moveWithCollision(e.pos, { x: direction.x * speed * dt, y: direction.y * speed * dt }, e.kind === 'boss' ? 0.55 : 0.36, OBSTACLES, BOUNDS);
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
    for (const pickup of this.pickups) {
      if (!pickup.taken && p.hp < p.maxHp && distance(p.pos, pickup) < 0.85) {
        pickup.taken = true;
        p.hp = Math.min(p.maxHp, p.hp + 2);
        this.say('+2 HEALTH');
        this.events.push('pickup');
      }
    }
    const nextIndex = this.parcels.findIndex(parcel => !parcel.recovered);
    if (nextIndex >= 0) {
      const parcel = this.parcels[nextIndex];
      const guardsGone = this.enemies.filter(e => e.group === nextIndex).every(e => e.state === 'ko');
      if (guardsGone && distance(p.pos, parcel) < 1.05) {
        parcel.recovered = true;
        this.say(`PARCEL ${nextIndex + 1}/3 RECOVERED`);
        this.events.push('parcel');
        if (this.recoveredCount === 3) this.spawnBoss();
      }
      return;
    }
    if (this.bossDefeated && distance(p.pos, DROPOFF) < 1.8) {
      this.score = computeScore(this.elapsed, p.hp, this.koCount, this.recoveredCount);
      this.bestScore = Math.max(this.bestScore, this.score);
      try { localStorage.setItem('ringstorp-best', String(this.bestScore)); } catch { /* private mode */ }
      this.mode = 'victory';
      this.events.push('victory');
    }
  }

  private spawnBoss(): void {
    this.enemies.push(makeEnemy('boss', 3, 106.5, 11, 100));
    this.enemies.push(makeEnemy('runner', 3, 104.5, 14, 101));
    this.enemies.push(makeEnemy('runner', 3, 108, 9.4, 102));
    this.bossSpawned = true;
    this.say('FINAL CREW AT TÅGABORG');
  }

  private say(message: string): void { this.message = message; this.messageTimer = 3.1; }
}
