import { describe, expect, it } from 'vitest';
import { ACTIVITIES, BIG_SOFA, MAP, ROOMS, activitiesIn, type ActivityId } from '../src/play/family/games/hemma';
import { MAX_DRAWINGS, addDrawing, eveningDone, hangDrawing, hungIn, markDone, morningDone, nextUp, readProgress, removeDrawing } from '../src/play/family/house';

/** A Storage stand-in. */
const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };
const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };

describe('Hemma: the house', () => {
  it('has every room on the map, each with something to do, and every activity in a room', () => {
    const inside = ([x, y, w, h]: number[]) => x >= MAP.x0 && y >= MAP.y0 && x + w <= MAP.x1 && y + h <= MAP.y1;
    for (const room of ROOMS) {
      expect(room.floor.length).toBeGreaterThan(0);
      for (const r of room.floor) expect(inside(r), room.id).toBe(true);
      expect(activitiesIn(room.id).length, room.id).toBeGreaterThan(0);
    }
    expect(new Set(ROOMS.map(r => r.id)).size).toBe(ROOMS.length);
    expect(new Set(ACTIVITIES.map(a => a.id)).size).toBe(ACTIVITIES.length);
    for (const a of ACTIVITIES) expect(ROOMS.some(r => r.id === a.room)).toBe(true);
    // Rooms do not overlap one another (a tap selects exactly one), and the big sofa stands inside the living room.
    const tap = ROOMS.map(r => r.floor[0]);
    for (let i = 0; i < tap.length; i++) for (let j = i + 1; j < tap.length; j++) {
      const [a, b] = [tap[i], tap[j]];
      expect(a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3], `${ROOMS[i].id} / ${ROOMS[j].id}`).toBe(false);
    }
    const living = ROOMS.find(r => r.id === 'living')!.floor[0];
    expect(BIG_SOFA[0] > living[0] && BIG_SOFA[0] + BIG_SOFA[2] < living[0] + living[2]).toBe(true);
  });

  it('plays the evening in order, with the big bedroom the next morning', () => {
    expect(ACTIVITIES.filter(a => a.morning).map(a => a.room)).toEqual(['big']);
    const evening = ACTIVITIES.map(a => a.id);
    expect(evening.indexOf('hemkomst')).toBeLessThan(evening.indexOf('filmkvall'));
    expect(evening.indexOf('filmkvall')).toBeLessThan(evening.indexOf('godnatt'));
    expect(evening.indexOf('godnatt')).toBeLessThan(evening.indexOf('godmorgon'));
  });

  it('suggests the next playable activity, and knows when the evening is done', () => {
    const playable = ACTIVITIES.filter(a => a.scene);
    expect(nextUp([])).toBe(playable[0]);
    const all = playable.map(a => a.id);
    expect(nextUp(all)).toBeNull();
    expect(eveningDone([])).toBe(false);
    expect(eveningDone(playable.filter(a => !a.morning).map(a => a.id))).toBe(true);
    expect(morningDone([])).toBe(false);
  });
});

describe('Hemma: what is remembered', () => {
  it('starts empty, and remembers what is done, once each', () => {
    const store = memory();
    expect(readProgress(store)).toEqual({ done: [], drawings: [], hung: { living: 0, hall: 0, bedroom: 0 } });
    markDone('filmkvall', store); markDone('filmkvall', store); markDone('pyssel', store);
    expect(readProgress(store).done).toEqual(['filmkvall', 'pyssel']);
  });

  it('keeps the newest pictures first, up to the limit', () => {
    const store = memory();
    for (let i = 0; i < MAX_DRAWINGS + 3; i++) addDrawing(`data:image/png;base64,${i}`, store);
    const { drawings } = readProgress(store);
    expect(drawings).toHaveLength(MAX_DRAWINGS);
    expect(drawings[0]).toBe(`data:image/png;base64,${MAX_DRAWINGS + 2}`);
  });

  it('shrugs off storage that refuses, junk in the key and activities it does not know', () => {
    expect(readProgress(broken)).toEqual({ done: [], drawings: [], hung: { living: 0, hall: 0, bedroom: 0 } });
    expect(markDone('filmkvall', broken).done).toEqual(['filmkvall']);
    expect(readProgress(null)).toEqual({ done: [], drawings: [], hung: { living: 0, hall: 0, bedroom: 0 } });
    const store = memory();
    store.setItem('carl-otto-hemma', '{not json');
    expect(readProgress(store)).toEqual({ done: [], drawings: [], hung: { living: 0, hall: 0, bedroom: 0 } });
    store.setItem('carl-otto-hemma', JSON.stringify({ done: ['filmkvall', 'skateboard', 7], drawings: ['a', 3] }));
    expect(readProgress(store)).toEqual({ done: ['filmkvall' as ActivityId], drawings: ['a'], hung: { living: 0, hall: 0, bedroom: 0 } });
  });

  it('hangs a chosen picture in each room; a new picture goes up in the living room, the others keep theirs', () => {
    const store = memory();
    for (const u of ['a', 'b', 'c']) addDrawing(u, store);
    // Newest first: c, b, a.
    hangDrawing(2, 'bedroom', store); hangDrawing(1, 'hall', store);
    let p = readProgress(store);
    expect([hungIn(p, 'living'), hungIn(p, 'hall'), hungIn(p, 'bedroom')]).toEqual(['c', 'b', 'a']);
    p = addDrawing('d', store);
    expect([hungIn(p, 'living'), hungIn(p, 'hall'), hungIn(p, 'bedroom')]).toEqual(['d', 'b', 'a']);
    // Throwing a hanging picture away hangs the newest there instead.
    p = removeDrawing(3, store);
    expect(p.drawings).toEqual(['d', 'c', 'b']);
    expect([hungIn(p, 'living'), hungIn(p, 'hall'), hungIn(p, 'bedroom')]).toEqual(['d', 'b', 'd']);
  });
});

