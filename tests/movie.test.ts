import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUES } from '../src/play/audio/cues';
import { DINING, ITEMS, PLACES, REACH, ROOM, SOFA_REACH, SOFA_X, START_X, SURPRISES, TUNING } from '../src/play/family/games/filmkvall';
import { MovieRun } from '../src/play/family/movie-run';
import { seeded } from '../src/play/family/hide-run';

const run = (g: MovieRun, seconds: number, dir = 0) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60, dir); };
const gathering = (seed = 1) => { const g = new MovieRun(seeded(seed)); g.start(); g.events = []; return g; };
const layout = (g: MovieRun) => g.spots.map(s => s.item?.id ?? s.surprise).join(',');
/** Looks where a thing is hidden, and waits until it is in his arms. */
const fetch = (g: MovieRun, id: string) => { const s = g.spots.find(s => s.item?.id === id)!; g.x = s.x; g.look(); run(g, TUNING.popOut + 0.05); return s; };

describe('Filmkväll', () => {
  it('hides every thing in a different place it fits, with surprises in the rest, shuffled by the seed', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = gathering(seed);
      expect(g.spots).toHaveLength(PLACES.length);
      const hidden = g.spots.filter(s => s.item);
      expect(new Set(hidden.map(s => s.item!.id)).size).toBe(ITEMS.length);
      for (const s of hidden) expect(s.item!.fits).toContain(s.kind);
      for (const s of g.spots.filter(s => !s.item)) {
        if (s.kind === 'doorway') expect(s.surprise).toBe(DINING.kind);
        else expect(SURPRISES.map(x => x.kind)).toContain(s.surprise);
      }
    }
    expect(layout(gathering(1))).toBe(layout(gathering(1)));
    expect(new Set([1, 2, 3, 4, 5].map(s => layout(gathering(s)))).size).toBeGreaterThan(1);
  });

  it('begins beside the sofa with nothing found', () => {
    const g = gathering(2);
    expect(g.mode).toBe('gathering');
    expect(g.x).toBe(START_X);
    expect(Math.abs(g.x - SOFA_X)).toBeLessThanOrEqual(SOFA_REACH);
    expect(g.left).toBe(ITEMS.length);
    expect(g.near).toBeNull();
  });

  it('looks only within reach: a thing pops up and goes into his arms, an empty place shows its surprise', () => {
    const g = gathering(3);
    const spot = g.spots.find(s => s.item)!, empty = g.spots.find(s => !s.item)!;
    g.x = spot.x + REACH + 30;
    expect(g.near === spot).toBe(false);
    g.x = spot.x + REACH - 5;
    expect(g.look()).toBe(spot);
    expect(g.events).toContain(`found:${spot.item!.id}`);
    expect(g.carrying.map(c => c.item.id)).toEqual([spot.item!.id]);
    expect(g.arms).toHaveLength(0); // still popping up
    run(g, TUNING.popOut + 0.05);
    expect(g.arms).toHaveLength(1);
    expect(g.look()).toBeNull(); // already opened, and nothing else in reach
    g.x = empty.x;
    expect(g.look()?.surprise).toBe(empty.surprise);
    expect(g.events).toContain(`surprise:${empty.surprise}`);
  });

  it('carries several things at once and puts them all on the sofa', () => {
    const g = gathering(4);
    const [a, b] = ITEMS;
    fetch(g, a.id); fetch(g, b.id);
    expect(g.arms.map(c => c.item.id).sort()).toEqual([a.id, b.id].sort());
    g.x = SOFA_X + SOFA_REACH + 40;
    run(g, 0.1);
    expect(g.placed).toHaveLength(0);
    run(g, 1, -1);
    expect(g.carrying).toHaveLength(0);
    expect(g.placed.map(p => p.item.id).sort()).toEqual([a.id, b.id].sort());
    expect(g.events.filter(e => e.startsWith('placed:'))).toHaveLength(2);
    expect(g.left).toBe(ITEMS.length - 2);
  });

  it('a thing still popping up stays out of the sofa until it is in his arms', () => {
    const g = gathering(5);
    const s = g.spots.find(s => s.item)!;
    g.x = s.x; g.look(); g.x = SOFA_X;
    run(g, TUNING.popOut / 2);
    expect(g.placed).toHaveLength(0);
    run(g, TUNING.popOut);
    expect(g.placed).toHaveLength(1);
  });

  it('once everything is on the sofa, the TV comes on and the film starts; there is no way to lose', () => {
    const g = gathering(6);
    run(g, 120); // dawdling for two minutes is fine
    expect(g.mode).toBe('gathering');
    for (const item of ITEMS) fetch(g, item.id);
    expect(g.left).toBe(0);
    g.x = SOFA_X; run(g, 1 / 60);
    expect(g.mode).toBe('watching');
    expect(g.events).toContain('watch');
    const took = g.elapsed;
    expect(g.tvOn).toBe(false);
    run(g, TUNING.tvOn + 0.05);
    expect(g.tvOn).toBe(true);
    expect(g.events.filter(e => e === 'tv')).toHaveLength(1);
    run(g, TUNING.showtime);
    expect(g.mode).toBe('won');
    expect(g.events).toContain('won');
    expect(g.elapsed).toBe(took);
    // A new round hides everything again.
    g.start();
    expect(g.mode).toBe('gathering');
    expect(g.placed).toHaveLength(0);
    expect(g.spots.every(s => !s.opened)).toBe(true);
  });

  it('sparkles at the nearest hidden thing after a while, and at the sofa once everything is found', () => {
    const g = gathering(7);
    expect(g.hint).toBeNull();
    run(g, TUNING.hintAfter + 0.5);
    const nearest = Math.min(...g.spots.filter(s => s.item && !s.opened).map(s => Math.abs(s.x - g.x)));
    expect(Math.abs(g.hint! - g.x)).toBe(nearest);
    fetch(g, g.spots.find(s => s.x === g.hint)!.item!.id);
    expect(g.hint).toBeNull();
    for (const s of g.spots.filter(s => s.item && !s.opened)) fetch(g, s.item!.id);
    g.x = ROOM - 60; g.idle = 0;
    run(g, TUNING.hintAfter + 0.5);
    expect(g.hint).toBe(SOFA_X);
  });

  it('walks with the keys, or to a tapped place, within the room', () => {
    const g = gathering(1);
    run(g, 20, -1);
    expect(g.x).toBe(60);
    run(g, 30, 1);
    expect(g.x).toBe(ROOM - 60);
    const spot = g.spots[2];
    g.walkTo(spot.x);
    run(g, 15);
    expect(Math.abs(g.x - spot.x)).toBeLessThan(5);
    expect(g.near).toBe(spot);
    g.walkTo(-500); run(g, 20);
    expect(g.x).toBeLessThan(64);
  });

  it('pauses and resumes', () => {
    const g = gathering(1); g.pause();
    expect(g.mode).toBe('paused');
    run(g, 2, 1);
    expect(g.elapsed).toBe(0);
    expect(g.x).toBe(START_X);
    expect(g.look()).toBeNull();
    g.resume();
    expect(g.mode).toBe('gathering');
  });

  it('the data file is complete in both languages and the places are spaced apart', () => {
    expect(ITEMS).toHaveLength(5);
    expect(SURPRISES.length).toBeGreaterThanOrEqual(PLACES.length - ITEMS.length - 1);
    for (const w of [...ITEMS.flatMap(i => [i.name, i.short, i.found]), ...SURPRISES.map(s => s.line), DINING.line]) {
      expect(w.sv.trim()).not.toBe(''); expect(w.en.trim()).not.toBe('');
    }
    const xs = PLACES.map(p => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(REACH * 2);
    for (const x of xs) expect(Math.abs(x - SOFA_X)).toBeGreaterThan(SOFA_REACH + REACH);
    expect(PLACES.some(p => p.kind === 'doorway')).toBe(true);
  });

  it('has a sound for everything the scene plays', () => {
    const scene = readFileSync(join(__dirname, '..', 'src', 'play', 'family', 'movie-scene.ts'), 'utf8');
    const played = [...scene.matchAll(/sfx\.play\('([a-z]+)'\)/g)].map(m => m[1]);
    const surprises = /SURPRISE_SOUND[^=]*=\s*\{([^}]*)\}/.exec(scene)![1];
    played.push(...[...surprises.matchAll(/'([a-z]+)'/g)].map(m => m[1]));
    expect(played.length).toBeGreaterThan(8);
    for (const name of played) expect(CUES[name], name).toBeDefined();
  });
});
