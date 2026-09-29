import { computeScore, type Mode } from '../game';
import { turnRoute, type Route, type JunctionId } from './routes';
import { BAND_BOTTOM, BAND_TOP, PX_PER_M, WIDTH } from './layout';
import { stageFor, streetAt, type EnemyKind, type Encounter, type Stage, type StageSpawn } from './stage';
import { t, type Key, type Params } from './i18n';
import { STARTING_CASH, loadWallet, saveWallet } from './wallet';
import { GodsRun, type GodsAction } from './gods-run';
import { godsStage } from './gods-stage';

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
  /** Arm held out after a shot, for the aiming pose. */
  aimTimer: number;
  shotCooldown: number;
  waveTimer: number;
  /** Held in handcuffs by the police. */
  cuffTimer: number;
}
/** Effects for the renderer; a tracer or a tossed gun also has an end point. */
export interface Effect {
  kind: 'spark' | 'smash' | 'dust' | 'heal' | 'muzzle' | 'tracer' | 'toss';
  x: number;
  y: number;
  z: number;
  x1?: number;
  y1?: number;
}

export type CarKind = 'bmw' | 'police';
export type CarState = 'driving' | 'braking' | 'stopped' | 'leaving';
/** A car on the carriageway. Traffic keeps right, so cars heading right use the lane nearer the camera. */
export interface Car {
  id: number;
  kind: CarKind;
  /** Centre of the car along the street, and the line its tyres run on. */
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  state: CarState;
  timer: number;
  /** Where it will pull up, if it is stopping. */
  stopAt: number | null;
  wheel: number;
  /** D.D has handed over the gun. */
  handed: boolean;
  /** A phone order keeps D.D parked until the player accepts or dismisses him. */
  delivery?: boolean;
}
export interface Delivery {
  state: 'coming' | 'ready' | 'leaving';
  timer: number;
  carId: number | null;
  x: number;
  y: number;
  walk: number;
}
export type OfficerState = 'exit' | 'run' | 'grab' | 'cuff' | 'hurt' | 'down' | 'rise' | 'leave';
/** Police officers try to arrest the courier. They can be shoved over but never knocked out. */
export interface Officer extends Fighter {
  id: number;
  /** The patrol car they came in. */
  unit: number;
  state: OfficerState;
  timer: number;
  cooldown: number;
  gone: boolean;
}

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
/** Tyre lines of the two lanes: near the camera for traffic heading right, far for traffic heading left. */
export const LANES = { near: 244, far: 206 };
const CAR_SPEED = 170, BRAKING = 520;
/** D.D notices a wave from this close. */
const HAIL_REACH = 150;
/** Rounds in the handgun D.D hands over. */
export const CLIP = 8;
export const DD_CONTACT = 'D.D';
export const DD_NUMBER = '042218626';
export const REFILL_PRICE = 100;
export { STARTING_CASH };
export const CREW_CASH = 50;
const SHOT_DAMAGE = 2, SHOT_COOLDOWN = 0.3;
const POLICE_SPEED = 82;
/** The police give up this many seconds after the last offence. */
export const GIVE_UP = 20;
/** Points deducted for each arrest. */
export const FINE = 500;
const BEST_KEY = 'ringstorp-side-best';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const BUSY = new Set<EnemyState>(['windup', 'strike', 'recover']);
const OUT = new Set<EnemyState>(['idle', 'down', 'rise', 'ko']);

export class SideGame {
  mode: Mode = 'title';
  /** 1 is the package run with its crews; 2 is the stealth run carrying Gods. */
  level: 1 | 2 = 1;
  /** Held Shift: quieter and slower. Only Level 2 uses it. */
  sneaking = false;
  readonly gods = new GodsRun(this);
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
  /** The current toast as a key and parameters, so it can be shown in whichever language is active. */
  private toast: { key: Key; params?: Params } | null = null;
  messageTimer = 0;
  /** Seconds left on the flashing GO arrow after a crew is cleared. */
  goTimer = 0;
  shake = 0;
  events: string[] = [];
  effects: Effect[] = [];
  cars: Car[] = [];
  police: Officer[] = [];
  /** Rounds left in D.D's handgun; none means no gun. */
  ammo = 0;
  metDD = false;
  /** Cash is shared by both levels and saved in the browser between runs. */
  private wallet = loadWallet();
  get cash(): number { return this.wallet.cash; }
  set cash(value: number) {
    if (value > this.wallet.cash) this.wallet.earned += value - this.wallet.cash;
    this.wallet.cash = Math.max(0, value);
    saveWallet(this.wallet);
  }
  /** Everything ever earned, across runs. */
  get earned(): number { return this.wallet.earned; }
  phoneOpen = false;
  phoneCall: 'idle' | 'dialing' | 'ringing' | 'connected' = 'idle';
  delivery: Delivery | null = null;
  private callTimer = 0;
  /** Seconds until the BMW next comes by. It waits for an open stretch of road, and for you to be unarmed. */
  bmwTimer = 0;
  /** Shots fired and officers shoved since the police were last shaken off. */
  heat = 0;
  sinceOffence = 0;
  /** Seconds until the next patrol arrives, when one has been called. */
  dispatch: number | null = null;
  fines = 0;
  /** Randomness for the passing traffic; tests can replace it. */
  random: () => number = Math.random;
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
  private shotBuffer = 0;
  private nextUnit = 1;

  constructor() {
    try { this.bestScore = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch { /* private mode */ }
    this.reset();
  }

  reset(route: Route = 'direct'): void {
    this.level = 1;
    this.sneaking = false;
    this.gods.reset();
    this.route = route;
    this.stage = stageFor(route);
    const { start } = this.stage;
    this.player = {
      x: start.x, y: start.y, z: 0, vx: 0, vz: 0, facing: 1, hp: 5, maxHp: 5, flash: 0, walk: 0,
      invulnerable: 0, attackTimer: 0, attackLength: 0, attackHit: false, combo: 0, comboWindow: 0, kick: false, kickHit: false,
      dodgeTimer: 0, dodgeCooldown: 0, hurtTimer: 0, downTimer: 0, riseTimer: 0, moving: false,
      aimTimer: 0, shotCooldown: 0, waveTimer: 0, cuffTimer: 0,
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
    this.toast = null;
    this.messageTimer = 0;
    this.goTimer = 0;
    this.shake = 0;
    this.events = [];
    this.effects = [];
    this.freeze = 0;
    this.defeatTimer = 0;
    this.backup = [];
    this.attackBuffer = this.jumpBuffer = this.dodgeBuffer = this.shotBuffer = 0;
    this.cars = [];
    this.police = [];
    this.ammo = 0;
    this.metDD = false;
    this.phoneOpen = false;
    this.phoneCall = 'idle';
    this.callTimer = 0;
    this.delivery = null;
    this.moveInput = { x: 0, y: 0 };
    this.bmwTimer = 14 + this.random() * 12;
    this.heat = 0;
    this.sinceOffence = 0;
    this.dispatch = null;
    this.fines = 0;
  }

  /** Starts the Gods run: an assignment outside Kurirgatan 28D. */
  startGods(assignment = 1): void {
    this.reset();
    this.level = 2;
    this.stage = godsStage();
    this.encounters = new Map();
    this.enemies = [];
    this.gods.begin(assignment);
    this.mode = 'playing';
    this.events.push('start');
  }

  /** Back to the title screen, with a fresh run behind it. */
  toTitle(): void {
    this.reset();
    this.mode = 'title';
  }

  setSneak(on: boolean): void { this.sneaking = on && this.level === 2; }

  start(route: Route = 'direct'): void {
    this.reset(route);
    this.mode = 'playing';
    this.say('msg.start');
    this.events.push('start');
  }

  togglePause(): void {
    this.closePhone();
    if (this.mode === 'playing') this.mode = 'paused';
    else if (this.mode === 'paused') this.mode = 'playing';
  }

  get junctionAhead() {
    if (!this.hasPackage) return undefined;
    return this.stage.junctions.find(j => !this.decisions.has(j.id) && j.x >= this.player.x - TURN_REACH && j.x <= this.player.x + 280);
  }

  get interaction(): { kind: 'turn' | 'shop' | 'hail' | 'ammo' | GodsAction; label: string } | null {
    if (this.level === 2) return this.gods.interaction();
    if (this.phoneOpen || this.mode !== 'playing' || this.transition > 0) return null;
    const p = this.player;
    if (p.hp <= 0 || p.z > 0 || p.downTimer > 0 || p.hurtTimer > 0 || p.riseTimer > 0 || p.dodgeTimer > 0 || p.attackTimer > 0 || p.cuffTimer > 0) return null;
    if (this.dealerNearby) return { kind: 'ammo', label: t('act.ammo', { clip: CLIP, price: REFILL_PRICE }) };
    if (!this.hasPackage) return null;
    // Waving down D.D works mid-fight; changing streets or shopping does not.
    if (this.bmwInReach) return { kind: 'hail', label: t('act.hail') };
    if (this.active) return null;
    const j = this.junctionAhead;
    if (j && Math.abs(p.x - j.x) <= TURN_REACH) return { kind: 'turn', label: t('act.turn', { turn: t(j.turn as Key) }) };
    if (this.stage.shopX !== null && Math.abs(p.x - this.stage.shopX) < 28 && p.y < BAND_TOP + 24) {
      return { kind: 'shop', label: t(this.shopHealed ? 'act.shopDone' : p.hp === p.maxHp ? 'act.shopFull' : 'act.shop') };
    }
    return null;
  }

  /** E is contextual: wave down D.D, take a signed turn, or collect supplies at the shop door. */
  interact(): void {
    if (this.level === 2) { this.gods.interact(); return; }
    const action = this.interaction;
    if (!action) return;
    if (action.kind === 'ammo') { this.openPhone(); return; }
    if (action.kind === 'hail') { this.hail(); return; }
    if (action.kind === 'shop') {
      if (this.shopHealed) { this.say('msg.shopDone'); return; }
      if (this.player.hp === this.player.maxHp) { this.say('msg.healthFull'); return; }
      this.player.hp = this.player.maxHp;
      this.shopHealed = true;
      this.events.push('pickup');
      this.effects.push({ kind: 'heal', x: this.player.x, y: this.player.y, z: 30 });
      this.say('msg.shopRefill');
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
    // Round the corner, passing traffic and the police lose track of you.
    this.cars = [];
    this.relocateDelivery();
    this.police = [];
    this.heat = 0;
    this.dispatch = null;
    this.attackBuffer = this.jumpBuffer = this.dodgeBuffer = this.shotBuffer = 0;
    this.player.vx = this.player.vz = 0;
    this.transition = 0.35;
    this.events.push('go');
    this.say(junction.id === 'romares' ? 'msg.turnRomares' : 'msg.turnKurir');
  }

  /** After a knockout, carry on from Marcus A with full health at a score penalty. */
  continueFromCheckpoint(): void {
    if (this.mode !== 'defeat' || this.checkpoint === null) return;
    const p = this.player;
    Object.assign(p, {
      x: this.checkpoint, y: BAND_TOP + 12, z: 0, vx: 0, vz: 0, facing: 1, hp: p.maxHp, invulnerable: 2, flash: 0,
      attackTimer: 0, kick: false, dodgeTimer: 0, hurtTimer: 0, downTimer: 0, riseTimer: 0, cuffTimer: 0, aimTimer: 0,
    });
    this.continues++;
    this.cars = [];
    this.phoneOpen = false;
    this.relocateDelivery();
    this.police = [];
    this.heat = 0;
    this.dispatch = null;
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
    this.attackBuffer = this.jumpBuffer = this.dodgeBuffer = this.shotBuffer = 0;
    this.say('msg.backOnFeet');
    this.events.push('pickup');
  }

  setMovement(x: number, y: number): void { this.moveInput = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; }
  queueAttack(): void { if (this.level === 1) this.attackBuffer = 0.2; }
  queueJump(): void { this.jumpBuffer = 0.12; }
  queueDodge(): void { this.dodgeBuffer = 0.12; }
  queueShot(): void { if (this.level === 1) this.shotBuffer = 0.12; }

  /** The BMW, while it is passing close enough to notice a wave. */
  get bmwInReach(): Car | undefined {
    const p = this.player;
    return this.cars.find(c => c.kind === 'bmw' && c.state === 'driving' && !c.handed && !c.delivery
      && Math.abs(c.x - p.x) < HAIL_REACH && c.x > this.camera - 40 && c.x < this.camera + WIDTH + 40);
  }

  /** The police are after the courier, or on their way. */
  get wanted(): boolean {
    if (this.level === 2) return this.gods.patrols.some(o => o.state === 'chase' || o.state === 'grab');
    return this.dispatch !== null || this.police.some(o => o.state !== 'leave'); }

  get homeCrewDown(): boolean {
    return this.crewSprung && this.encounters.get(HOME_ENCOUNTER) === 'cleared';
  }

  /** On the long route, until Marcus A is behind you. */
  get marcusAhead(): boolean {
    return this.stage.marcusX !== null && !this.healed && this.player.x < this.stage.marcusX + 90;
  }

  get message(): string { return this.toast ? t(this.toast.key, this.toast.params) : ''; }
  /** D.D speaks in his own toasts, which show his portrait. */
  get messageFromDD(): boolean { return !!this.toast && this.toast.key.startsWith('msg.dd'); }

  get objective(): string {
    if (this.level === 2) return this.gods.objective;
    if (!this.hasPackage) return t('obj.package');
    if (this.marcusAhead) return t('obj.marcus');
    if (this.stage.shopX !== null && !this.shopHealed && this.player.x < this.stage.shopX + 90) return t('obj.shop');
    if (this.crewSprung && !this.homeCrewDown) return t('obj.crewHome');
    if (this.active) return t('obj.crew', { street: this.street ?? 'Pålsjö' });
    return t('obj.home');
  }

  get street(): string | undefined { return streetAt(this.stage, this.player.x); }
  get metresToHome(): number { return Math.max(0, (this.stage.homeX - this.player.x) / PX_PER_M); }
  encounterState(id: number): EncounterState { return this.encounters.get(id) ?? 'waiting'; }

  /** The Gods run has no crews, cars or phone: only you, the patrols and the building. */
  private updateGods(dt: number): void {
    this.elapsed += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.shake = Math.max(0, this.shake - dt * 18);
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); return; }
    this.updatePlayer(dt);
    this.gods.update(dt);
    const p = this.player, street = this.gods.scene === 'street';
    if (street) {
      this.camera += (this.naturalCamera() - this.camera) * Math.min(1, dt * 8);
      p.x = clamp(p.x, Math.max(EDGE, this.camera + EDGE), Math.min(this.stage.length - EDGE, this.camera + WIDTH - EDGE));
    } else {
      this.camera = 0;
      p.x = clamp(p.x, EDGE, WIDTH - EDGE);
    }
  }

  update(rawDt: number): void {
    if (this.mode !== 'playing') return;
    const dt = Math.min(rawDt, 0.05);
    if (this.level === 2) { this.updateGods(dt); return; }
    this.updatePhone(dt);
    this.updateDelivery(dt);
    // The phone pauses the fight, but D.D can still answer and arrive.
    if (this.phoneOpen) { this.updateCars(dt, true); return; }
    this.elapsed += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.goTimer = Math.max(0, this.goTimer - dt);
    this.shake = Math.max(0, this.shake - dt * 18);
    if (this.transition > 0) { this.transition = Math.max(0, this.transition - dt); return; }
    // Hit-stop: a few frames' pause sells the impact.
    if (this.freeze > 0) { this.freeze -= dt; return; }
    if (this.defeatTimer > 0) {
      this.defeatTimer -= dt;
      if (this.defeatTimer <= 0) { this.mode = 'defeat'; this.phoneOpen = false; this.events.push('defeat'); return; }
    }
    this.updatePlayer(dt);
    this.updateEncounters(dt);
    const engaged = this.engaged();
    for (const e of this.enemies) this.updateEnemy(e, dt, engaged);
    this.updatePolice(dt);
    this.separate(dt);
    this.updateCars(dt);
    this.updateBmw(dt);
    this.updateCamera(dt);
    const p = this.player;
    p.x = clamp(p.x, Math.max(EDGE, this.camera + EDGE), Math.min(this.stage.length - EDGE, this.camera + WIDTH - EDGE));
    this.checkObjectives();
    for (const j of this.stage.junctions) if (!this.decisions.has(j.id) && p.x > j.x + TURN_REACH) this.decisions.set(j.id, 'straight');
    if (this.effects.length > 48) this.effects.splice(0, this.effects.length - 48);
  }

  // ---------------------------------------------------------------- courier

  private updatePlayer(dt: number): void {
    const p = this.player;
    const input = this.level === 2 && this.gods.scene === 'cabin' ? { x: 0, y: 0 } : this.moveInput;
    const pace = this.level === 2 && this.sneaking ? 0.55 : 1;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.comboWindow = Math.max(0, p.comboWindow - dt);
    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.dodgeBuffer = Math.max(0, this.dodgeBuffer - dt);
    this.shotBuffer = Math.max(0, this.shotBuffer - dt);
    p.aimTimer = Math.max(0, p.aimTimer - dt);
    p.shotCooldown = Math.max(0, p.shotCooldown - dt);
    p.waveTimer = Math.max(0, p.waveTimer - dt);
    p.cuffTimer = Math.max(0, p.cuffTimer - dt);
    const grounded = p.z <= 0;

    if (p.downTimer > 0) {
      if (grounded) p.downTimer -= dt;
      if (p.downTimer <= 0 && p.hp > 0) p.riseTimer = 0.35;
    } else if (p.riseTimer > 0) p.riseTimer = Math.max(0, p.riseTimer - dt);
    else if (p.hurtTimer > 0) p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    const stunned = p.downTimer > 0 || p.riseTimer > 0 || p.hurtTimer > 0 || p.cuffTimer > 0 || p.hp <= 0;

    if (!stunned && this.shotBuffer > 0 && grounded && p.attackTimer <= 0 && p.dodgeTimer <= 0 && p.shotCooldown <= 0) this.shoot();
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
      p.x += input.x * SPEED_X * pace * dt;
      p.y += input.y * SPEED_Y * pace * dt;
      if (input.x) p.facing = input.x > 0 ? 1 : -1;
      p.moving = !!(input.x || input.y);
      if (p.moving) p.walk += dt * 10 * pace;
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
    for (const o of this.police) {
      if (o.gone || !['run', 'grab', 'hurt'].includes(o.state)) continue;
      const dx = (o.x - p.x) * p.facing;
      if (dx < -6 || dx > reach || Math.abs(o.y - p.y) > LANE || Math.abs(o.z - p.z) > 26) continue;
      this.shoveOfficer(o, knockdown);
      landed = true;
    }
    return landed;
  }

  /** Bullets stagger anyone they hit, even a bruiser or the boss winding up. */
  private hitEnemy(e: SideEnemy, damage: number, knockdown: boolean, stagger = false): void {
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
      if (stagger || !(kind.armor && e.state === 'windup')) { e.state = 'hurt'; e.timer = 0.3; }
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
        if (!this.messageTimer) this.say('msg.backup');
        return;
      }
    }
    if (!this.backup.length && crew.every(x => x.hp <= 0)) {
      if (this.encounters.get(e.id) !== 'cleared') this.cash += CREW_CASH;
      this.encounters.set(e.id, 'cleared');
      this.active = null;
      if (e.home) this.say('msg.homeFree');
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
      this.say('msg.crewHome');
    } else {
      for (const enemy of this.enemies) {
        if (enemy.encounter !== e.id) continue;
        enemy.state = 'walk';
        enemy.x = clamp(enemy.x, left - 30, right + 30);
      }
      this.say('msg.crewOn', { street: (this.street ?? t('msg.theStreet')).toUpperCase() });
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

  // ---------------------------------------------------------------- D.D and the handgun

  /** The handset has D.D's number only after he has pulled over once. */
  get hasPhone(): boolean { return this.level === 1 && this.metDD; }

  openPhone(): void {
    if (!this.hasPhone || this.mode !== 'playing' || this.player.hp <= 0) return;
    this.phoneOpen = true;
    this.moveInput = { x: 0, y: 0 };
    this.attackBuffer = this.jumpBuffer = this.dodgeBuffer = this.shotBuffer = 0;
  }

  closePhone(): void { this.phoneOpen = false; }

  /** Calling is free. Money changes hands only after the separate refill confirmation. */
  callDD(): void {
    if (!this.phoneOpen || this.mode !== 'playing' || this.phoneCall !== 'idle' || this.delivery) return;
    this.phoneCall = 'dialing';
    this.callTimer = 0.75;
    this.events.push('dial');
  }

  private updatePhone(dt: number): void {
    if (this.phoneCall === 'idle') return;
    this.callTimer -= dt;
    if (this.callTimer > 0) return;
    if (this.phoneCall === 'dialing') {
      this.phoneCall = 'ringing'; this.callTimer = 1.25; this.events.push('ring');
    } else if (this.phoneCall === 'ringing') {
      this.phoneCall = 'connected'; this.callTimer = 1.5;
      this.delivery = { state: 'coming', timer: 1, carId: null, x: this.camera - 35, y: this.player.y, walk: 0 };
      this.events.push('connect');
      this.say('msg.ddOnWay', { price: REFILL_PRICE });
    } else this.phoneCall = 'idle';
  }

  get dealerNearby(): boolean {
    return this.delivery?.state === 'ready' && Math.abs(this.delivery.x - this.player.x) < 150;
  }

  get canBuyAmmo(): boolean {
    return this.mode === 'playing' && this.player.hp > 0 && this.dealerNearby && this.ammo < CLIP && this.cash >= REFILL_PRICE;
  }

  buyAmmo(): boolean {
    if (!this.phoneOpen || !this.canBuyAmmo) return false;
    const d = this.delivery!;
    this.cash -= REFILL_PRICE;
    this.ammo = CLIP;
    this.metDD = true;
    this.effects.push({ kind: 'toss', x: d.x, y: d.y, z: 24, x1: this.player.x, y1: this.player.y });
    this.events.push('cash', 'gun');
    this.say('msg.ddAllSet', { clip: CLIP });
    this.dismissDD();
    return true;
  }

  /** Send him away without charging, including cancelling a call before he answers. */
  dismissDD(): void {
    this.phoneCall = 'idle';
    this.callTimer = 0;
    const d = this.delivery;
    if (d && d.carId !== null) {
      const car = this.cars.find(c => c.id === d.carId);
      if (car) { car.delivery = false; car.handed = true; car.state = 'leaving'; }
      this.delivery = null;
    } else if (d) {
      if (d.timer > 0) this.delivery = null;
      else d.state = 'leaving';
    }
    this.bmwTimer = 40 + this.random() * 20;
  }

  /** A requested visit follows you around a corner or back to the checkpoint. */
  private relocateDelivery(): void {
    if (!this.delivery) return;
    if (this.delivery.state === 'leaving') { this.delivery = null; return; }
    this.delivery = { state: 'coming', timer: 1, carId: null, x: this.player.x - 260, y: this.player.y, walk: 0 };
  }

  private updateDelivery(dt: number): void {
    const d = this.delivery;
    if (!d) return;
    if (d.state === 'leaving') {
      d.x -= dt * 140; d.walk += dt * 12;
      if (d.x < this.camera - 35) this.delivery = null;
      return;
    }
    if (d.timer > 0) {
      d.timer = Math.max(0, d.timer - dt);
      if (d.timer > 0) return;
      if (this.roadInView()) {
        const car = this.cars.find(c => c.kind === 'bmw') ?? this.makeCar('bmw', 1, CAR_SPEED);
        car.delivery = true; car.handed = false;
        car.dir = car.x < this.player.x ? 1 : -1;
        car.stopAt = this.player.x - car.dir * 37;
        car.state = 'driving'; car.speed = CAR_SPEED;
        d.carId = car.id;
        this.events.push('honk');
      } else {
        // He parks off-screen and walks over, including at the kiosk before pickup.
        d.x = this.camera - 30; d.y = this.player.y;
      }
    }
    if (d.carId !== null) {
      const car = this.cars.find(c => c.id === d.carId);
      if (!car || !this.roadInView()) {
        if (car) { car.delivery = false; car.handed = true; car.state = 'leaving'; }
        this.relocateDelivery(); return;
      }
      d.x = car.x; d.y = car.y;
      if (car.state === 'driving') car.stopAt = this.player.x - car.dir * 37;
      if (car.state === 'stopped' && Math.abs(car.x - this.player.x) >= 150) {
        car.dir = car.x < this.player.x ? 1 : -1;
        car.stopAt = this.player.x - car.dir * 37;
        car.state = 'driving'; car.speed = CAR_SPEED;
        d.state = 'coming';
      } else if (car.state === 'stopped' && car.timer > 0.55) this.dealerArrived(d);
    } else {
      const target = this.player.x - 38;
      const dx = target - d.x, dy = clamp(this.player.y - 8, BAND_TOP, BAND_BOTTOM) - d.y;
      d.x += Math.sign(dx) * Math.min(Math.abs(dx), 145 * dt);
      d.y += Math.sign(dy) * Math.min(Math.abs(dy), 80 * dt);
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.walk += dt * 12;
      if (Math.abs(d.x - target) < 4) this.dealerArrived(d);
      else d.state = 'coming';
    }
  }

  private dealerArrived(d: Delivery): void {
    if (d.state !== 'ready') {
      this.events.push('connect');
      this.say('msg.ddNeedBullets', { price: REFILL_PRICE });
    }
    d.state = 'ready';
  }

  /** The view is on carriageway from edge to edge, so a car can drive through. */
  private roadInView(): boolean {
    const x0 = this.camera - 120, x1 = this.camera + WIDTH + 120;
    return this.stage.surfaces.filter(r => r.x1 > x0 && r.x0 < x1).every(r => r.value === 'road' || r.value === 'major');
  }

  private makeCar(kind: CarKind, dir: 1 | -1, speed: number): Car {
    const id = this.nextUnit++;
    const car: Car = {
      id, kind, dir, speed, x: dir > 0 ? this.camera - 70 : this.camera + WIDTH + 70, y: dir > 0 ? LANES.near : LANES.far,
      state: 'driving', timer: 0, stopAt: null, wheel: 0, handed: false,
    };
    this.cars.push(car);
    return car;
  }

  /** Every so often D.D drives by in his BMW, but only while the courier is empty-handed. */
  private updateBmw(dt: number): void {
    if (this.delivery || this.phoneCall !== 'idle' || !this.hasPackage || this.ammo > 0 || this.cars.some(c => c.kind === 'bmw')) return;
    this.bmwTimer -= dt;
    if (this.bmwTimer > 0 || !this.roadInView()) return;
    this.makeCar('bmw', this.random() < 0.5 ? 1 : -1, CAR_SPEED);
    this.events.push('honk');
  }

  /** A wave gets D.D's attention: he pulls up by the courier, or as soon as the brakes allow. */
  private hail(): void {
    const car = this.bmwInReach!;
    this.player.waveTimer = 0.7;
    // D.D sits just ahead of the car's middle; stop with him beside the courier, not behind.
    const beside = this.player.x - car.dir * 37;
    const needed = car.speed * car.speed / (2 * BRAKING);
    car.stopAt = (beside - car.x) * car.dir >= needed ? beside : car.x + car.dir * needed;
    car.state = 'braking';
    this.events.push('brake');
    this.say('msg.ddPulling');
  }

  private handOver(car: Car): void {
    if (this.metDD) {
      car.delivery = true;
      this.delivery = { state: 'ready', timer: 0, carId: car.id, x: car.x, y: car.y, walk: 0 };
      this.say('msg.ddRefills', { price: REFILL_PRICE });
      return;
    }
    car.handed = true;
    this.ammo = CLIP;
    this.metDD = true;
    this.bmwTimer = 40 + this.random() * 20;
    this.effects.push({ kind: 'toss', x: car.x + car.dir * 6, y: car.y, z: 24, x1: this.player.x, y1: this.player.y });
    this.events.push('gun');
    this.say('msg.ddTakeThis');
  }

  private updateCars(dt: number, phoneOnly = false): void {
    for (const car of this.cars) {
      if (phoneOnly && !(car.kind === 'bmw' && (car.delivery || car.handed))) continue;
      car.timer += dt;
      if (car.state === 'driving') {
        const left = car.stopAt === null ? Infinity : (car.stopAt - car.x) * car.dir;
        if (left <= car.speed * car.speed / (2 * BRAKING) + 1) car.state = 'braking';
        else car.x += car.dir * car.speed * dt;
      }
      if (car.state === 'braking') {
        const left = Math.max(0, ((car.stopAt ?? car.x) - car.x) * car.dir);
        car.speed = Math.min(car.speed, Math.sqrt(2 * BRAKING * left) + 20);
        const step = Math.min(left, car.speed * dt);
        car.x += car.dir * step;
        if (left - step < 0.5) {
          car.speed = 0;
          car.state = 'stopped';
          car.timer = 0;
          if (car.kind === 'police') {
            // Two officers get out on the pavement side and give chase.
            for (const k of [0, 1]) this.police.push(this.makeOfficer(car.id, car.x + (k ? 12 : -12), clamp(car.y - 10 - k * 8, BAND_TOP, BAND_BOTTOM), 0.35 + k * 0.25));
          }
        }
      } else if (car.state === 'stopped') {
        if (car.kind === 'bmw') {
          if (!car.delivery && !car.handed && car.timer >= 0.55) this.handOver(car);
          if (!car.delivery && car.timer >= 1.7) { car.state = 'leaving'; this.events.push('honk'); }
        } else if (car.timer > 1 && !this.police.some(o => o.unit === car.id)) car.state = 'leaving';
      } else if (car.state === 'leaving') {
        car.speed = Math.min(CAR_SPEED * 1.2, car.speed + 260 * dt);
        car.x += car.dir * car.speed * dt;
      }
      car.wheel += car.dir * car.speed * dt / 7;
    }
    // Gone once they've driven off the far edge, or been left far behind.
    const gone = this.cars.filter(car => {
      if (car.state !== 'driving' && car.state !== 'leaving') return false;
      const past = car.dir > 0 ? car.x > this.camera + WIDTH + 160 : car.x < this.camera - 160;
      return past || Math.abs(car.x - (this.camera + WIDTH / 2)) > 900;
    });
    if (!gone.length) return;
    this.cars = this.cars.filter(car => !gone.includes(car));
    // D.D drove past without being noticed; he'll be round again.
    if (gone.some(car => car.kind === 'bmw' && !car.handed)) this.bmwTimer = 25 + this.random() * 20;
  }

  /** I fires along the courier's lane at the nearest crew member, but never at the police. */
  private shoot(): void {
    const p = this.player;
    this.shotBuffer = 0;
    if (this.ammo <= 0) { if (this.metDD) this.events.push('empty'); return; }
    const inLine = (f: Fighter) => {
      const dx = (f.x - p.x) * p.facing;
      return dx > 6 && f.x > this.camera - 10 && f.x < this.camera + WIDTH + 10 && Math.abs(f.y - p.y) <= LANE + 2 && f.z < 30 ? dx : Infinity;
    };
    const target = this.enemies.filter(e => e.hp > 0 && !OUT.has(e.state)).map(e => ({ e, d: inLine(e) }))
      .filter(o => o.d < Infinity).sort((a, b) => a.d - b.d)[0];
    const officer = Math.min(Infinity, ...this.police.filter(o => !o.gone && o.state !== 'down').map(inLine));
    if (officer < (target?.d ?? Infinity)) { this.say('msg.notPolice'); return; }
    this.ammo--;
    p.aimTimer = 0.28;
    p.shotCooldown = SHOT_COOLDOWN;
    const muzzle = { x: p.x + p.facing * 24, y: p.y, z: 30 };
    const end = target ? target.e.x - p.facing * 4 : p.x + p.facing * WIDTH;
    this.effects.push({ kind: 'muzzle', ...muzzle }, { kind: 'tracer', ...muzzle, x1: end, y1: p.y });
    this.events.push('shot');
    if (target) this.hitEnemy(target.e, SHOT_DAMAGE, target.e.kind === 'runner', true);
    this.offence();
    if (this.ammo === 0) this.say('msg.gunEmpty');
  }

  // ---------------------------------------------------------------- police

  /** Gunfire and shoving officers bring the police; enough of it brings a second patrol. */
  private offence(): void {
    this.heat++;
    this.sinceOffence = 0;
    const units = new Set(this.police.filter(o => o.state !== 'leave').map(o => o.unit)).size + (this.dispatch !== null ? 1 : 0);
    if (units === 0) {
      this.dispatch = 3.5;
      if (this.heat === 1) this.say('msg.shotsFired');
    } else if (units === 1 && this.heat >= 6 && this.dispatch === null) this.dispatch = 5;
  }

  private makeOfficer(unit: number, x: number, y: number, delay: number): Officer {
    return {
      id: unit * 10 + this.police.length, unit, x, y, z: 0, vx: 0, vz: 0, facing: this.player.x < x ? -1 : 1, hp: 1, maxHp: 1,
      flash: 0, walk: 0, state: 'exit', timer: delay, cooldown: 0.8, gone: false,
    };
  }

  /** A patrol car comes up from behind the courier; off the road, the officers come on foot. */
  private sendUnit(): void {
    const p = this.player;
    this.events.push('siren');
    this.say('msg.polis');
    const dir: 1 | -1 = p.facing > 0 ? 1 : -1;
    if (this.roadInView()) {
      const car = this.makeCar('police', dir, CAR_SPEED * 1.25);
      car.stopAt = clamp(p.x - dir * 50, this.camera + 70, this.camera + WIDTH - 70);
      return;
    }
    const unit = this.nextUnit++;
    for (const k of [0, 1]) {
      const x = dir > 0 ? this.camera - 24 - k * 22 : this.camera + WIDTH + 24 + k * 22;
      const officer = this.makeOfficer(unit, x, clamp(p.y + (k ? 14 : -14), BAND_TOP, BAND_BOTTOM), 0);
      officer.state = 'run';
      this.police.push(officer);
    }
  }

  private catchable(): boolean {
    const p = this.player;
    return p.hp > 0 && p.cuffTimer <= 0 && p.downTimer <= 0 && p.riseTimer <= 0 && p.dodgeTimer <= 0 && p.invulnerable <= 0 && p.z < 10;
  }

  private updatePolice(dt: number): void {
    if (this.dispatch !== null) {
      this.dispatch -= dt;
      if (this.dispatch <= 0) { this.dispatch = null; this.sendUnit(); }
    }
    if (this.police.some(o => o.state !== 'leave')) {
      this.sinceOffence += dt;
      if (this.sinceOffence > GIVE_UP) this.standDown('msg.policeLost');
    }
    for (const o of this.police) this.updateOfficer(o, dt);
    this.police = this.police.filter(o => !o.gone);
  }

  private standDown(key: Key, params?: Params): void {
    for (const o of this.police) if (o.state !== 'cuff') o.state = 'leave';
    this.heat = 0;
    this.dispatch = null;
    this.say(key, params);
  }

  private updateOfficer(o: Officer, dt: number): void {
    const p = this.player;
    o.flash = Math.max(0, o.flash - dt);
    o.cooldown = Math.max(0, o.cooldown - dt);
    if (o.z > 0 || o.vz > 0) {
      o.vz -= GRAVITY * dt;
      o.z += o.vz * dt;
      if (o.z <= 0) { o.z = 0; o.vz = 0; if (o.state === 'down') { o.vx *= 0.25; this.effects.push({ kind: 'dust', x: o.x, y: o.y, z: 0 }); this.events.push('thud'); } }
    }
    o.x += o.vx * dt;
    if (o.z <= 0) o.vx *= Math.max(0, 1 - dt * 9);
    switch (o.state) {
      case 'exit':
      case 'hurt':
      case 'rise':
        o.timer -= dt;
        if (o.timer <= 0) { o.state = 'run'; o.cooldown = Math.max(o.cooldown, 0.3); }
        return;
      case 'down':
        if (o.z > 0) return;
        o.timer -= dt;
        if (o.timer <= 0) { o.state = 'rise'; o.timer = 0.4; }
        return;
      case 'cuff':
        o.timer -= dt;
        o.facing = p.x >= o.x ? 1 : -1;
        if (o.timer <= 0) o.state = 'leave';
        return;
      case 'grab':
        o.timer -= dt;
        if (o.timer > 0) return;
        if (this.catchable() && Math.abs(p.x - o.x) <= 28 && Math.abs(p.y - o.y) <= LANE) this.bust(o);
        else { o.state = 'run'; o.cooldown = 0.7; }
        return;
      case 'leave': {
        // Back to the patrol car, or off the edge of the screen.
        const car = this.cars.find(c => c.id === o.unit);
        const tx = car ? car.x : o.x < this.camera + WIDTH / 2 ? this.camera - 80 : this.camera + WIDTH + 80;
        const dx = tx - o.x;
        o.x += clamp(dx, -70 * dt, 70 * dt);
        o.facing = dx >= 0 ? 1 : -1;
        o.walk += dt * 9;
        if (Math.abs(dx) < 8 || o.x < this.camera - 60 || o.x > this.camera + WIDTH + 60) o.gone = true;
        return;
      }
    }
    // Running the courier down.
    o.x = clamp(o.x, this.camera - 60, this.camera + WIDTH + 60);
    const side = o.x < p.x ? -1 : 1;
    const dx = p.x + side * 16 - o.x, dy = p.y - o.y;
    o.x += clamp(dx, -POLICE_SPEED * dt, POLICE_SPEED * dt);
    o.y = clamp(o.y + clamp(dy, -POLICE_SPEED * 0.65 * dt, POLICE_SPEED * 0.65 * dt), BAND_TOP, BAND_BOTTOM);
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) o.walk += dt * 12;
    o.facing = p.x >= o.x ? 1 : -1;
    const gap = Math.abs(p.x - o.x);
    if (o.cooldown <= 0 && gap <= 24 && gap >= 6 && Math.abs(dy) <= 6 && this.catchable()) {
      o.state = 'grab';
      o.timer = 0.45;
      this.events.push('warn');
    }
  }

  /** Caught: cuffed, the gun confiscated, a fine, and the police are satisfied. */
  private bust(officer: Officer): void {
    const p = this.player;
    p.cuffTimer = 1.4;
    p.attackTimer = 0; p.kick = false; p.vx = 0; p.aimTimer = 0;
    p.invulnerable = Math.max(p.invulnerable, 2.6);
    officer.state = 'cuff';
    officer.timer = 1.4;
    this.ammo = 0;
    this.fines++;
    this.standDown('msg.busted', { fine: FINE });
    this.events.push('cuff');
  }

  /** A punch staggers an officer and a finisher knocks one over, but it keeps the police after you. */
  private shoveOfficer(o: Officer, knockdown: boolean): void {
    const dir = o.x >= this.player.x ? 1 : -1;
    o.flash = 0.16;
    o.facing = dir > 0 ? -1 : 1;
    if (knockdown) { o.state = 'down'; o.timer = 1.1; o.vx = dir * 140; o.vz = 150; o.z = Math.max(o.z, 1); this.events.push('smash'); }
    else { o.state = 'hurt'; o.timer = 0.35; o.vx = dir * 60; this.events.push('hit'); }
    this.effects.push({ kind: knockdown ? 'smash' : 'spark', x: o.x - dir * 6, y: o.y, z: o.z + 27 });
    this.freeze = knockdown ? 0.08 : 0.05;
    if (this.heat === 0 && !this.messageTimer) this.say('msg.assault');
    this.offence();
  }

  // ---------------------------------------------------------------- mission

  private checkObjectives(): void {
    const p = this.player, st = this.stage;
    if (!this.hasPackage) {
      if (Math.abs(p.x - st.package.x) < 16 && Math.abs(p.y - st.package.y) < 14 && p.z < 12) {
        this.hasPackage = true;
        this.say('msg.gotPackage');
        this.events.push('parcel');
        this.effects.push({ kind: 'heal', x: p.x, y: p.y, z: 30 });
      } else if (p.x > this.camera + WIDTH - 30 && !this.messageTimer) this.say('msg.dontForget');
      return;
    }
    if (st.marcusX !== null && !this.healed && !this.active && p.hp > 0 && p.z <= 0 && Math.abs(p.x - st.marcusX) < 22 && p.y < BAND_TOP + 24) {
      this.healed = true;
      this.checkpoint = st.marcusX;
      p.hp = p.maxHp;
      this.say('msg.marcusPatched');
      this.events.push('pickup');
      this.effects.push({ kind: 'heal', x: p.x, y: p.y, z: 30 });
    }
    if (this.homeCrewDown && Math.abs(p.x - st.homeX) < 18 && p.y < BAND_TOP + 24 && p.z <= 0 && p.hp > 0) {
      this.score = Math.max(0, computeScore(this.elapsed, p.hp, this.koCount, this.continues) - this.fines * FINE);
      this.bestScore = Math.max(this.bestScore, this.score);
      try { localStorage.setItem(BEST_KEY, String(this.bestScore)); } catch { /* private mode */ }
      this.mode = 'victory';
      this.events.push('victory');
    }
  }

  say(key: Key, params?: Params): void { this.toast = { key, params }; this.messageTimer = 3.1; }
}
