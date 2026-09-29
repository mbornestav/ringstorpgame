import { CAST } from '../../side/gods-cast';
import type { Key } from '../../side/i18n';
import type { ContentBundle } from './types';

export default {
  environment: {
    id: 'kurirgatan-28d-floor-8',
    size: { width: 480, height: 270 },
    bounds: { left: 18, right: 462, top: 176, bottom: 248 },
    spawns: { lift: { x: 94, y: 214 } }, entry: 'lift',
    artwork: { kind: 'kurirgatan-corridor', floor: 8 },
    camera: { kind: 'fixed', x: 0, y: 0 }, atmosphere: 'ringstorp',
    actors: [{ id: 'dd', appearance: 'dd', x: 340, y: 214, facing: -1, event: 'talk-dd', label: 'act2.dd' }],
    population: { kind: 'kurirgatan-neighbours', floor: 8, candidates: CAST.map(a => a.id), avoid: { x: 340, distance: 70 } },
    interactions: { policy: 'nearest-horizontal-then-exit', reachX: 40, reachY: 30 },
    exits: [{ id: 'lift', xLessThan: 90, label: 'act2.lift', event: 'use-lift', destination: 'kurirgatan-28d-lift', spawn: 'floor-8', boundary: true }],
    mission: 'gods-handoff', objective: { flag: 'received', before: 'obj2.lift', after: 'obj2.out' },
  },
  dialogues: [
    { id: 'dd-handoff', speaker: 'dd', lines: ['msg.dd2Gods'], repeat: 'last', portrait: 'dd', duration: 3.1 },
    { id: 'dd-followup', speaker: 'dd', lines: ['msg.dd2Go'], repeat: 'last', portrait: 'dd', duration: 3.1 },
    ...CAST.map(a => ({ id: a.id, speaker: a.id, lines: [`npc.${a.id}.1`, `npc.${a.id}.2`] as Key[], repeat: 'cycle' as const, duration: 3.1 })),
  ],
  mission: {
    id: 'gods-handoff', flags: ['received'],
    rules: [
      { event: 'talk-dd', when: { flag: 'received', equals: false }, sound: 'gun', actions: [
        { type: 'flag', id: 'received', value: true }, { type: 'cargo', value: 'carried' }, { type: 'dialogue', id: 'dd-handoff' },
      ] },
      { event: 'talk-dd', when: { flag: 'received', equals: true }, actions: [{ type: 'dialogue', id: 'dd-followup' }] },
      { event: 'use-lift', sound: 'doors', actions: [{ type: 'exit', id: 'lift' }] },
    ],
  },
} satisfies ContentBundle;
