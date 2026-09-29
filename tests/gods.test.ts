import { afterEach, describe, expect, it, vi } from 'vitest';
import { SideGame } from '../src/side/game';
import { FINE_KR, HIDDEN_SIGHT, SIGHT_RANGE, TOP_FLOOR, payoutFor, patrolCount } from '../src/side/gods-run';
import { GODS_DOOR_X, godsStage } from '../src/side/gods-stage';
import { STARTING_CASH } from '../src/side/wallet';

function advance(g: SideGame, seconds: number): void { for (let t = 0; t < seconds; t += 0.025) g.update(0.025); }
/** Runs until the condition holds, or fails after `max` seconds. */
function until(g: SideGame, done: () => boolean, max = 8): void {
  for (let t = 0; t < max && !done(); t += 0.025) g.update(0.025);
  expect(done()).toBe(true);
}
function gods(assignment = 1): SideGame {
  const g = new SideGame();
  g.random = () => 0.5;
  g.startGods(assignment);
  return g;
}
/** Walks Marcus through the door, up in Superhissen and into D.D's hands. */
function fetchGods(g: SideGame): void {
  const run = g.gods;
  g.player.x = GODS_DOOR_X; g.player.y = 200; g.interact();
  advance(g, 0.5); expect(run.scene).toBe('lobby');
  g.player.x = 400; g.player.y = 214; g.interact(); advance(g, 0.5); expect(run.scene).toBe('cabin');
  expect(run.pressFloor(TOP_FLOOR)).toBe(true); advance(g, 4); expect(run.floor).toBe(TOP_FLOOR);
  g.interact(); advance(g, 0.5); expect(run.scene).toBe('floor');
  const dd = run.npcs.find(n => n.id === 'dd')!;
  g.player.x = dd.x - 20; g.player.y = dd.y; g.interact();
}
/** An officer at x, facing right, with the courier walking up in front of them. */
function watch(g: SideGame, ox: number, px: number) {
  const o = g.gods.patrols[0];
  g.gods.patrols.length = 1;
  Object.assign(o, { x: ox, y: 214, facing: 1, x0: ox - 5, x1: ox + 5, state: 'wait', timer: 99, suspicion: 0 });
  Object.assign(g.player, { x: px, y: 214 });
  g.camera = g.player.x - 200;
  return o;
}
function hedgeSpot(g: SideGame): number { return g.stage.spots.find(s => s.kind === 'hedge')!.x; }

afterEach(() => vi.unstubAllGlobals());

describe('Gods run: the street', () => {
  it('lays out 28D, four blocks, Kurir Livs, the school and home in walking order', () => {
    const stage = godsStage();
    const at = (role: string) => stage.facades.filter(f => f.role === role).map(f => f.x0).sort((a, b) => a - b);
    const [god] = at('gods'), blocks = at('block'), [shop] = at('kurir'), [school] = at('school');
    expect(blocks).toHaveLength(4);
    expect(god).toBeLessThan(blocks[0]); expect(blocks[3]).toBeLessThan(shop);
    expect(shop).toBeLessThan(school); expect(school).toBeLessThan(stage.homeX);
    expect(stage.encounters).toHaveLength(0); expect(stage.spots.length).toBeGreaterThan(20);
    expect(stage.godsDoorX).toBe(GODS_DOOR_X);
  });

  it('starts outside 28D, unarmed, with no phone, and cannot fight', () => {
    const g = gods();
    expect(g.level).toBe(2); expect(g.mode).toBe('playing'); expect(g.gods.scene).toBe('street');
    expect(g.gods.patrols).toHaveLength(patrolCount(1));
    expect(g.hasPhone).toBe(false); g.metDD = true; g.openPhone(); expect(g.phoneOpen).toBe(false);
    g.queueAttack(); g.queueShot(); advance(g, 0.3);
    expect(g.player.attackTimer).toBe(0); expect(g.events).not.toContain('shot');
    // You start right by the door, so going inside is offered at once.
    expect(g.interaction?.kind).toBe('enter');
  });

  it('brings more patrols with each assignment', () => {
    expect(gods(1).gods.patrols).toHaveLength(3); expect(gods(3).gods.patrols).toHaveLength(5); expect(gods(9).gods.patrols).toHaveLength(6);
  });

  it('gives a harder job a bigger payout, up to a cap', () => {
    expect(payoutFor(1)).toBe(300); expect(payoutFor(2)).toBe(400); expect(payoutFor(50)).toBe(800);
  });
});

describe('Gods run: Kurirgatan 28', () => {
  it('reaches every floor by lift, each with its own people, and D.D on the top one', () => {
    const g = gods(), run = g.gods;
    g.player.x = GODS_DOOR_X; g.player.y = 200; g.interact(); advance(g, 0.5);
    g.player.x = 400; g.player.y = 214; g.interact(); advance(g, 0.5);
    for (let floor = 1; floor <= TOP_FLOOR; floor++) {
      expect(run.pressFloor(floor)).toBe(true); advance(g, 4);
      expect(run.floor).toBe(floor);
      g.interact(); advance(g, 0.5);
      expect(run.scene).toBe('floor'); expect(run.npcs.length).toBeGreaterThan(0);
      expect(run.npcs.some(n => n.id === 'dd')).toBe(floor === TOP_FLOOR);
      g.player.x = 60; g.player.y = 214; g.interact(); advance(g, 0.5); expect(run.scene).toBe('cabin');
    }
    expect(run.pressFloor(9)).toBe(false); expect(run.pressFloor(TOP_FLOOR)).toBe(false);
  });

  it('cannot change floor while the lift moves, and floors stay the same within a run', () => {
    const g = gods(), run = g.gods;
    g.player.x = GODS_DOOR_X; g.player.y = 200; g.interact(); advance(g, 0.5);
    g.player.x = 400; g.player.y = 214; g.interact(); advance(g, 0.5);
    run.pressFloor(5); expect(run.pressFloor(3)).toBe(false);
    advance(g, 4); g.interact(); advance(g, 0.5);
    const first = run.npcs.map(n => `${n.id}@${Math.round(n.x)}`);
    g.player.x = 60; g.player.y = 214; g.interact(); advance(g, 0.5);
    run.pressFloor(6); advance(g, 3); run.pressFloor(5); advance(g, 3); g.interact(); advance(g, 0.5);
    expect(run.npcs.map(n => `${n.id}@${Math.round(n.x)}`)).toEqual(first);
  });

  it('lets D.D hand over the Gods on the top floor, and objectives follow', () => {
    const g = gods();
    expect(g.objective).toContain('D.D');
    fetchGods(g);
    expect(g.gods.received).toBe(true); expect(g.gods.cargo).toBe('carried'); expect(g.hasPackage).toBe(true);
    expect(g.objective).toContain('Gods');
  });
});

describe('Gods run: stealth', () => {
  it('only rouses suspicion while the Gods are on your back', () => {
    const g = gods();
    const o = watch(g, 2000, 2100);
    advance(g, 2); expect(o.state).toBe('wait'); expect(o.suspicion).toBe(0);
    g.gods.cargo = 'carried';
    until(g, () => o.state !== 'wait' && o.state !== 'alert');
    expect(['chase', 'grab']).toContain(o.state); expect(g.gods.spotted).toBe(1);
  });

  it('does not see beyond its range, or behind it', () => {
    const g = gods(); g.gods.cargo = 'carried';
    const far = watch(g, 2000, 2000 + SIGHT_RANGE + 40);
    advance(g, 1.5); expect(far.suspicion).toBe(0);
    const behind = watch(g, 2000, 1900);
    advance(g, 1.5); expect(behind.suspicion).toBe(0);
  });

  it('sees less of a sneaking courier, and almost nothing of one crouched behind cover', () => {
    const g = gods(); g.gods.cargo = 'carried';
    const sneak = watch(g, 2000, 2000 + SIGHT_RANGE * 0.7);
    advance(g, 1.5); expect(sneak.suspicion).toBeGreaterThan(0.9);
    const g2 = gods(); g2.gods.cargo = 'carried'; g2.setSneak(true);
    const o2 = watch(g2, 2000, 2000 + SIGHT_RANGE * 0.7);
    advance(g2, 1.5); expect(o2.suspicion).toBe(0);
    const g3 = gods(); g3.gods.cargo = 'carried'; g3.setSneak(true);
    const x = hedgeSpot(g3);
    const o3 = watch(g3, x - 60, x);
    advance(g3, 2); expect(g3.gods.hidden).toBe(true);
    expect(60).toBeGreaterThan(HIDDEN_SIGHT); expect(o3.suspicion).toBe(0);
  });

  it('chases, cuffs and confiscates: a fine from your cash, and a new assignment outside 28D', () => {
    const g = gods(); g.gods.cargo = 'carried'; g.gods.received = true;
    const before = g.cash;
    const o = watch(g, 2000, 2060);
    until(g, () => g.gods.bust > 0);
    expect(o.state).toBe('cuff');
    expect(g.gods.cargo).toBe('none'); expect(g.cash).toBe(before - FINE_KR); expect(g.gods.fines).toBe(1);
    advance(g, 3);
    expect(g.gods.received).toBe(false); expect(g.gods.scene).toBe('street');
    expect(g.player.x).toBeLessThan(1000); expect(g.player.cuffTimer).toBe(0);
  });

  it('lets a jump or dodge slip out of the grab', () => {
    const g = gods(); g.gods.cargo = 'carried';
    const o = watch(g, 2000, 2030);
    o.state = 'grab'; o.timer = 0.05;
    g.player.dodgeTimer = 0.4;
    advance(g, 0.2);
    expect(g.gods.cargo).toBe('carried'); expect(o.state).toBe('chase');
  });

  it('loses the trail once you break line of sight, and the officer goes back to the beat', () => {
    const g = gods(); g.gods.cargo = 'carried';
    const o = watch(g, 2000, 2140);
    until(g, () => o.state === 'chase');
    o.x = 2000; g.player.x = 2000 + SIGHT_RANGE * 3; g.player.y = 214; g.camera = g.player.x - 200;
    g.setMovement(0, 0);
    advance(g, 4); expect(o.state).toBe('search');
    advance(g, 6); expect(['walk', 'wait']).toContain(o.state);
  });

  it('stashes the Gods at cover and collects them again, and searchers can find a stash', () => {
    const g = gods(); g.gods.cargo = 'carried'; g.gods.received = true;
    const x = hedgeSpot(g);
    g.player.x = x; g.player.y = 200;
    expect(g.interaction?.kind).toBe('stash'); g.interact();
    expect(g.gods.cargo).toBe('stashed'); expect(g.hasPackage).toBe(false); expect(g.gods.stashX).toBe(x);
    g.player.x = x + 400; expect(g.interaction).toBeNull();
    g.player.x = x + 10; expect(g.interaction?.kind).toBe('collect'); g.interact();
    expect(g.gods.cargo).toBe('carried');
    g.interact();
    g.gods.cargo = 'stashed'; g.gods.stashX = x;
    const o = g.gods.patrols[0];
    Object.assign(o, { x: x + 20, y: 214, state: 'search', timer: 4, suspicion: 0 });
    advance(g, 0.1);
    expect(g.gods.cargo).toBe('none');
  });

  it('pays on delivery, adds to the wallet, and moves on to the next assignment', () => {
    const g = gods(2); g.gods.cargo = 'carried'; g.gods.received = true;
    const before = g.cash;
    g.player.x = g.stage.homeX; g.player.y = BAND_TOP_NEAR_WALL;
    expect(g.interaction?.kind).toBe('deliver'); g.interact();
    expect(g.mode).toBe('victory'); expect(g.gods.payout).toBe(400); expect(g.cash).toBe(before + 400);
    g.startGods(g.gods.assignment + 1);
    expect(g.mode).toBe('playing'); expect(g.gods.assignment).toBe(3); expect(g.cash).toBe(before + 400);
  });
});

describe('the shared wallet', () => {
  it('is saved between runs and pays fines', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } });
    const g = new SideGame();
    expect(g.cash).toBe(STARTING_CASH);
    g.cash += 300;
    const again = new SideGame();
    expect(again.cash).toBe(STARTING_CASH + 300); expect(again.earned).toBe(300);
    again.startGods(); expect(again.cash).toBe(STARTING_CASH + 300);
  });
});

const BAND_TOP_NEAR_WALL = 180;
