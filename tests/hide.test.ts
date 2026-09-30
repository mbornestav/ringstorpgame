import { describe, expect, it } from 'vitest';
import { FRIENDS, PLACES, REACH, SURPRISES, TUNING, YARD } from '../src/play/family/games/kurragomma';
import { HideRun, seeded } from '../src/play/family/hide-run';

const run = (g: HideRun, seconds: number, dir = 0) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60, dir); };
const seeking = (seed = 1) => { const g = new HideRun(seeded(seed)); g.start(); g.skipCount(); g.events = []; return g; };
const layout = (g: HideRun) => g.spots.map(s => s.friend?.id ?? s.surprise).join(',');

describe('Kurragömma', () => {
  it('counts to ten facing the wall, then sets off', () => {
    const g = new HideRun(seeded(1)); g.start();
    expect(g.mode).toBe('counting');
    run(g, TUNING.countStep * 5 + 0.01);
    expect(g.count).toBe(5);
    expect(g.events.filter(e => e === 'count')).toHaveLength(5);
    run(g, TUNING.countStep * 5);
    expect(g.mode).toBe('seeking');
    expect(g.events).toContain('go');
  });

  it('hides every friend in a different place, with surprises in the rest, shuffled by the seed', () => {
    const g = seeking(1);
    expect(g.spots).toHaveLength(PLACES.length);
    expect(new Set(g.spots.filter(s => s.friend).map(s => s.friend!.id)).size).toBe(FRIENDS.length);
    expect(g.spots.filter(s => s.surprise)).toHaveLength(PLACES.length - FRIENDS.length);
    expect(layout(seeking(1))).toBe(layout(seeking(1)));
    expect(new Set([1, 2, 3, 4, 5].map(s => layout(seeking(s)))).size).toBeGreaterThan(1);
    // Starting again deals again.
    const before = layout(g); let differs = false;
    for (let i = 0; i < 5 && !differs; i++) { g.start(); differs = layout(g) !== before; }
    expect(differs).toBe(true);
  });

  it('looks only within reach: a friend is found, an empty place shows its surprise', () => {
    const g = seeking(3);
    const friend = g.spots.find(s => s.friend)!, empty = g.spots.find(s => s.surprise)!;
    g.x = friend.x + REACH + 60;
    if (!g.near || g.near === friend) expect(g.look()?.friend).not.toBe(friend.friend);
    g.x = friend.x + REACH - 5;
    const hit = g.look();
    expect(hit).toBe(friend);
    expect(g.found.map(f => f.id)).toEqual([friend.friend!.id]);
    expect(g.events).toContain(`found:${friend.friend!.id}`);
    expect(g.look() === friend).toBe(false); // already opened
    g.x = empty.x;
    expect(g.look()?.surprise).toBe(empty.surprise);
    expect(g.events).toContain(`surprise:${empty.surprise}`);
  });

  it('walks with the keys, or to a tapped place, within the yard', () => {
    const g = seeking(1);
    run(g, 20, -1);
    expect(g.x).toBe(60);
    run(g, 30, 1);
    expect(g.x).toBe(YARD - 60);
    const spot = g.spots[3];
    g.walkTo(spot);
    run(g, 15);
    expect(Math.abs(g.x - spot.x)).toBeLessThan(5);
    expect(g.near).toBe(spot);
  });

  it('friends nearby giggle; far away they do not', () => {
    const g = seeking(2);
    const friend = g.spots.find(s => s.friend)!;
    g.x = friend.x;
    run(g, TUNING.giggle[1] + 8);
    expect(g.events).toContain('giggle');
    const far = seeking(2);
    const target = far.spots.find(s => s.friend)!;
    far.x = target.x > YARD / 2 ? 60 : YARD - 60;
    for (const s of far.spots) if (s.friend && Math.abs(s.x - far.x) <= TUNING.earshot) s.friend = null;
    run(far, TUNING.giggle[1] + 8);
    expect(far.events).not.toContain('giggle');
  });

  it('points out the nearest hidden friend when nothing has been found for a while', () => {
    const g = seeking(4);
    expect(g.hint).toBeNull();
    run(g, TUNING.hintAfter + 0.5);
    const hinted = g.hint!;
    expect(hinted.friend).not.toBeNull();
    const nearest = Math.min(...g.spots.filter(s => s.friend && !s.opened).map(s => Math.abs(s.x - g.x)));
    expect(Math.abs(hinted.x - g.x)).toBe(nearest);
    g.x = hinted.x; g.look();
    expect(g.hint).toBeNull();
  });

  it('ends when everyone is found and has run to the door; there is no way to lose', () => {
    const g = seeking(5);
    run(g, 120); // dawdling for two minutes is fine
    expect(g.mode).toBe('seeking');
    for (const s of g.spots.filter(s => s.friend)) { g.x = s.x; g.look(); }
    expect(g.left).toBe(0);
    run(g, 20);
    expect(g.mode).toBe('won');
    expect(g.events).toContain('won');
    expect(g.runners.every(r => r.home)).toBe(true);
  });

  it('pauses and resumes', () => {
    const g = seeking(1); g.pause();
    expect(g.mode).toBe('paused');
    run(g, 2, 1);
    expect(g.elapsed).toBe(0);
    g.resume();
    expect(g.mode).toBe('seeking');
  });

  it('the data file is complete in both languages', () => {
    expect(FRIENDS).toHaveLength(5);
    expect(PLACES).toHaveLength(9);
    expect(SURPRISES.length).toBeGreaterThanOrEqual(PLACES.length - FRIENDS.length);
    for (const w of [...FRIENDS.map(f => f.cheer), ...PLACES.map(p => p.found), ...SURPRISES.map(s => s.line)]) {
      expect(w.sv.trim()).not.toBe(''); expect(w.en.trim()).not.toBe('');
    }
    const xs = PLACES.map(p => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(REACH * 2);
    expect(new Set(FRIENDS.map(f => f.id)).size).toBe(5);
  });
});
