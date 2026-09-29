import { describe, expect, it } from 'vitest';
import reference from './fixtures/corridor/reference.json';
import bundle from '../src/phaser/content/corridor.environment';
import { validateContent } from '../src/phaser/content/validate';
import { Movement } from '../src/phaser/movement';
import { Visit, newRun, populate } from '../src/phaser/session';
import { SideGame } from '../src/side/game';

describe('corridor reference behaviour', () => {
  for (const trace of reference.trace) it(`preserves locomotion at ${trace.dt}s steps`, () => {
    const movement = new Movement(); let x = 94, y = 214;
    trace.frames.forEach((frame, i) => {
      const dt = trace.dt;
      if (i === Math.round(0.3 / dt)) movement.jump();
      if (i === Math.round(1.2 / dt)) movement.dodge();
      const velocity = movement.step(dt, { x: i < 1 / dt ? 1 : -1, y: i < 0.5 / dt ? 1 : -1, sneak: i >= 1.5 / dt });
      x = Math.max(18, Math.min(462, x + velocity.x * dt)); y = Math.max(176, Math.min(248, y + velocity.y * dt));
      expect(x).toBeCloseTo(frame.player.x, 9); expect(y).toBeCloseTo(frame.player.y, 9);
      for (const [key, actual] of Object.entries(movement.state)) {
        const expected = frame.player[key as keyof typeof frame.player];
        if (typeof actual === 'number') expect(actual, `${i}: ${key}`).toBeCloseTo(Number(expected), 9);
        else expect(actual).toBe(expected);
      }
    });
  });
  it('reproduces the original seeded inhabitants and positions, including empty floors', () => {
    const counts = new Set<number>();
    for (const seed of [reference.seed, ...Array.from({ length: 25 }, (_, i) => i * 3791)]) {
      const g = new SideGame(); g.random = () => seed / 1e9; g.startGods(); g.gods['populate'](8);
      const npcs = populate(bundle, seed).map(({ id, x, y, facing, talked }) => ({ id, x, y, facing, talked }));
      expect(npcs).toEqual(g.gods.npcs); counts.add(npcs.length);
    }
    expect([...counts].sort()).toEqual([1, 2]);
  });
  it('matches buffered landing jumps, dodge priority and cooldown against the original', () => {
    const g = new SideGame(); g.startGods(); g.gods.scene = 'floor'; g.transition = 0;
    g.player.x = 94; g.player.y = 214;
    const m = new Movement(); let x = 94, y = 214;
    for (let i = 0; i < 110; i++) {
      g.events = [];
      if ([0, 24, 58, 64].includes(i)) { g.queueJump(); m.jump(); }
      if ([8, 58, 64, 98].includes(i)) { g.queueDodge(); m.dodge(); }
      const input = { x: i < 60 ? 1 : -1, y: 1, sneak: true };
      g.setMovement(input.x, input.y); g.setSneak(input.sneak); g.update(.02);
      const v = m.step(.02, input); x = Math.max(18, Math.min(462, x + v.x * .02)); y = Math.max(176, Math.min(248, y + v.y * .02));
      expect(v.sounds).toEqual(g.events); expect(x).toBeCloseTo(g.player.x, 9); expect(y).toBeCloseTo(g.player.y, 9);
      for (const [key, value] of Object.entries(m.state)) expect(value).toEqual(g.player[key as keyof typeof g.player]);
    }
  });
});

const visit = () => new Visit(bundle, newRun(bundle.environment.id, reference.seed));
describe('adventure content and rules', () => {
  it('validates translations and rejects dangling references before scene creation', () => {
    expect(() => validateContent([bundle])).not.toThrow();
    const broken = structuredClone(bundle); broken.environment.mission = 'missing';
    expect(() => validateContent([broken])).toThrow('Invalid entry or mission');
    const duplicate = structuredClone(bundle); duplicate.environment.actors.push(duplicate.environment.actors[0]);
    expect(() => validateContent([duplicate])).toThrow('Duplicate');
    const translation = structuredClone(bundle); translation.dialogues[0].lines = ['missing.key' as never];
    expect(() => validateContent([translation])).toThrow('Missing translation');
  });
  it('preserves strict proximity edges, depth checks and airborne restrictions', () => {
    const v = visit(); v.actors = v.actors.filter(a => a.id === 'dd');
    const near = (x: number, y: number, z = 0, enabled = true) => v.interaction({ x, y, z }, enabled);
    expect(near(300, 214)).toBeNull(); expect(near(300.001, 214)?.kind).toBe('actor');
    expect(near(340, 244)).toBeNull(); expect(near(340, 243.999)?.kind).toBe('actor');
    expect(near(340, 214, .001)).toBeNull(); expect(near(340, 214, 0, false)).toBeNull();
    expect(near(90, 214)).toBeNull(); expect(near(89.999, 248)?.kind).toBe('exit');
  });
  it('selects nearest horizontal NPC before exit; preserves stable ties', () => {
    const v = visit(); const dd = v.actors.find(a => a.id === 'dd')!;
    v.actors = [{ ...dd, id: 'first', x: 80, y: 214 }, { ...dd, id: 'second', x: 85, y: 220 }];
    const selected = v.interaction({ x: 84, y: 214, z: 0 }, true);
    expect(selected?.kind === 'actor' && selected.actor.id).toBe('second');
    v.actors[1].x = 88;
    const tied = v.interaction({ x: 84, y: 214, z: 0 }, true);
    expect(tied?.kind === 'actor' && tied.actor.id).toBe('first');
  });
  it('grants cargo once and snapshots the exit without mutating outgoing progress', () => {
    const v = visit(); expect(v.event('talk-dd')).toEqual(['gun']);
    expect(v.run.flags.received).toBe(true); expect(v.run.cargo).toBe('carried'); expect(v.message?.key).toBe('msg.dd2Gods');
    expect(v.event('talk-dd')).toEqual([]); expect(v.message?.key).toBe('msg.dd2Go');
    v.event('use-lift'); expect(v.exit?.state.cargo).toBe('carried'); expect(v.exit?.state.location).toBe('kurirgatan-28d-lift');
    v.run.cargo = 'none'; expect(v.exit?.state.cargo).toBe('carried'); expect(v.event('use-lift')).toEqual([]);
  });
  it('cycles non-modal dialogue and resets counters and facing on re-entry', () => {
    const v = visit(), a = v.actors.find(a => a.id !== 'dd')!;
    const p = { x: a.x + 1, y: a.y };
    for (let i = 0; i < 3; i++) {
      v.interact({ kind: 'actor', actor: a }, p);
      expect(v.message?.key).toBe(`npc.${a.id}.${i % 2 + 1}`); expect(v.message?.remaining).toBe(3.1); expect(a.facing).toBe(1);
    }
    v.event('talk-dd'); const next = new Visit(bundle, v.run);
    expect(next.actors.map(a => a.talked)).toEqual([0, 0]); expect(next.run.cargo).toBe('carried');
    expect(next.actors).toEqual(populate(bundle, reference.seed));
  });
});
