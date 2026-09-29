import { describe, expect, it } from 'vitest';
import { SideGame } from '../src/side/game';
import { Drive, LANE_FAR, LANE_NEAR } from '../src/side/drive';
import { HEIST, chaseChance, payoutFor } from '../src/side/heist-config';
import { BACK, OUT, YARD } from '../src/side/heist-stages';
import { TRUCK_Y } from '../src/side/yard';

function advance(g: SideGame, seconds: number): void { for (let t = 0; t < seconds; t += 0.025) g.update(0.025); }
function until(g: SideGame, done: () => boolean, max = 10): void {
  for (let t = 0; t < max && !done(); t += 0.025) g.update(0.025);
  expect(done()).toBe(true);
}
function heist(): SideGame {
  const g = new SideGame();
  g.random = () => 0.5;
  g.startHeist();
  return g;
}
/** Skips the pickup and the drive out, and lands in the yard with no patrols. */
function inYard(): SideGame {
  const g = heist();
  until(g, () => g.heist.phase === 'out');
  const d = g.heist.drive!;
  d.traffic = []; d.car.x = OUT.finish - 4; d.car.speed = 40;
  until(g, () => g.heist.phase === 'yard');
  advance(g, 0.5);
  g.heist.yard.crew.patrols = [];
  return g;
}
/** D.D standing in front of a trailer, holding E. */
function workAt(g: SideGame, index: number): void {
  const tr = g.heist.yard.trucks[index];
  g.player.x = tr.x - 24; g.player.y = TRUCK_Y + 20; g.camera = g.player.x - 190;
  g.setMovement(0, 0);
}

describe('The Kapell Job: driving', () => {
  it('starts as D.D in the Taunus at night, with Goran walking up to the car', () => {
    const g = heist();
    expect(g.level).toBe(3); expect(g.mode).toBe('playing'); expect(g.stage.night).toBe(true); expect(g.playerLook).toBe('dd');
    expect(g.heist.phase).toBe('pickup'); expect(g.cars.some(c => c.kind === 'taunus' && c.crew === 1)).toBe(true);
    until(g, () => g.heist.phase === 'out');
    expect(g.cars.find(c => c.kind === 'taunus')!.crew).toBe(2);
  });

  it('speeds up on the gas, slows on the brake and coasts down', () => {
    const d = new Drive({ length: 5000, maxSpeed: 360, finish: 4800, start: 100, density: 0.01, waves: [], rng: () => 0.5 });
    d.traffic = [];
    for (let i = 0; i < 40; i++) d.update(0.05, { throttle: 1, lane: 0 });
    expect(d.car.speed).toBeGreaterThan(300); expect(d.car.speed).toBeLessThanOrEqual(360);
    const fast = d.car.speed;
    for (let i = 0; i < 6; i++) d.update(0.05, { throttle: -1, lane: 0 });
    expect(d.car.speed).toBeLessThan(fast - 100);
    const slow = d.car.speed;
    for (let i = 0; i < 6; i++) d.update(0.05, { throttle: 0, lane: 0 });
    expect(d.car.speed).toBeLessThan(slow); expect(d.car.speed).toBeGreaterThanOrEqual(0);
  });

  it('changes lane in a third of a second, and only into the other lane', () => {
    const d = new Drive({ length: 5000, maxSpeed: 360, finish: 4800, start: 100, density: 0.01, waves: [], rng: () => 0.5 });
    d.traffic = [];
    expect(d.car.y).toBe(LANE_NEAR);
    d.update(0.05, { throttle: 1, lane: -1 });
    expect(d.changingLane).toBe(true); expect(d.car.y).toBeLessThan(LANE_NEAR);
    for (let i = 0; i < 12; i++) d.update(0.05, { throttle: 1, lane: 0 });
    expect(d.car.y).toBe(LANE_FAR); expect(d.laneOfCar).toBe(0);
    d.update(0.05, { throttle: 1, lane: -1 });
    expect(d.car.y).toBe(LANE_FAR);
  });

  it('bumping slower traffic costs speed and a point of damage, once per collision', () => {
    const d = new Drive({ length: 5000, maxSpeed: 360, finish: 4800, start: 100, density: 0.01, waves: [], rng: () => 0.5 });
    d.traffic = [{ id: 9, kind: 'civil', x: 260, y: LANE_NEAR, dir: 1, speed: 100, state: 'driving', timer: 0, stopAt: null, wheel: 0, handed: false }];
    d.car.speed = 300;
    for (let i = 0; i < 10; i++) d.update(0.05, { throttle: 1, lane: 0 });
    expect(d.damage).toBe(1); expect(d.car.speed).toBeLessThan(200);
  });

  it('wrecks the car after enough collisions: the job fails with a fine', () => {
    const g = heist();
    until(g, () => g.heist.phase === 'out');
    const d = g.heist.drive!, before = g.cash;
    d.damage = HEIST.wreckAt - 1;
    d.traffic = [{ id: 9, kind: 'truck', x: d.car.x + 90, y: LANE_NEAR, dir: 1, speed: 60, state: 'driving', timer: 0, stopAt: null, wheel: 0, handed: false }];
    g.setMovement(1, 0); d.car.speed = 250;
    until(g, () => g.mode === 'defeat');
    expect(g.heist.failure).toBe('wrecked'); expect(g.heist.fine).toBe(Math.min(before, HEIST.fine)); expect(g.cash).toBe(before - g.heist.fine);
  });

  it('has no police at all on the way out', () => {
    const g = heist();
    until(g, () => g.heist.phase === 'out');
    g.setMovement(1, 0);
    advance(g, 30);
    expect(g.heist.drive!.police).toHaveLength(0); expect(g.wanted).toBe(false);
  });

  it('parks at the yard gate and gets out on foot', () => {
    const g = inYard();
    expect(g.heist.phase).toBe('yard'); expect(g.stage.length).toBe(YARD.length);
    expect(g.heist.yard.trucks).toHaveLength(6); expect(g.heist.drive).toBeNull();
    expect(g.objective).toContain('kapell');
  });
});

describe('The Kapell Job: the yard', () => {
  it('cuts a kapell in three seconds of holding E, and opens it with crates inside', () => {
    const g = inYard();
    workAt(g, 0);
    expect(g.interaction?.kind).toBe('cut');
    g.setUse(true);
    advance(g, 1.4);
    expect(g.heist.yard.trucks[0].state).toBe('cutting'); expect(g.heist.yard.trucks[0].cut).toBeGreaterThan(0.3);
    until(g, () => g.heist.yard.trucks[0].state === 'cut');
    g.setUse(false);
    const tr = g.heist.yard.trucks[0];
    expect(tr.state).toBe('cut'); expect(tr.crates).toBeGreaterThanOrEqual(2); expect(g.heist.yard.noiseEvents).toBe(1);
    expect(g.interaction?.kind).toBe('grab');
  });

  it('lets go of the knife when E is released, and the cut stays where it was', () => {
    const g = inYard();
    workAt(g, 1);
    g.setUse(true); advance(g, 1);
    g.setUse(false); const cut = g.heist.yard.trucks[1].cut; advance(g, 2);
    expect(g.heist.yard.trucks[1].cut).toBe(cut); expect(g.heist.yard.trucks[1].state).toBe('cutting');
  });

  it('takes crates one at a time up to two, then loads them and can drive off', () => {
    const g = inYard(), y = g.heist.yard;
    workAt(g, 0);
    g.setUse(true); until(g, () => y.trucks[0].state === 'cut');
    until(g, () => y.carry === 2);
    expect(y.carry).toBe(HEIST.carryMax); expect(g.hasPackage).toBe(true); expect(g.interaction?.kind).not.toBe('grab');
    g.setUse(false);
    g.player.x = YARD.carX; g.player.y = 226;
    expect(g.interaction?.kind).toBe('load'); g.interact();
    expect(y.trunk).toBe(2); expect(y.carry).toBe(0);
    expect(g.interaction?.kind).toBe('drive');
    g.interact();
    expect(y.leaving).toBe(true);
    until(g, () => g.heist.phase === 'back', 12);
    expect(g.stage.length).toBe(BACK.length);
  });

  it('cannot drive off with an empty boot', () => {
    const g = inYard();
    g.player.x = YARD.carX; g.player.y = 226;
    expect(g.interaction).toBeNull();
  });

  it('is loud: officers who cannot see you still grow suspicious of a cut nearby', () => {
    const g = inYard(), y = g.heist.yard;
    workAt(g, 0);
    const tr = y.trucks[0];
    // The officer is behind the trailer facing away: nothing sees D.D, but the cut is heard.
    y.crew.patrols = [{ id: 1, x: tr.x - 90, y: TRUCK_Y - 14, z: 0, facing: -1, walk: 0, x0: tr.x - 92, x1: tr.x - 88, state: 'wait', timer: 99, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0 }];
    g.setUse(true);
    advance(g, 1);
    expect(y.crew.patrols[0].suspicion).toBeGreaterThan(0.3);
  });

  it('is quiet when the officer is far away', () => {
    const g = inYard(), y = g.heist.yard;
    workAt(g, 0);
    const tr = y.trucks[0];
    y.crew.patrols = [{ id: 1, x: tr.x - 500, y: 230, z: 0, facing: -1, walk: 0, x0: tr.x - 502, x1: tr.x - 498, state: 'wait', timer: 99, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0 }];
    g.setUse(true);
    advance(g, 2);
    expect(y.crew.patrols[0].suspicion).toBe(0);
  });

  it('lets a trailer block the view: hidden behind it, D.D is not seen', () => {
    const g = inYard(), y = g.heist.yard, tr = y.trucks[2];
    g.setSneak(true);
    Object.assign(g.player, { x: tr.x - 20, y: TRUCK_Y - 12 }); g.camera = g.player.x - 190;
    y.crew.patrols = [{ id: 1, x: tr.x + 60, y: 232, z: 0, facing: -1, walk: 0, x0: tr.x + 58, x1: tr.x + 62, state: 'wait', timer: 99, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0 }];
    advance(g, 2);
    expect(y.hidden).toBe(true); expect(y.crew.patrols[0].suspicion).toBe(0);
    // Step out in front of the trailer, and the same officer sees him.
    g.setSneak(false);
    Object.assign(g.player, { x: tr.x - 20, y: 230 }); g.camera = g.player.x - 190;
    advance(g, 1.5);
    expect(y.crew.patrols[0].suspicion).toBeGreaterThan(0.5);
  });

  it('fails the whole job when D.D is arrested, with a fine', () => {
    const g = inYard(), y = g.heist.yard, before = g.cash;
    Object.assign(g.player, { x: 1200, y: 230 }); g.camera = 1000;
    y.crew.patrols = [{ id: 1, x: 1240, y: 230, z: 0, facing: -1, walk: 0, x0: 1238, x1: 1242, state: 'wait', timer: 99, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0 }];
    until(g, () => g.mode === 'defeat', 12);
    expect(g.heist.failure).toBe('busted'); expect(g.cash).toBe(before - Math.min(before, HEIST.fine));
  });

  it('fails the whole job when Goran is arrested, too', () => {
    const g = inYard(), y = g.heist.yard;
    y.goran.x = 1500; y.goran.y = 230; y.goran.state = 'follow';
    Object.assign(g.player, { x: 500, y: 226 });
    y.crew.patrols = [{ id: 1, x: 1530, y: 230, z: 0, facing: -1, walk: 0, x0: 1528, x1: 1532, state: 'wait', timer: 99, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0 }];
    // Goran is out of D.D's sight but he can still be caught.
    until(g, () => g.mode === 'defeat', 14);
    expect(g.heist.failure === 'goran' || g.heist.failure === 'busted').toBe(true);
  });

  it('has Goran hide and whistle when police get close, and work another trailer while D.D cuts', () => {
    const g = inYard(), y = g.heist.yard;
    workAt(g, 0);
    g.setUse(true);
    advance(g, 4);
    expect(y.goran.state === 'go' || y.goran.state === 'cut' || y.goran.state === 'grab' || y.goran.state === 'haul').toBe(true);
    const other = y.trucks.find(t => t.claim === 'goran' || t.state !== 'closed' && t !== y.trucks[0]);
    expect(other).toBeDefined();
    y.goran.state = 'follow'; y.goran.x = 2000; y.goran.y = 228;
    y.crew.patrols = [{ id: 1, x: 2100, y: 228, z: 0, facing: -1, walk: 0, x0: 2098, x1: 2102, state: 'wait', timer: 99, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0 }];
    advance(g, 0.5);
    expect(y.goran.state).toBe('hide'); expect(g.events).toContain('whistle');
  });
});

describe('The Kapell Job: the way back', () => {
  function backWith(g: SideGame, crates: number): void {
    const y = g.heist.yard;
    y.trunk = crates;
    y.leaving = true; y.goran.state = 'board'; y.goran.x = YARD.carX;
    until(g, () => g.heist.phase === 'back', 12);
  }

  it('chases with the odds set by the crates and the noise, from the game’s random source', () => {
    expect(chaseChance(0, 0)).toBeCloseTo(0.3); expect(chaseChance(3, 2)).toBeCloseTo(0.3 + 0.24 + 0.1); expect(chaseChance(8, 4)).toBe(HEIST.chaseCap); expect(chaseChance(8, 40)).toBe(HEIST.chaseCap);
    const calm = inYard(); calm.random = () => 0.99; backWith(calm, 2);
    expect(calm.heist.chased).toBe(false); expect(calm.heist.drive!.opts.waves).toHaveLength(0);
    const hot = inYard(); hot.random = () => 0.01; backWith(hot, 2);
    expect(hot.heist.chased).toBe(true); expect(hot.heist.drive!.opts.waves.length).toBeGreaterThan(0);
  });

  it('sends police up behind you in waves, and they can be shaken off', () => {
    const g = inYard(); g.random = () => 0.01; backWith(g, 4);
    const d = g.heist.drive!; d.traffic = [];
    g.setMovement(1, 0);
    until(g, () => d.police.length > 0, 10);
    expect(g.wanted).toBe(true); expect(g.events.filter(e => e === 'siren').length + (g.message.length ? 1 : 0)).toBeGreaterThan(0);
    // Flat out on an empty road: the police can't keep up and give up.
    for (const c of d.traffic) c.x = -9999;
    until(g, () => d.police.length === 0 || g.heist.phase !== 'back', 40);
  });

  it('arrests you when the police box you in at a crawl', () => {
    const g = inYard(); g.random = () => 0.01; backWith(g, 4);
    const d = g.heist.drive!; d.traffic = [];
    until(g, () => d.police.length > 0, 10);
    const p = d.police[0];
    d.car.speed = 10; p.x = d.car.x - 40; p.y = d.car.y;
    g.setMovement(0, 0);
    until(g, () => g.mode === 'defeat', 6);
    expect(g.heist.failure).toBe('arrested');
  });

  it('pays crates × 120 kr less 40 kr a dent when you get back to Kurirgatan', () => {
    expect(payoutFor(6, 2)).toBe(6 * 120 - 80); expect(payoutFor(1, 9)).toBe(0);
    const g = inYard(); g.random = () => 0.99; backWith(g, 5);
    const d = g.heist.drive!; d.traffic = []; d.damage = 1;
    const before = g.cash;
    d.car.x = BACK.finish - 4; d.car.speed = 40;
    until(g, () => g.mode === 'victory', 4);
    expect(g.heist.delivered).toBe(5); expect(g.heist.payout).toBe(5 * HEIST.crateValue - HEIST.damageCost);
    expect(g.cash).toBe(before + g.heist.payout);
  });
});
