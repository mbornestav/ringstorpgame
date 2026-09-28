import { describe, expect, it } from 'vitest';
import { iso, moveWithCollision, uniso } from '../src/geometry';
import { computeScore, Game, hasClearStrike } from '../src/game';
import { BOUNDS, OBSTACLES, PARCELS } from '../src/world';

describe('isometric world', () => {
  it('round trips world and screen coordinates', () => {
    for (const point of [{ x: 0, y: 0 }, { x: 28.5, y: 11.5 }, { x: 112, y: 12 }]) {
      const result = uniso(...Object.values(iso(point.x, point.y)) as [number, number]);
      expect(result.x).toBeCloseTo(point.x);
      expect(result.y).toBeCloseTo(point.y);
    }
  });

  it('stops movement at car cover and world edges', () => {
    const car = OBSTACLES.find(r => r.x === 8 && r.y === 9)!;
    const moved = moveWithCollision({ x: car.x - 0.5, y: car.y + 0.5 }, { x: 1, y: 0 }, 0.35, OBSTACLES, BOUNDS);
    expect(moved.x).toBe(car.x - 0.5);
    expect(moveWithCollision({ x: 0.4, y: 12 }, { x: -4, y: 0 }, 0.35, OBSTACLES, BOUNDS).x).toBe(0.35);
  });

  it('prevents strikes through solid cover', () => {
    expect(hasClearStrike({ x: 7.3, y: 9.55 }, { x: 10.7, y: 9.55 }, { x: 1, y: 0 }, 4)).toBe(false);
    expect(hasClearStrike({ x: 7, y: 12 }, { x: 8, y: 12 }, { x: 1, y: 0 }, 1.6)).toBe(true);
  });
});

describe('mission', () => {
  it('scores time, health, knockouts and recovered parcels', () => {
    expect(computeScore(120, 5, 10, 3)).toBeGreaterThan(computeScore(240, 2, 4, 3));
    expect(computeScore(200, 4, 7, 3) - computeScore(200, 4, 7, 2)).toBe(500);
  });

  it('requires a crew defeat before collecting each parcel, then opens the final fight', () => {
    const game = new Game();
    game.start();
    game.player.pos = { x: PARCELS[0].x, y: PARCELS[0].y };
    game.update(0.016);
    expect(game.recoveredCount).toBe(0);
    for (let index = 0; index < 3; index++) {
      game.enemies.filter(e => e.group === index).forEach(e => e.state = 'ko');
      game.player.pos = { x: PARCELS[index].x, y: PARCELS[index].y };
      game.update(0.016);
      expect(game.recoveredCount).toBe(index + 1);
    }
    expect(game.bossSpawned).toBe(true);
    expect(game.objective).toContain('final crew');
    game.enemies.filter(e => e.group === 3).forEach(e => e.state = 'ko');
    game.player.pos = { x: 112, y: 12 };
    game.update(0.016);
    expect(game.mode).toBe('victory');
    expect(game.score).toBeGreaterThan(0);
  });

  it('applies enemy damage once during invulnerability and never during a dodge', () => {
    const game = new Game();
    game.start();
    game.enemies.forEach(e => e.state = 'ko');
    const enemy = game.enemies[0];
    enemy.state = 'windup'; enemy.pos = { x: 4.5, y: 12 }; enemy.facing = { x: -1, y: 0 }; enemy.timer = 0.01;
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
    enemy.state = 'idle'; enemy.pos = { x: 5, y: 12 }; enemy.home = { ...enemy.pos };
    game.player.pos = { x: 4, y: 12 };
    game.player.facing = { x: 1, y: 0 };
    game.queueAttack();
    game.update(0.016);
    for (let i = 0; i < 3; i++) game.update(0.05);
    expect(enemy.hp).toBe(1);
    for (let i = 0; i < 8; i++) game.update(0.05);
    enemy.pos = { x: 5, y: 12 };
    game.queueAttack();
    game.update(0.016);
    for (let i = 0; i < 3; i++) game.update(0.05);
    expect(enemy.state).toBe('ko');
    expect(game.koCount).toBe(1);
  });
});
