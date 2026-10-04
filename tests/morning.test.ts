import { describe, expect, it } from 'vitest';
import { BULBS, TEDDY_START, TUNING } from '../src/play/family/games/godmorgon';
import { seeded } from '../src/play/family/hide-run';
import { MorningRun, NOSE } from '../src/play/family/morning-run';

const run = (g: MorningRun, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60); };
const fresh = () => { const g = new MorningRun(seeded(1)); g.events = []; return g; };
const awake = () => { const g = fresh(); g.openCurtains(); for (let i = 0; i < TUNING.tickles; i++) g.tickle(); g.sendTeddy(); run(g, TUNING.hop + 0.05); g.events = []; return g; };
const bouncing = () => { const g = awake(); run(g, TUNING.toBounce + 0.05); g.events = []; return g; };

describe('God morgon: waking Mamma and Pappa', () => {
  it('takes the curtains, three tickles and Nallen, in any order', () => {
    const g = fresh();
    g.sendTeddy(); run(g, TUNING.hop + 0.05);
    expect(g.woke).toEqual(['teddy']);
    g.tickle(); g.tickle(); expect(g.woke).toEqual(['teddy']);
    g.tickle(); expect(g.woke).toEqual(['teddy', 'tickle']);
    expect(g.phase).toBe('wake');
    g.openCurtains(); g.openCurtains();
    expect(g.woke).toEqual(['teddy', 'tickle', 'curtains']);
    expect(g.phase).toBe('awake'); expect(g.events).toContain('awake');
  });

  it('Nallen dragged onto Mamma’s face goes on her nose; let go elsewhere, back to the armchair', () => {
    const g = fresh();
    expect(g.grab(TEDDY_START)).toBe(true);
    g.drag([500, 200]); g.drop([500, 200]);
    expect(g.events).toContain('teddy:back');
    run(g, TUNING.hop + 0.05);
    expect(g.teddy.at).toEqual(TEDDY_START); expect(g.teddy.onNose).toBe(false);
    g.grab(TEDDY_START); g.drag(NOSE); g.drop([NOSE[0] + 20, NOSE[1]]);
    run(g, TUNING.hop + 0.05);
    expect(g.teddy.onNose).toBe(true); expect(g.woke).toContain('teddy');
  });

  it('a tap on Nallen is enough, and nothing is picked up away from him', () => {
    const g = fresh();
    expect(g.grab([100, 100])).toBe(false);
    g.grab(TEDDY_START); g.drop([TEDDY_START[0] + 3, TEDDY_START[1]]);
    run(g, TUNING.hop + 0.05);
    expect(g.teddy.onNose).toBe(true);
  });

  it('they sit up, and then the bouncing begins', () => {
    const g = awake();
    expect(g.phase).toBe('awake');
    run(g, TUNING.toBounce + 0.05);
    expect(g.phase).toBe('bounce'); expect(g.events).toContain('bounce');
  });
});

describe('God morgon: bouncing on the bed', () => {
  it('hops a little on its own, without lighting anything', () => {
    const g = bouncing();
    run(g, 3);
    expect(g.bulbs).toBe(0);
    expect(g.events.filter(e => e === 'land').length).toBeGreaterThan(3);
  });

  it('every tap is a bounce (in the air it waits for the landing), and each bounce lights a bulb, a little higher each time', () => {
    const g = bouncing(), heights: number[] = [];
    for (let i = 0; i < BULBS; i++) {
      g.jump();
      let top = 0;
      for (let f = 0; f < 150; f++) { g.update(1 / 60); if (g.bulbs === i + 1) { top = Math.max(top, g.z); if (g.z === 0) break; } }
      heights.push(top);
    }
    expect(g.bulbs).toBe(BULBS);
    expect(heights[BULBS - 1]).toBeGreaterThan(heights[0]);
  });

  it('a tap in the air is used on landing', () => {
    const g = bouncing();
    g.jump();
    for (let f = 0; f < 120 && g.bulbs < 1; f++) g.update(1 / 60);
    expect(g.bulbs).toBe(1);
    run(g, 0.1);
    expect(g.z).toBeGreaterThan(0);
    g.jump();
    expect(g.bulbs).toBe(1);
    run(g, 1.2);
    expect(g.bulbs).toBe(2);
  });

  it('after the last bulb, a hug, then it is time for preschool', () => {
    const g = bouncing();
    for (let i = 0; i < 40 && g.phase === 'bounce'; i++) { g.jump(); run(g, 0.8); }
    expect(['hug', 'ready']).toContain(g.phase);
    run(g, TUNING.hug + 0.1);
    expect(g.phase).toBe('ready'); expect(g.events).toContain('hug'); expect(g.events).toContain('ready');
    g.jump(); expect(g.bulbs).toBe(BULBS);
  });

  it('can be played start to finish with only the next-step key', () => {
    const g = fresh();
    for (let i = 0; i < 80 && g.phase !== 'ready'; i++) { g.primary(); run(g, 0.7); }
    expect(g.phase).toBe('ready');
  });

  it('points at the next way to wake them, then at the bed', () => {
    const g = fresh();
    run(g, TUNING.hintAfter + 0.1); expect(g.hint).toBe('curtains');
    g.openCurtains(); run(g, TUNING.hintAfter + 0.1); expect(g.hint).toBe('foot');
    const b = bouncing(); run(b, TUNING.hintAfter + 0.1); expect(b.hint).toBe('bed');
  });
});
