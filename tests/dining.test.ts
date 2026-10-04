import { describe, expect, it } from 'vitest';
import { DiningRun, slotAt } from '../src/play/family/dining-run';
import { CANDLES, PLACES, SOURCE, TUNING, WARES } from '../src/play/family/games/duka';

const run = (g: DiningRun, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60); };
const fresh = (food: 'pancakes' | 'meatballs' = 'meatballs') => { const g = new DiningRun(food); g.events = []; return g; };
const set = () => { const g = fresh(); for (const w of WARES) for (let i = 0; i < PLACES.length; i++) g.send(w); run(g, TUNING.hop + 0.05); g.events = []; return g; };

describe('Duka bordet: laying the table', () => {
  it('a tap on a stack sends the next one to the next empty place, in order, and counts the plates', () => {
    const g = fresh();
    g.grab(SOURCE.plate); g.drop([SOURCE.plate[0] + 3, SOURCE.plate[1]]);
    g.send('plate');
    run(g, TUNING.hop + 0.05);
    expect(g.laid).toEqual([{ place: 'mamma', ware: 'plate' }, { place: 'pappa', ware: 'plate' }]);
    expect(g.left('plate')).toBe(2);
    expect(g.events).toContain('count:plate:2');
  });

  it('a ware dragged near an empty place goes to that place', () => {
    const g = fresh(), spot = slotAt('nallen', 'glass');
    expect(g.grab(SOURCE.glass)).toBe('glass');
    expect(g.left('glass')).toBe(3);
    g.drag(spot); g.drop([spot[0] + 10, spot[1] - 5]);
    run(g, TUNING.hop + 0.05);
    expect(g.laid).toEqual([{ place: 'nallen', ware: 'glass' }]);
  });

  it('let go away from the places, it goes back on its stack and the empty places glow', () => {
    const g = fresh();
    g.grab(SOURCE.cutlery); g.drag([900, 100]); g.drop([900, 100]);
    expect(g.events).toContain('wrong:cutlery'); expect(g.glow?.ware).toBe('cutlery');
    run(g, TUNING.hop + 0.05);
    expect(g.laid).toHaveLength(0); expect(g.left('cutlery')).toBe(4);
  });

  it('takes nothing from an empty stack, and nothing once the table is set', () => {
    const g = fresh();
    for (let i = 0; i < 5; i++) g.send('plate');
    run(g, TUNING.hop + 0.05);
    expect(g.laid.filter(l => l.ware === 'plate')).toHaveLength(4);
    expect(g.grab(SOURCE.plate)).toBeNull();
    const s = set();
    expect(s.phase).toBe('candles'); expect(s.grab(SOURCE.glass)).toBeNull();
  });
});

describe('Duka bordet: candles and dinner', () => {
  it('lights the candles one by one, then the food comes in and dinner begins', () => {
    const g = set();
    g.serve(); expect(g.served).toBe(-1);
    for (let i = 0; i < CANDLES.count; i++) g.light();
    expect(g.events.filter(e => e.startsWith('candle:'))).toHaveLength(CANDLES.count);
    expect(g.phase).toBe('serve');
    g.serve(); run(g, TUNING.serve + 0.05);
    expect(g.phase).toBe('eat');
    run(g, TUNING.eat + 0.05);
    expect(g.phase).toBe('done'); expect(g.events).toContain('thanks');
  });

  it('serves the pancakes if Carl-Otto made them', () => {
    expect(fresh('pancakes').food).toBe('pancakes');
  });

  it('can be played start to finish with only the next-step key', () => {
    const g = fresh();
    for (let i = 0; i < 40 && g.phase !== 'done'; i++) { g.primary(); run(g, 0.6); }
    run(g, TUNING.eat);
    expect(g.phase).toBe('done');
  });

  it('points at the next stack, the candles, then the food', () => {
    const g = fresh();
    run(g, TUNING.hintAfter + 0.1); expect(g.hint).toBe('plate');
    const s = set(); run(s, TUNING.hintAfter + 0.1); expect(s.hint).toBe('candles');
  });
});
