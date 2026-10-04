import { describe, expect, it } from 'vitest';
import { EGGS, PANCAKES, PLANTS, TOP, TUNING } from '../src/play/family/games/pannkakor';
import { PancakeRun, donenessOf } from '../src/play/family/pancake-run';
import { seeded } from '../src/play/family/hide-run';

const run = (g: PancakeRun, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60); };
const fresh = () => { const g = new PancakeRun(seeded(1)); g.events = []; return g; };
/** Everything in the bowl and whisked smooth. */
const batter = () => { const g = fresh(); for (let i = 0; i < EGGS; i++) g.add('egg'); g.add('milk'); g.add('flour'); run(g, TUNING.into + 0.1); g.stir(1); g.events = []; return g; };
/** One pancake: poured, cooked `side1` seconds, flipped, slid onto the plate. */
const fry = (g: PancakeRun, side1: number) => {
  expect(g.tapPan()).toBe('pour'); run(g, TUNING.pour + 0.02);
  run(g, side1); expect(g.tapPan()).toBe('flip');
  run(g, TUNING.flight + TUNING.side2 + 0.05); expect(g.tapPan()).toBe('plate');
  run(g, TUNING.slide + 0.05);
};

describe('Pannkakor: the batter', () => {
  it('takes three eggs, the milk and the flour, in any order, and each only once', () => {
    const g = fresh();
    expect(g.next).toBe('egg');
    expect(g.add('flour')).toBe(true); expect(g.add('flour')).toBe(false);
    for (let i = 0; i < EGGS; i++) expect(g.add('egg')).toBe(true);
    expect(g.add('egg')).toBe(false);
    expect(g.next).toBe('milk');
    g.add('milk');
    expect(g.next).toBeNull();
    // Not whisking until everything has landed in the bowl.
    expect(g.phase).toBe('batter');
    run(g, TUNING.into + 0.1);
    expect(g.phase).toBe('whisk');
    expect(g.events).toContain('in:egg'); expect(g.events).toContain('whisk');
  });

  it('is whisked smooth by stirring, a little at a time or by distance', () => {
    const g = fresh();
    g.stir(1); expect(g.smooth).toBe(0); // nothing to whisk yet
    for (let i = 0; i < EGGS; i++) g.add('egg'); g.add('milk'); g.add('flour'); run(g, 1);
    // A finger reports small moves, many times a second.
    for (let i = 0; i < 50; i++) g.stirBy(TUNING.whiskWork / 100);
    expect(g.smooth).toBeCloseTo(0.5);
    expect(g.events.filter(e => e === 'stir').length).toBeGreaterThanOrEqual(4);
    g.stirBy(TUNING.whiskWork);
    expect(g.smooth).toBe(1); expect(g.phase).toBe('fry'); expect(g.events).toContain('smooth');
  });

  it('can be made with nothing but the next-step key', () => {
    const g = fresh();
    for (let i = 0; i < 40 && g.phase !== 'fry'; i++) { g.primary(); run(g, 1); }
    expect(g.phase).toBe('fry');
  });
});

describe('Pannkakor: the pan', () => {
  it('cooks pale, golden or brown by when it is flipped, and every one goes on the plate', () => {
    expect(donenessOf(TUNING.bubbles - 0.5)).toBe('pale');
    expect(donenessOf((TUNING.bubbles + TUNING.brown) / 2)).toBe('golden');
    expect(donenessOf(TUNING.brown + 1)).toBe('brown');
    const g = batter();
    fry(g, 0.5); fry(g, TUNING.bubbles + 1); fry(g, TUNING.brown + 2);
    expect(g.stack).toEqual(['pale', 'golden', 'brown']);
    expect(g.events).toEqual(expect.arrayContaining(['landed:pale', 'landed:golden', 'landed:brown', 'stacked:3', 'bubbles']));
  });

  it('does only what fits: no flipping an empty pan, no plating a pancake still cooking', () => {
    const g = batter();
    expect(g.panAction).toBe('pour');
    g.tapPan(); expect(g.tapPan()).toBeNull(); // still pouring
    run(g, TUNING.pour + 0.02); g.tapPan();
    run(g, 0.2); expect(g.tapPan()).toBeNull(); // in the air
    run(g, TUNING.flight); expect(g.tapPan()).toBeNull(); // second side not done
  });

  it('slides a forgotten pancake onto the plate by itself', () => {
    const g = batter();
    g.tapPan(); run(g, TUNING.pour + 3); g.tapPan();
    run(g, TUNING.flight + TUNING.autoPlate + TUNING.slide + 0.1);
    expect(g.stack).toHaveLength(1); expect(g.pan.state).toBe('empty');
  });

  it('makes five, then the toppings', () => {
    const g = batter();
    expect(g.batterLeft).toBe(PANCAKES);
    for (let i = 0; i < PANCAKES; i++) fry(g, 3);
    expect(g.stack).toHaveLength(PANCAKES); expect(g.batterLeft).toBe(0);
    expect(g.phase).toBe('toppings'); expect(g.panAction).toBeNull();
  });
});

describe('Pannkakor: toppings, the plants and the hints', () => {
  const toppings = () => { const g = batter(); for (let i = 0; i < PANCAKES; i++) fry(g, 3); g.events = []; return g; };

  it('puts toppings on the pancake, kept on it, and paints a line of them with a finger', () => {
    const g = toppings();
    g.setTopping('blueberry');
    g.place(10, 5); g.place(TOP.rx * 3, 0);
    expect(g.toppings).toHaveLength(2);
    expect(g.toppings[1].x).toBeLessThanOrEqual(TOP.rx); expect(g.toppings[1].kind).toBe('blueberry');
    g.undoTopping(); g.undoTopping(); expect(g.toppings).toHaveLength(0);
    g.paint(-100, 0, true);
    for (let x = -100; x <= 100; x += 5) g.paint(x, 0, false);
    expect(g.toppings.length).toBeGreaterThanOrEqual(7); expect(g.toppings.length).toBeLessThanOrEqual(9);
    g.lift();
  });

  it('stops at the most toppings a pancake can hold, and finishes', () => {
    const g = toppings();
    for (let i = 0; i < TUNING.maxToppings + 20; i++) g.place(0, 0);
    expect(g.toppings).toHaveLength(TUNING.maxToppings);
    expect(g.finish()).toBe(true); expect(g.phase).toBe('done'); expect(g.events).toContain('done');
    expect(g.place(0, 0)).toBe(false);
  });

  it('waters the plants at any time', () => {
    const g = fresh();
    g.water(2); run(g, 1);
    expect(g.plants[2]).toBeCloseTo(1, 1); expect(g.plants[0]).toBe(-1);
    g.water(PLANTS.length); expect(g.events.filter(e => e.startsWith('water'))).toHaveLength(1);
  });

  it('points at the next thing to do when nothing happens for a while', () => {
    const g = fresh();
    expect(g.hint).toBeNull();
    run(g, TUNING.hintAfter + 0.1); expect(g.hint).toBe('egg');
    for (let i = 0; i < EGGS; i++) g.add('egg');
    expect(g.hint).toBeNull();
    run(g, TUNING.hintAfter + 0.1); expect(g.hint).toBe('milk');
    const b = batter(); run(b, TUNING.hintAfter + 0.1); expect(b.hint).toBe('pan');
  });
});
