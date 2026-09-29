import { ARCHETYPE } from '../../side/gods-cast';
import { tableFor, type Key } from '../../side/i18n';
import type { ContentBundle } from './types';

export function validateContent(bundles: ContentBundle[]): void {
  const unique = (ids: string[], kind: string) => {
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error(`Duplicate or empty ${kind} ID`);
  };
  const key = (k: Key) => {
    if (!tableFor('en')[k] || !tableFor('sv')[k]) throw new Error(`Missing translation: ${k}`);
  };
  unique(bundles.map(b => b.environment.id), 'environment');
  unique(bundles.map(b => b.mission.id), 'mission');
  for (const { environment: e, dialogues, mission: m } of bundles) {
    unique(e.actors.map(a => a.id), 'actor'); unique(dialogues.map(d => d.id), 'dialogue');
    unique([...e.actors.map(a => a.id), ...(e.population?.candidates ?? []), 'player'], 'actor/population');
    unique(e.exits.map(x => x.id), 'exit'); unique(m.flags, 'flag');
    const dialogue = (id: string) => { if (!dialogues.some(d => d.id === id)) throw new Error(`Unknown dialogue: ${id}`); };
    const flag = (id: string) => { if (!m.flags.includes(id)) throw new Error(`Unknown flag: ${id}`); };
    const event = (id: string) => { if (!m.rules.some(r => r.event === id)) throw new Error(`Unknown event: ${id}`); };
    const appearance = (id: string) => { if (id !== 'dd' && !ARCHETYPE.has(id)) throw new Error(`Unknown appearance: ${id}`); };
    if (e.mission !== m.id || !e.spawns[e.entry]) throw new Error(`Invalid entry or mission: ${e.id}`);
    const b = e.bounds;
    if (!(b.left < b.right && b.top < b.bottom && b.left >= 0 && b.top >= 0 && b.right <= e.size.width && b.bottom <= e.size.height)) throw new Error(`Invalid bounds: ${e.id}`);
    for (const p of Object.values(e.spawns)) if (!(p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom)) throw new Error(`Invalid spawn: ${e.id}`);
    flag(e.objective.flag); key(e.objective.before); key(e.objective.after);
    for (const a of e.actors) { appearance(a.appearance); key(a.label); if (a.dialogue) dialogue(a.dialogue); if (a.event) event(a.event); }
    if (e.population && !e.population.candidates.length) throw new Error(`Empty population: ${e.id}`);
    for (const id of e.population?.candidates ?? []) { appearance(id); dialogue(id); }
    for (const d of dialogues) { if (!d.lines.length || d.duration <= 0) throw new Error(`Empty dialogue: ${d.id}`); d.lines.forEach(key); }
    for (const x of e.exits) {
      key(x.label); event(x.event);
      if (!x.boundary && !bundles.some(b => b.environment.id === x.destination && b.environment.spawns[x.spawn])) throw new Error(`Unknown destination: ${x.destination}/${x.spawn}`);
    }
    for (const r of m.rules) {
      if (r.when) flag(r.when.flag);
      if (r.sound && !['gun', 'doors', 'jump', 'dodge'].includes(r.sound)) throw new Error(`Unknown sound: ${r.sound}`);
      for (const a of r.actions) {
        if (a.type === 'dialogue') dialogue(a.id);
        if (a.type === 'flag') flag(a.id);
        if (a.type === 'exit' && !e.exits.some(x => x.id === a.id)) throw new Error(`Unknown exit: ${a.id}`);
      }
    }
  }
}
