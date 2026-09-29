import type { Key } from '../side/i18n';
import type { ActorDefinition, ContentBundle, DialogueDefinition, ExitRequest, Point, RunState } from './content/types';

export interface ActorState extends ActorDefinition { talked: number }
export interface Message { key: Key; portrait?: 'dd'; remaining: number }
export type Interaction = { kind: 'actor'; actor: ActorState } | { kind: 'exit'; exit: ContentBundle['environment']['exits'][number] };
export function newRun(id: string, seed: number): RunState {
  return { version: 1, seed, location: id, elapsed: 0, flags: {}, cargo: 'none' };
}
export function populate(bundle: ContentBundle, seed: number): ActorState[] {
  const pop = bundle.environment.population, actors: ActorState[] = [];
  if (pop) {
    // Preserve Kurirgatan's population sequence, including rejected positions.
    let a = (seed * 31 + pop.floor * 97) | 0;
    const rng = () => {
      a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const count = Math.floor(rng() * 2), pool = [...pop.candidates];
    for (let i = 0; i < count; i++) {
      const [id] = pool.splice(Math.floor(rng() * pool.length), 1);
      let x = 0;
      for (let tries = 0; tries < 12; tries++) {
        x = 130 + rng() * 320;
        if (actors.every(o => Math.abs(o.x - x) > 70) && Math.abs(x - pop.avoid.x) >= pop.avoid.distance) break;
      }
      actors.push({ id, appearance: id, dialogue: id, label: 'act2.talk', x, y: 196 + Math.round(rng() * 34), facing: rng() > 0.5 ? 1 : -1, talked: 0 });
    }
  }
  return [...actors, ...bundle.environment.actors.map(a => ({ ...a, talked: 0 }))];
}
/** Mission/session data only: no scene, input, timer, texture or physics ownership. */
export class Visit {
  actors: ActorState[];
  message: Message | null = null;
  exit: ExitRequest | null = null;
  constructor(readonly content: ContentBundle, readonly run: RunState) {
    run.location = content.environment.id;
    for (const id of content.mission.flags) run.flags[id] ??= false;
    this.actors = populate(content, run.seed);
  }
  interaction(p: Point & { z: number }, enabled: boolean): Interaction | null {
    if (!enabled || p.z > 0 || this.exit) return null;
    const { reachX, reachY } = this.content.environment.interactions;
    const actor = this.actors.filter(a => Math.abs(a.x - p.x) < reachX && Math.abs(a.y - p.y) < reachY)
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (actor) return { kind: 'actor', actor };
    const exit = this.content.environment.exits.find(x => p.x < x.xLessThan);
    return exit ? { kind: 'exit', exit } : null;
  }
  interact(target: Interaction, player: Point): string[] {
    if (this.exit) return [];
    if (target.kind === 'exit') return this.event(target.exit.event);
    const a = target.actor;
    if (a.event) return this.event(a.event);
    if (a.dialogue) {
      a.facing = player.x >= a.x ? 1 : -1;
      this.say(this.content.dialogues.find(d => d.id === a.dialogue)!, a.talked++);
    }
    return [];
  }
  private say(d: DialogueDefinition, index = 0): void {
    const i = d.repeat === 'cycle' ? index % d.lines.length : Math.min(index, d.lines.length - 1);
    this.message = { key: d.lines[i], portrait: d.portrait, remaining: d.duration };
  }
  event(event: string): string[] {
    // Select once before applying actions: a handoff must not also execute its follow-up.
    const rule = this.content.mission.rules.find(r => r.event === event && (!r.when || !!this.run.flags[r.when.flag] === r.when.equals));
    if (!rule || this.exit) return [];
    for (const a of rule.actions) {
      switch (a.type) {
        case 'flag': this.run.flags[a.id] = a.value; break;
        case 'cargo': this.run.cargo = a.value; break;
        case 'dialogue': this.say(this.content.dialogues.find(d => d.id === a.id)!); break;
        case 'exit': {
          const x = this.content.environment.exits.find(x => x.id === a.id)!;
          this.exit = { destination: x.destination, spawn: x.spawn, state: structuredClone(this.run) };
          this.exit.state.location = x.destination;
          break;
        }
      }
    }
    return rule.sound ? [rule.sound] : [];
  }
}
