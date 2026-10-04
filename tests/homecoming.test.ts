import { describe, expect, it } from 'vitest';
import { PAIRS, TUNING } from '../src/play/family/games/hemkomst';
import { HomecomingRun, THINGS, partnerOf, shoeHome } from '../src/play/family/homecoming-run';
import { PutAway } from '../src/play/family/put-away';

const run = (g: HomecomingRun, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60); };
const fresh = () => { const g = new HomecomingRun(); g.events = []; return g; };
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('Putting things away (shared by Godnatt and Hemkomst)', () => {
  const things = [{ id: 'a', start: [0, 0] as [number, number], home: [200, 0] as [number, number] }, { id: 'b', start: [30, 0] as [number, number], home: [0, 200] as [number, number] }];
  const tuning = { hop: 0.5, homeReach: 50, grab: 40, tap: 10 };

  it('picks up the nearest thing within reach, and nothing out of reach', () => {
    const p = new PutAway(things, tuning);
    expect(p.grab([100, 100])).toBeNull();
    expect(p.grab([22, 0])).toBe('b');
  });

  it('puts a thing home when let go near it, or when only tapped; elsewhere it goes back, and its home glows', () => {
    const p = new PutAway(things, tuning);
    p.grab([0, 0]); p.drag([190, 10]); expect(p.drop([190, 10])).toBe('home');
    p.grab([30, 0]); expect(p.drop([33, 2])).toBe('home');
    expect(p.step(0.6).sort()).toEqual(['a', 'b']);
    expect(p.done).toBe(true);
    const q = new PutAway(things, tuning);
    q.grab([0, 0]); q.drag([100, 100]); expect(q.drop([100, 100])).toBe('wrong');
    expect(q.glow?.id).toBe('a');
    q.step(0.6);
    expect(q.item('a').at).toEqual([0, 0]); expect(q.item('a').placed).toBe(false);
  });

  it('sends a thing home only once', () => {
    const p = new PutAway(things, tuning);
    expect(p.send('a')).toBe(true); expect(p.send('a')).toBe(false);
    expect(p.left.map(t => t.id)).toEqual(['b']);
  });
});

describe('Hemkomst', () => {
  it('has a place for every shoe on the bench, pairs side by side, grown-ups’ on the seat and Carl-Otto’s below', () => {
    for (const p of PAIRS) {
      const l = shoeHome(p.id, 'L'), r = shoeHome(p.id, 'R');
      expect(l[1]).toBe(r[1]); expect(l[0]).toBeLessThan(r[0]);
    }
    const seat = PAIRS.filter(p => p.size > 1).map(p => p.slot[1]), shelf = PAIRS.filter(p => p.size < 1).map(p => p.slot[1]);
    expect(Math.max(...seat)).toBeLessThan(Math.min(...shelf));
    // No two things start on top of each other, and none starts near its own place.
    for (const a of THINGS) {
      expect(dist(a.start, a.home)).toBeGreaterThan(TUNING.homeReach + TUNING.grab);
      for (const b of THINGS) if (a !== b) expect(dist(a.start, b.start)).toBeGreaterThan(20);
    }
    expect(partnerOf('boots-L')).toBe('boots-R'); expect(partnerOf('jacket')).toBeNull();
  });

  it('counts a pair once both shoes are in, and welcomes Carl-Otto home when everything is put away', () => {
    const g = fresh();
    g.send('boots-L'); run(g, TUNING.hop + 0.05);
    expect(g.pairs).toEqual([]);
    g.send('boots-R'); run(g, TUNING.hop + 0.05);
    expect(g.pairs).toEqual(['boots']); expect(g.events).toContain('pair:boots');
    for (const th of THINGS) g.send(th.id);
    run(g, TUNING.hop + 0.05);
    expect(g.events).toContain('home');
    expect(g.won).toBe(false);
    run(g, TUNING.done);
    expect(g.won).toBe(true); expect(g.events).toContain('won');
  });

  it('a shoe dragged onto the wrong pair’s place goes back to the floor', () => {
    const g = fresh(), shoe = THINGS.find(t => t.id === 'pappa-L')!;
    expect(g.grab(shoe.start)).toBe('pappa-L');
    const wrong = shoeHome('sandals', 'L');
    g.drag(wrong); g.drop(wrong);
    expect(g.events).toContain('wrong:pappa-L');
    run(g, TUNING.hop + 0.05);
    expect(g.things.find(t => t.id === 'pappa-L')!.placed).toBe(false);
  });

  it('a shoe let go on its partner’s spot still goes in (the pair’s place is one place)', () => {
    const g = fresh(), shoe = THINGS.find(t => t.id === 'mamma-L')!;
    g.grab(shoe.start); const spot = shoeHome('mamma', 'R'); g.drag(spot); g.drop(spot);
    run(g, TUNING.hop + 0.05);
    expect(g.things.find(t => t.id === 'mamma-L')!.placed).toBe(true);
  });

  it('can be done with only the next-step key, shoes first and a pair at a time', () => {
    const g = fresh();
    g.primary(); g.primary();
    expect(g.left[0].id).not.toBe('jacket');
    for (let i = 0; i < 20 && !g.won; i++) { g.primary(); run(g, 0.7); }
    expect(g.won).toBe(true);
  });

  it('points at the next thing once nothing has happened for a while', () => {
    const g = fresh();
    expect(g.hint).toBeNull();
    run(g, TUNING.hintAfter + 0.1);
    expect(g.hint).toBe(THINGS[0].id);
  });
});
