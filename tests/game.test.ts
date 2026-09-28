import { describe, expect, it } from 'vitest';
import { ObstacleGrid, distance, iso, moveWithCollision, normalize, pointInShape, shape, uniso } from '../src/geometry';
import { computeScore, Game, hasClearStrike } from '../src/game';
import { fromLatLon } from '../src/map';
import { BOUNDS, HOME, HOME_CREW, HOME_GROUP, MARCUS_A, OBSTACLES, PACKAGE, PROPS, ROUTES, SPAWNS, START } from '../src/world';

const marcusHouse = PROPS.find(p => p.role === 'marcus')!;

describe('map', () => {
  it('round trips world and screen coordinates', () => {
    for (const point of [{ x: 0, y: 0 }, START, HOME]) {
      const result = uniso(...Object.values(iso(point.x, point.y)) as [number, number]);
      expect(result.x).toBeCloseTo(point.x);
      expect(result.y).toBeCloseTo(point.y);
    }
  });

  it('puts the kiosk, Marcus A and Home on their real addresses', () => {
    expect(PROPS.find(p => p.role === 'home')?.footprint?.address).toBe('Ringstorpsvägen 55B');
    expect(marcusHouse.footprint?.address).toBe('Långåkersgatan 4');
    expect(PROPS.find(p => p.role === 'kiosk')?.footprint?.use).toBe('kiosk');
    expect(distance(fromLatLon(56.0647756, 12.6983342), HOME)).toBeLessThan(6);
    expect(distance(fromLatLon(56.0643333, 12.6942909), MARCUS_A)).toBeLessThan(6);
  });

  it('keeps every spawn, mission point and waypoint clear of solid props', () => {
    const spots = [START, PACKAGE, MARCUS_A, HOME, ...SPAWNS.map(s => s.pos), ...HOME_CREW.map(s => s.pos), ...ROUTES.direct, ...ROUTES.marcus];
    for (const spot of spots) expect(OBSTACLES.hits(spot, 0.5)).toBe(false);
  });

  it('stops movement at house walls and world edges', () => {
    const toHouse = normalize({ x: marcusHouse.x - MARCUS_A.x, y: marcusHouse.y - MARCUS_A.y });
    let pos = { ...MARCUS_A };
    for (let i = 0; i < 120; i++) pos = moveWithCollision(pos, { x: toHouse.x * 0.1, y: toHouse.y * 0.1 }, 0.35, OBSTACLES, BOUNDS);
    expect(pointInShape(pos, shape(marcusHouse.footprint!.pts), 0.3)).toBe(false);
    expect(distance(pos, marcusHouse)).toBeGreaterThan(1);
    const open = new ObstacleGrid([]);
    expect(moveWithCollision({ x: BOUNDS.x + 0.4, y: BOUNDS.y + 5 }, { x: -4, y: 0 }, 0.35, open, BOUNDS).x).toBe(BOUNDS.x + 0.35);
  });

  it('prevents strikes through a house', () => {
    const across = { x: Math.cos(marcusHouse.angle), y: Math.sin(marcusHouse.angle) };
    const reach = marcusHouse.w / 2 + 1;
    const a = { x: marcusHouse.x - across.x * reach, y: marcusHouse.y - across.y * reach };
    const b = { x: marcusHouse.x + across.x * reach, y: marcusHouse.y + across.y * reach };
    expect(hasClearStrike(a, b, across, 99)).toBe(false);
    expect(hasClearStrike(START, { x: START.x + 1, y: START.y }, { x: 1, y: 0 }, 1.6)).toBe(true);
  });
});

describe('mission', () => {
  it('scores time, health and knockouts, and charges for continues', () => {
    expect(computeScore(120, 5, 10, 0)).toBeGreaterThan(computeScore(240, 2, 4, 0));
    expect(computeScore(200, 4, 7, 0) - computeScore(200, 4, 7, 1)).toBe(400);
  });

  it('picks up the package, patches up at Marcus A, then beats the home crew to deliver', () => {
    const game = new Game();
    game.start('marcus');
    game.enemies.forEach(e => e.state = 'ko');
    expect(game.objective).toContain('Pick up the package');
    game.player.pos = { ...HOME };
    game.update(0.016);
    expect(game.crewSprung).toBe(false);
    game.player.pos = { ...PACKAGE };
    game.update(0.016);
    expect(game.hasPackage).toBe(true);
    expect(game.objective).toContain('Marcus A');
    game.player.hp = 2;
    game.player.pos = { ...MARCUS_A };
    game.update(0.016);
    expect(game.player.hp).toBe(5);
    expect(game.checkpoint).not.toBeNull();
    game.player.pos = { ...HOME };
    game.update(0.016);
    expect(game.crewSprung).toBe(true);
    expect(game.mode).toBe('playing');
    expect(game.objective).toContain('Shake off');
    game.enemies.filter(e => e.group === HOME_GROUP).forEach(e => e.state = 'ko');
    game.update(0.016);
    expect(game.mode).toBe('victory');
    expect(game.score).toBeGreaterThan(0);
  });

  it('guides along the chosen route and lets the courier switch', () => {
    const game = new Game();
    game.start('direct');
    game.player.pos = { ...PACKAGE };
    game.update(0.016);
    expect(ROUTES.direct).toContainEqual(game.target);
    expect(game.objective).toContain('Take the package home');
    game.toggleRoute();
    expect(game.route).toBe('marcus');
    expect(ROUTES.marcus).toContainEqual(game.target);
    expect(game.objective).toContain('Marcus A');
  });

  it('continues from Marcus A after a knockout', () => {
    const game = new Game();
    game.start('marcus');
    game.enemies.forEach(e => e.state = 'ko');
    game.player.pos = { ...PACKAGE };
    game.update(0.016);
    game.player.pos = { ...MARCUS_A };
    game.update(0.016);
    game.mode = 'defeat';
    game.player.hp = 0;
    game.continueFromCheckpoint();
    expect(game.mode).toBe('playing');
    expect(game.player.hp).toBe(5);
    expect(distance(game.player.pos, MARCUS_A)).toBeLessThan(0.01);
    expect(game.continues).toBe(1);
  });

  it('applies enemy damage once during invulnerability and never during a dodge', () => {
    const game = new Game();
    game.start();
    game.enemies.forEach(e => e.state = 'ko');
    const enemy = game.enemies[0];
    enemy.state = 'windup'; enemy.pos = { x: START.x + 1, y: START.y }; enemy.facing = { x: -1, y: 0 }; enemy.timer = 0.01;
    game.update(0.02);
    expect(game.player.hp).toBe(4);
    enemy.state = 'windup'; enemy.timer = 0.01;
    game.update(0.02);
    expect(game.player.hp).toBe(4);
    game.player.invulnerable = 0;
    game.queueDodge();
    enemy.state = 'windup'; enemy.timer = 0.01;
    game.update(0.02);
    expect(game.player.hp).toBe(4);
  });

  it('lands timed punches and knocks out a nearby crew member', () => {
    const game = new Game();
    game.start();
    game.enemies.forEach(e => e.state = 'ko');
    const enemy = game.enemies[0];
    const spot = { x: START.x + 1, y: START.y };
    enemy.state = 'idle'; enemy.pos = { ...spot }; enemy.home = { ...spot };
    game.player.facing = { x: 1, y: 0 };
    game.queueAttack();
    game.update(0.016);
    for (let i = 0; i < 3; i++) game.update(0.05);
    expect(enemy.hp).toBe(1);
    for (let i = 0; i < 8; i++) game.update(0.05);
    enemy.pos = { ...spot };
    game.player.pos = { ...START };
    game.queueAttack();
    game.update(0.016);
    for (let i = 0; i < 3; i++) game.update(0.05);
    expect(enemy.state).toBe('ko');
    expect(game.koCount).toBe(1);
  });
});
