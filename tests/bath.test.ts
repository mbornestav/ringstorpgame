import { describe, expect, it } from 'vitest';
import { BathRun } from '../src/play/family/bath-run';
import { TUNING } from '../src/play/family/games/badrum';
import { ITEMS } from '../src/play/family/games/toa';
import { seeded } from '../src/play/family/hide-run';
import { SillyRun } from '../src/play/family/silly-run';

const run = (g: BathRun, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60); };
const fresh = () => { const g = new BathRun(seeded(2)); g.events = []; return g; };
/** Through the hand washing, to the toothpaste. */
const toBrush = () => { const g = fresh(); g.stepUp(); g.pump(); g.pump(); g.rub(TUNING.rubWork); g.rinse(); run(g, TUNING.rinse + 0.05); g.dry(); g.paste(); g.events = []; return g; };

describe('Tänder och tvål: hands', () => {
  it('goes step by step: stool, two pumps, rubbing, rinsing, drying', () => {
    const g = fresh();
    g.pump(); g.rinse(); expect(g.phase).toBe('stool');
    g.stepUp(); expect(g.phase).toBe('soap');
    g.pump(); expect(g.phase).toBe('soap'); g.pump(); expect(g.phase).toBe('rub');
    g.rub(TUNING.rubWork / 2); expect(g.lather).toBeCloseTo(0.5); expect(g.phase).toBe('rub');
    g.rub(TUNING.rubWork); expect(g.phase).toBe('rinse');
    g.rinse(); run(g, TUNING.rinse / 2); expect(g.lather).toBeLessThan(1); expect(g.phase).toBe('rinse');
    run(g, TUNING.rinse); expect(g.phase).toBe('dry'); expect(g.lather).toBe(0);
    g.dry(); expect(g.phase).toBe('paste');
  });

  it('rubbing makes bubbles that float up and can be popped', () => {
    const g = fresh(); g.stepUp(); g.pump(); g.pump();
    for (let i = 0; i < 10; i++) g.rub(70);
    expect(g.bubbles.length).toBeGreaterThan(5);
    const b = g.bubbles[0];
    expect(g.pop([b.x, b.y])).toBe(true);
    expect(g.pop([-500, -500])).toBe(false);
    const y = g.bubbles[0].y; run(g, 0.5); expect(g.bubbles[0]?.y ?? 0).toBeLessThan(y);
    run(g, 20); expect(g.bubbles).toHaveLength(0);
  });
});

describe('Tänder och tvål: teeth', () => {
  it('brushing over a bug scrubs it away; brushing elsewhere does not', () => {
    const g = toBrush(), b = g.bugs[0], far: [number, number] = [b.at[0] + 200, b.at[1] - 200];
    g.scrub(far, TUNING.bugWork * 2);
    expect(b.gone).toBe(-1);
    for (let i = 0; i < 10; i++) g.scrub([b.at[0] + (i % 2 ? 6 : -6), b.at[1]], TUNING.bugWork / 8);
    expect(b.gone).toBeGreaterThanOrEqual(0); expect(g.events).toContain('bug:0');
    expect(g.events.filter(e => e === 'note').length).toBeGreaterThan(0);
  });

  it('all bugs gone: rinse the mouth and smile', () => {
    const g = toBrush();
    for (const b of g.bugs) g.scrub(b.at, TUNING.bugWork * 1.1);
    expect(g.left).toHaveLength(0); expect(g.phase).toBe('spit');
    g.spit(); expect(g.won).toBe(true); expect(g.events).toContain('done');
  });

  it('can be done start to finish with only the next-step key', () => {
    const g = fresh();
    for (let i = 0; i < 200 && !g.won; i++) { g.primary(); run(g, 0.2); }
    expect(g.won).toBe(true);
  });

  it('points at the next thing after a while', () => {
    const g = fresh();
    run(g, TUNING.hintAfter + 0.1); expect(g.hint).toBe('stool');
    g.stepUp(); expect(g.hint).toBeNull();
  });
});

describe('Fånig i spegeln', () => {
  it('wears one thing in each place, swaps in its place, and takes it off again', () => {
    const g = new SillyRun();
    g.toggle('crown'); g.toggle('glasses'); g.toggle('moustache');
    expect(g.wearing.sort()).toEqual(['crown', 'glasses', 'moustache']);
    g.toggle('pirate'); expect(g.worn.head).toBe('pirate');
    g.toggle('pirate'); expect(g.worn.head).toBeNull();
    g.clear(); expect(g.wearing).toHaveLength(0);
    expect(new Set(ITEMS.map(i => i.id)).size).toBe(ITEMS.length);
  });

  it('pulls faces round and round, and the first photo is the one that counts', () => {
    const g = new SillyRun();
    for (let i = 0; i < 5; i++) g.nextFace();
    expect(g.face).toBe(0);
    g.photo(); g.photo();
    expect(g.events.filter(e => e === 'first')).toHaveLength(1); expect(g.photos).toBe(2);
  });
});
