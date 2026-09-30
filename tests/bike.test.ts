import { describe, expect, it } from 'vitest';
import { BIKE_BOUNDS, BikeRun, RIDE_LENGTH } from '../src/play/family/bike-run';
import { RIDES } from '../src/play/family/rides';

function advance(g: BikeRun, seconds: number, x = 0, y = 0): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60, x, y);
}

function incoming(g: BikeRun, id = 0): void {
  g.apples.push({ id, x: g.x, y: g.y, height: 85, speed: 200, warning: 0, landed: 0, checked: false });
}

describe('Carl-Otto’s bike ride', () => {
  it('waits for start, pedals automatically and keeps the bike on the path', () => {
    const g = new BikeRun(); advance(g, 1);
    expect(g.distance).toBe(0); g.start(); advance(g, 1, 1, 1);
    expect(g.distance).toBeGreaterThan(70); expect(g.y).toBe(BIKE_BOUNDS.bottom);
    advance(g, 2, -1, -1); expect(g.x).toBe(BIKE_BOUNDS.left); expect(g.y).toBe(BIKE_BOUNDS.top);
  });

  it('warns before apples fall and stops all movement while paused', () => {
    const g = new BikeRun(() => 0.5); g.start(); advance(g, 2.5);
    expect(g.apples).toHaveLength(1); expect(g.apples[0].warning).toBeGreaterThan(0);
    expect(g.apples[0].height).toBe(285);
    g.pause(); const before = JSON.stringify(g); advance(g, 5, 1, 1);
    expect(JSON.stringify(g)).toBe(before);
    g.resume(); advance(g, 1); expect(g.apples[0].height).toBeLessThan(285);
  });

  it('loses only one heart per hit, provides recovery time, and ends after three hits', () => {
    const g = new BikeRun(); g.start(); incoming(g); incoming(g, 1); advance(g, 0.1);
    expect(g.hearts).toBe(2); expect(g.invulnerable).toBeGreaterThan(0);
    g.invulnerable = 0; incoming(g, 2); advance(g, 0.1); expect(g.hearts).toBe(1);
    g.invulnerable = 0; incoming(g, 3); advance(g, 0.1);
    expect(g.hearts).toBe(0); expect(g.mode).toBe('lost');
    const distance = g.distance; advance(g, 2); expect(g.distance).toBe(distance);
    g.start(); expect(g.hearts).toBe(3); expect(g.distance).toBe(0); expect(g.apples).toEqual([]);
  });

  it('avoids an apple by steering and counts it once when it lands', () => {
    const g = new BikeRun(); g.start(); incoming(g); g.x += 80; advance(g, 0.5);
    expect(g.hearts).toBe(3); expect(g.dodged).toBe(1);
    advance(g, 0.5); expect(g.dodged).toBe(1); expect(g.apples).toHaveLength(0);
  });

  it('finishes at preschool with a clear final stretch and supports a fresh replay', () => {
    const g = new BikeRun(() => 0.5); g.start(); g.distance = RIDE_LENGTH - 300;
    advance(g, 5); expect(g.mode).toBe('won'); expect(g.progress).toBe(1); expect(g.metresLeft).toBe(0);
    expect(g.apples).toEqual([]); g.start(); expect(g.mode).toBe('riding'); expect(g.elapsed).toBe(0);
  });
});

describe('ride files', () => {
  it('every ride in src/play/family/rides is well formed', () => {
    expect(RIDES.length).toBeGreaterThan(0);
    for (const r of RIDES) {
      expect(r.length, r.id).toBeGreaterThan(960);
      expect(r.speed, r.id).toBeGreaterThan(0);
      expect(r.apples.every[0], r.id).toBeLessThanOrEqual(r.apples.every[1]);
      expect(r.apples.aimed, r.id).toBeGreaterThanOrEqual(0); expect(r.apples.aimed, r.id).toBeLessThanOrEqual(1);
      expect(r.apples.clearEnd, r.id).toBeLessThan(r.length);
      expect(r.scenery.trees.until, r.id).toBeLessThan(r.length);
      expect(r.title.sv && r.title.en, r.id).toBeTruthy();
    }
  });

  it('a ride takes its length and pace from its file', () => {
    const short = { ...RIDES[0], id: 'short', length: 1200, speed: 200 };
    const g = new BikeRun(() => 0.5, short); g.start(); advance(g, 7);
    expect(g.mode).toBe('won');
  });
});
