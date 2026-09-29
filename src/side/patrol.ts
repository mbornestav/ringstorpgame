import { BAND_BOTTOM, BAND_TOP } from './layout';

// Police on foot that watch a stretch of ground: sight cones, suspicion, chase, grab and search.
// Shared by the Gods run (one target) and the truck yard (D.D and Goran, with trailers blocking the view).

export type PatrolState = 'walk' | 'wait' | 'alert' | 'chase' | 'grab' | 'cuff' | 'search';
export interface Patrol {
  id: number; x: number; y: number; z: number; facing: 1 | -1; walk: number;
  x0: number; x1: number; state: PatrolState; timer: number; suspicion: number; flash: number; lostFor: number; cooldown: number;
  /** Who they are after, while chasing. */
  target?: string;
}

/** Someone the police may notice and arrest. */
export interface Target {
  id: string; x: number; y: number; z: number;
  moving: boolean; sneaking: boolean; hidden: boolean;
  /** Only a target that gives itself away (carrying stolen goods, a noisy job) rouses suspicion. */
  visible: boolean;
  /** False while jumping or dodging, which slips out of a grab. */
  catchable: boolean;
}

export interface PatrolTuning {
  sight: number; sneakSight: number; hiddenSight: number; hearing: number;
  patrolSpeed: number; chaseSpeed: number; grabTime: number; suspicionRate: number;
}
export const SIGHT_RANGE = 170;
export const SNEAK_SIGHT = 0.55;
export const HIDDEN_SIGHT = 26;
export const HEARING = 30;
export const PATROL_SPEED = 38;
export const CHASE_SPEED = 86;
export const GRAB_TIME = 0.45;
export const DEFAULT_TUNING: PatrolTuning = {
  sight: SIGHT_RANGE, sneakSight: SNEAK_SIGHT, hiddenSight: HIDDEN_SIGHT, hearing: HEARING,
  patrolSpeed: PATROL_SPEED, chaseSpeed: CHASE_SPEED, grabTime: GRAB_TIME, suspicionRate: 1,
};

export interface CrewHooks {
  targets(): Target[];
  /** Something between the officer and the target (a parked trailer) hides them from each other. */
  blocked?(o: Patrol, t: Target): boolean;
  /** A noise that carries beyond the officer's sight cone. */
  noise?(o: Patrol): { x: number; radius: number } | null;
  onAlarm(o: Patrol, t: Target | null): void;
  onCaught(o: Patrol, t: Target): void;
  onSearch?(o: Patrol): void;
  readonly events: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class PatrolCrew {
  patrols: Patrol[] = [];

  constructor(readonly tuning: PatrolTuning = DEFAULT_TUNING) {}

  /** How far this officer can make out a target. */
  range(t: Target): number {
    if (t.hidden) return this.tuning.hiddenSight;
    return this.tuning.sight * (t.sneaking ? this.tuning.sneakSight : 1) * (t.moving ? 1 : 0.85);
  }

  /** In front of the officer and in range, or right behind them and close enough to hear. */
  sees(o: Patrol, t: Target, range: number, h?: CrewHooks): boolean {
    const dx = t.x - o.x;
    if (Math.abs(dx) > range || Math.abs(t.y - o.y) > 50) return false;
    if (h?.blocked?.(o, t)) return false;
    return dx * o.facing >= 0 || Math.abs(dx) <= this.tuning.hearing * (t.sneaking ? 0.6 : 1);
  }

  /** Everyone who isn't already cuffing someone calms down, for after an arrest. */
  calm(except: Patrol): void {
    for (const other of this.patrols) if (other !== except && other.state !== 'cuff') { other.state = 'walk'; other.suspicion = 0; }
  }

  update(dt: number, h: CrewHooks): void {
    for (const o of this.patrols) o.flash = Math.max(0, o.flash - dt);
    const targets = h.targets();
    if (!targets.length) return;
    for (const o of this.patrols) this.step(o, dt, h, targets);
  }

  private step(o: Patrol, dt: number, h: CrewHooks, targets: Target[]): void {
    const tune = this.tuning;
    o.cooldown = Math.max(0, o.cooldown - dt);
    const near = () => targets.reduce((a, b) => Math.abs(b.x - o.x) < Math.abs(a.x - o.x) ? b : a);
    const cur = (o.target ? targets.find(t => t.id === o.target) : undefined) ?? near();
    const dx = cur.x - o.x;
    switch (o.state) {
      case 'cuff': o.timer -= dt; o.facing = dx >= 0 ? 1 : -1; if (o.timer <= 0) o.state = 'walk'; return;
      case 'grab':
        o.timer -= dt;
        if (o.timer > 0) return;
        if (cur.catchable && Math.abs(dx) <= 28 && Math.abs(cur.y - o.y) <= 14) { o.state = 'cuff'; o.timer = 1.4; h.onCaught(o, cur); }
        else { o.state = 'chase'; o.cooldown = 0.7; }
        return;
      case 'chase': {
        o.facing = dx >= 0 ? 1 : -1;
        o.x += clamp(dx - o.facing * 14, -tune.chaseSpeed * dt, tune.chaseSpeed * dt);
        o.y = clamp(o.y + clamp(cur.y - o.y, -tune.chaseSpeed * 0.65 * dt, tune.chaseSpeed * 0.65 * dt), BAND_TOP, BAND_BOTTOM);
        o.walk += dt * 12;
        const gap = Math.abs(dx);
        if (o.cooldown <= 0 && gap <= 24 && gap >= 4 && Math.abs(cur.y - o.y) <= 8 && cur.catchable) { o.state = 'grab'; o.timer = tune.grabTime; h.events.push('warn'); return; }
        const seen = cur.visible && this.sees(o, cur, tune.sight * 1.6, h) && !cur.hidden;
        o.lostFor = seen ? 0 : o.lostFor + dt;
        if (o.lostFor > 2.5 || !cur.visible) { o.state = 'search'; o.timer = 4; o.suspicion = 0.4; o.lostFor = 0; }
        return;
      }
      case 'search': {
        o.timer -= dt;
        o.facing = Math.floor(o.timer * 1.25) % 2 ? 1 : -1;
        h.onSearch?.(o);
        for (const t of targets) if (t.visible && this.sees(o, t, this.range(t), h)) { o.suspicion += dt * 1.6 * tune.suspicionRate; break; }
        if (o.suspicion >= 1) return this.alarm(o, h, targets, near());
        if (o.timer <= 0) { o.state = 'walk'; o.suspicion = 0; }
        return;
      }
    }
    // Watching: walking the beat, or pausing at its ends.
    let seenBy: Target | null = null;
    for (const t of targets) {
      if (!t.visible || !this.sees(o, t, this.range(t), h)) continue;
      if (!seenBy || Math.abs(t.x - o.x) < Math.abs(seenBy.x - o.x)) seenBy = t;
    }
    let heard = false;
    if (seenBy) {
      const d = Math.abs(seenBy.x - o.x), range = this.range(seenBy);
      o.suspicion = Math.min(1.05, o.suspicion + dt * tune.suspicionRate * (0.9 + 1.6 * (1 - d / range)));
      o.facing = seenBy.x >= o.x ? 1 : -1;
    } else {
      const n = h.noise?.(o);
      if (n && Math.abs(n.x - o.x) < n.radius) {
        heard = true;
        o.suspicion = Math.min(1.05, o.suspicion + dt * tune.suspicionRate * 0.6);
        o.facing = n.x >= o.x ? 1 : -1;
      } else o.suspicion = Math.max(0, o.suspicion - dt * 0.5);
    }
    if (o.suspicion >= 1) return this.alarm(o, h, targets, seenBy ?? near());
    if (o.suspicion > 0.3 && (seenBy || heard)) { o.state = 'alert'; return; }
    if (o.state === 'alert') { if (o.suspicion < 0.15) { o.state = 'walk'; o.timer = 0; } return; }
    if (o.state === 'wait') { o.timer -= dt; if (o.timer <= 0) { o.state = 'walk'; o.facing = o.x >= (o.x0 + o.x1) / 2 ? -1 : 1; } return; }
    o.x += o.facing * tune.patrolSpeed * dt;
    o.walk += dt * 6;
    if ((o.facing > 0 && o.x >= o.x1) || (o.facing < 0 && o.x <= o.x0)) { o.x = clamp(o.x, o.x0, o.x1); o.state = 'wait'; o.timer = 1.2 + (o.id % 3) * 0.6; }
  }

  private alarm(o: Patrol, h: CrewHooks, targets: Target[], t: Target): void {
    o.state = 'chase'; o.suspicion = 1; o.lostFor = 0; o.cooldown = 0.5; o.target = t.id;
    h.events.push('alert');
    h.onAlarm(o, t);
    // Anyone close by joins in.
    for (const other of this.patrols) {
      if (other !== o && Math.abs(other.x - o.x) < 160 && (other.state === 'walk' || other.state === 'wait' || other.state === 'alert')) {
        other.state = 'chase'; other.suspicion = 1; other.cooldown = 0.6; other.target = t.id;
      }
    }
    void targets;
  }
}
