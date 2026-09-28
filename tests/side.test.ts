import { describe, expect, it } from 'vitest';
import { computeScore } from '../src/game';
import { CLIP, FINE, GIVE_UP, KINDS, SideGame, type Officer, type SideEnemy } from '../src/side/game';
import { BAND_TOP, PX_PER_M, WIDTH } from '../src/side/layout';
import { stageFor, streetAt, type Stage } from '../src/side/stage';
import { KURIR_BUILDING_ID } from '../src/side/routes';
import { DIRECT_GROUP, MARCUS_GROUP, SPAWNS } from '../src/world';

const direct = stageFor('direct'), marcus = stageFor('marcus');
const kurir = stageFor('kurir'), both = stageFor('marcus-kurir');
const STEP = 1 / 60;

function run(game: SideGame, seconds: number): void {
  for (let t = 0; t < seconds; t += STEP) game.update(STEP);
}
/** Puts the courier somewhere on the stage, with the camera where walking there would leave it. */
function teleport(game: SideGame, x: number, y = 214): void {
  game.camera = Math.max(0, Math.min(game.stage.length - WIDTH, x - WIDTH * 0.4));
  game.player.x = x;
  game.player.y = y;
}
function clearStreets(game: SideGame): void {
  for (const e of game.stage.encounters) if (!e.home) game.encounters.set(e.id, 'cleared');
  for (const e of game.enemies) { e.hp = 0; e.gone = true; }
}
/** A lone crew member squaring up to the courier, with the screen held for the fight. */
function sparring(game: SideGame, kind: SideEnemy['kind'] = 'runner', gap = 24): SideEnemy {
  game.start('direct');
  game.hasPackage = true;
  clearStreets(game);
  teleport(game, 900);
  const enemy: SideEnemy = {
    id: 500, kind, encounter: 500, x: 900 + gap, y: 214, z: 0, vx: 0, vz: 0, facing: -1, hp: KINDS[kind].hp, maxHp: KINDS[kind].hp,
    flash: 0, walk: 0, state: 'walk', timer: 0, cooldown: 99, struck: false, lane: 0, gone: false,
  };
  game.enemies.push(enemy);
  game.active = { id: 500, camera: game.camera, spawns: [], backup: [], home: false };
  return enemy;
}

describe('side-scrolling stage', () => {
  it('unrolls both routes from Pålsjö kiosk to the door of Ringstorpsvägen 55B', () => {
    for (const stage of [direct, marcus, kurir, both]) {
      const kiosk = stage.facades.find(f => f.role === 'kiosk')!, home = stage.facades.find(f => f.role === 'home')!;
      expect(kiosk.appearance.model).toBe('kiosk');
      expect(kiosk.door).toBe(stage.package.x);
      expect(home.address).toBe('Ringstorpsvägen 55B');
      expect(home.door).toBe(stage.homeX);
      expect(stage.start.x).toBeLessThan(stage.package.x);
      expect(stage.homeX).toBeLessThan(stage.length);
    }
    // 503 m and 598 m of route, plus the stretch before the kiosk and past the door.
    expect(direct.homeX / PX_PER_M).toBeGreaterThan(510);
    expect(direct.homeX / PX_PER_M).toBeLessThan(530);
    expect(marcus.homeX - direct.homeX).toBeGreaterThan(80 * PX_PER_M);
    expect(direct.marcusX).toBeNull();
    expect(marcus.marcusX).toBeGreaterThan(marcus.forkX);
    expect(marcus.marcusX).toBeLessThan(marcus.homeX);
    expect(marcus.facades.find(f => f.role === 'marcus')?.address).toBe('Långåkersgatan 4');
  });

  it('passes the real streets in order', () => {
    const order = (stage: Stage) => stage.streets.map(r => r.value).filter((v, i, all): v is string => !!v && all.indexOf(v) === i);
    expect(order(direct)).toEqual(['Johan Banérs gata', 'Ringstorpsvägen']);
    expect(order(marcus)).toEqual(['Johan Banérs gata', 'Romares väg', 'Långåkersgatan', 'Almgatan', 'Ringstorpsvägen']);
    expect(streetAt(marcus, marcus.marcusX!)).toBe('Långåkersgatan');
    expect(streetAt(direct, direct.homeX)).toBe('Ringstorpsvägen');
  });

  it('shows the same street on both routes until they part', () => {
    const before = (stage: Stage) => ({
      facades: stage.facades.filter(f => f.x1 < stage.forkX - WIDTH).map(f => [f.id, f.x0, f.row]),
      trees: stage.trees.filter(t => t.x < stage.forkX - WIDTH).map(t => [t.x, t.dist]),
      crews: stage.encounters.filter(e => e.spawns.every(s => s.x < stage.forkX)).map(e => [e.id, e.camera, e.spawns.length]),
    });
    expect(direct.forkX).toBe(marcus.forkX);
    expect(before(marcus)).toEqual(before(direct));
    expect(before(direct).facades.length).toBeGreaterThan(0);
  });

  it('puts each route’s crews on that route and saves the boss for last', () => {
    const ids = (stage: Stage) => stage.encounters.flatMap(e => e.spawns.map(s => s.id));
    const group = (g: number) => SPAWNS.map((s, id) => ({ s, id })).filter(o => o.s.group === g).map(o => o.id);
    for (const id of group(DIRECT_GROUP)) { expect(ids(direct)).toContain(id); expect(ids(marcus)).not.toContain(id); }
    for (const id of group(MARCUS_GROUP)) { expect(ids(marcus)).toContain(id); expect(ids(direct)).not.toContain(id); }
    for (const stage of [direct, marcus]) {
      const last = stage.encounters[stage.encounters.length - 1];
      expect(last.home).toBe(true);
      expect(last.spawns.some(s => s.kind === 'boss')).toBe(true);
      expect(last.camera).toBe(stage.length - WIDTH);
      stage.encounters.slice(1).forEach((e, i) => expect(e.camera).toBeGreaterThan(stage.encounters[i].camera));
    }
    const crew = (stage: Stage) => stage.encounters.reduce((n, e) => n + e.spawns.length + e.backup.length, 0);
    expect(crew(direct)).toBeGreaterThan(crew(marcus));
  });

  it('keeps the houses across the street from overlapping each other', () => {
    for (const stage of [direct, marcus, kurir, both]) {
      const row = stage.facades.filter(f => f.row === 0).sort((a, b) => a.x0 - b.x0);
      for (let i = 1; i < row.length; i++) expect(row[i].x0).toBeGreaterThan(row[i - 1].x1 - 2);
    }
  });

  it('adds the shopping forecourt after either approach, before the home crew', () => {
    for (const [original, detour] of [[direct, kurir], [marcus, both]]) {
      const junction = original.junctions.find(j => j.id === 'kurir')!;
      const shop = detour.facades.find(f => f.role === 'kurir')!;
      expect(shop.id).toBe(KURIR_BUILDING_ID);
      expect(shop.door).toBe(detour.shopX);
      expect(shop.door).toBeGreaterThan(shop.x0);
      expect(shop.door).toBeLessThan(shop.x0 + (shop.x1 - shop.x0) / 3);
      expect(detour.shopX).toBeGreaterThan(junction.x);
      expect(detour.shopX).toBeLessThan(detour.homeX);
      expect(streetAt(detour, detour.shopX!)).toBe('Kurirgatan');
      expect(detour.surfaces.find(r => detour.shopX! >= r.x0 && detour.shopX! < r.x1)?.value).toBe('paved');
      expect(detour.homeX - original.homeX).toBeGreaterThan(300 * PX_PER_M);
      const before = (stage: Stage) => stage.encounters.filter(e => e.camera < junction.x).map(e => [e.id, e.camera]);
      expect(before(detour)).toEqual(before(original));
      expect(detour.encounters.at(-1)?.home).toBe(true);
      expect(detour.encounters.at(-2)?.camera).toBeGreaterThan(shop.x1);
      expect(detour.marcusX).toBe(original.marcusX);
    }
    expect(both.junctions).toEqual([]);
  });

  it('uses the pictured left-hand frontage on Johan Banérs gata in street order', () => {
    const pictured = direct.facades.filter(f => f.reference && f.row === 0).sort((a, b) => a.x0 - b.x0);
    expect(pictured.map(f => f.address)).toEqual([37, 39, 41, 43, 45, 47, 53, 55, 57, 59, 61].map(n => `Johan Banérs gata ${n}`));
    for (const stage of [direct, marcus]) {
      expect(stage.facades.filter(f => /^Johan Banérs gata \d+$/.test(f.address ?? ''))
        .every(f => Number(f.address!.split(' ').at(-1)) % 2 === 1)).toBe(true);
      // The near white villas and hipped-roof house stay in front on both routes after rejoining.
      for (const n of [53, 55, 57, 59, 61]) {
        expect(stage.facades.find(f => f.address === `Johan Banérs gata ${n}`)?.row).toBe(0);
      }
      expect(stage.facades.filter(f => f.backOnly).every(f => f.row === 1)).toBe(true);
    }
    expect(pictured.find(f => f.address === 'Johan Banérs gata 37')?.reference?.silhouette).toBe('hip');
    expect(pictured.find(f => f.address === 'Johan Banérs gata 53')?.reference?.roofSide).toBe('solar');
  });

  it('only uses a photo elevation when the route actually faces that street', () => {
    // On the detour, 47 is seen from Almgatan rather than from its photographed gable.
    expect(marcus.facades.find(f => f.address === 'Johan Banérs gata 47')?.reference).toBeUndefined();
    for (const n of [53, 55, 57, 59, 61]) {
      const address = `Johan Banérs gata ${n}`;
      expect(marcus.facades.find(f => f.address === address)?.reference).toEqual(direct.facades.find(f => f.address === address)?.reference);
    }
  });

  it('shows the pictured side of Långåkersgatan and aligns Marcus’s checkpoint with the side approach', () => {
    for (const stage of [marcus, both]) {
      const row = stage.facades.filter(f => f.reference?.source === 'user-langakers').sort((a, b) => a.x0 - b.x0);
      expect(row.map(f => f.address)).toEqual(['Långåkersgatan 2', 'Långåkersgatan 4', 'Långåkersgatan 6', 'Långåkersgatan 8', 'Almgatan 3']);
      expect(row.filter(f => f.row !== 0).map(f => f.address)).toEqual([]);
      expect(stage.facades.some(f => /^Långåkersgatan [135]$/.test(f.address ?? ''))).toBe(false);
      const house = row.find(f => f.role === 'marcus')!;
      expect(house.reference?.silhouette).toBe('eaves');
      expect(house.reference?.door).toBeUndefined();
      expect(stage.marcusX).toBe(house.x0 + (house.x1 - house.x0) * house.reference!.gate);
      expect(house.door).toBe(stage.marcusX);
    }
    expect(direct.facades.some(f => f.reference?.source === 'user-langakers')).toBe(false);
  });
});

describe('side-scrolling game', () => {
  it('won’t scroll past the kiosk until the package is picked up', () => {
    const game = new SideGame();
    game.start('direct');
    game.setMovement(1, 0);
    run(game, 4);
    expect(game.hasPackage).toBe(false);
    expect(game.camera).toBeLessThanOrEqual(game.stage.package.x);
    expect(game.player.x).toBeLessThan(game.camera + WIDTH);
    game.setMovement(0, 0);
    teleport(game, game.stage.package.x, game.stage.package.y);
    game.update(STEP);
    expect(game.hasPackage).toBe(true);
  });

  it('holds the screen while a crew is on, then lets it scroll on', () => {
    const game = new SideGame();
    game.start('direct');
    game.hasPackage = true;
    const first = game.stage.encounters[0];
    teleport(game, first.camera + WIDTH * 0.4 - 20);
    game.setMovement(1, 0);
    run(game, 3);
    expect(game.active?.id).toBe(first.id);
    expect(game.camera).toBeLessThanOrEqual(first.camera);
    expect(game.player.x).toBeLessThanOrEqual(first.camera + WIDTH);
    game.setMovement(0, 0);
    for (const e of game.enemies) if (e.encounter === first.id) e.hp = 0;
    run(game, 0.1);
    expect(game.encounterState(first.id)).toBe('cleared');
    expect(game.goTimer).toBeGreaterThan(0);
    game.setMovement(1, 0);
    run(game, 2);
    expect(game.camera).toBeGreaterThan(first.camera);
  });

  it('keeps the screen held until the backup is down too', () => {
    const game = new SideGame();
    game.start('direct');
    game.hasPackage = true;
    const crew = game.stage.encounters.find(e => !e.home && e.backup.length)!;
    for (const e of game.stage.encounters) {
      if (e.camera >= crew.camera) continue;
      game.encounters.set(e.id, 'cleared');
      for (const x of game.enemies) if (x.encounter === e.id) { x.hp = 0; x.gone = true; }
    }
    teleport(game, crew.camera + WIDTH * 0.4);
    game.update(STEP);
    expect(game.active?.id).toBe(crew.id);
    // The whole crew drops at once, before anyone has called for help.
    for (const x of game.enemies) if (x.encounter === crew.id) { x.hp = 0; x.state = 'ko'; x.gone = true; }
    const backup = () => game.enemies.filter(x => x.encounter === crew.id && x.id >= 1000);
    for (let t = 0; t < 8 && backup().length < crew.backup.length; t += STEP) {
      game.update(STEP);
      expect(game.encounterState(crew.id)).toBe('active');
    }
    expect(backup().length).toBe(crew.backup.length);
    expect(game.encounterState(crew.id)).toBe('active');
    for (const x of backup()) x.hp = 0;
    game.update(STEP);
    expect(game.encounterState(crew.id)).toBe('cleared');
  });

  it('lands a jab, cross and hook that knocks a runner down and out', () => {
    const game = new SideGame();
    const enemy = sparring(game);
    game.player.facing = 1;
    const hp: number[] = [];
    for (let i = 0; i < 3; i++) {
      game.queueAttack();
      run(game, 0.3);
      hp.push(enemy.hp);
    }
    expect(hp).toEqual([2, 1, 0]);
    expect(game.player.combo).toBe(3);
    expect(['down', 'ko']).toContain(enemy.state);
    expect(game.koCount).toBe(1);
    run(game, 2);
    expect(enemy.gone).toBe(true);
  });

  it('flies into a jump kick that knocks a crew member down', () => {
    const game = new SideGame();
    const enemy = sparring(game, 'bruiser', 28);
    game.player.facing = 1;
    game.queueJump();
    run(game, 0.08);
    expect(game.player.z).toBeGreaterThan(0);
    game.queueAttack();
    run(game, 0.2);
    expect(enemy.state).toBe('down');
    expect(enemy.hp).toBe(KINDS.bruiser.hp - 2);
    run(game, 0.6);
    expect(game.player.z).toBe(0);
  });

  it('takes one hit at a time, none while dodging, and a boss blow knocks the courier down', () => {
    const game = new SideGame();
    const enemy = sparring(game, 'runner', 20);
    const strike = () => { enemy.state = 'windup'; enemy.timer = 0.01; enemy.facing = -1; enemy.x = game.player.x + 20; enemy.y = game.player.y; run(game, 0.05); };
    strike();
    expect(game.player.hp).toBe(4);
    strike();
    expect(game.player.hp).toBe(4);
    run(game, 1.2);
    game.queueDodge();
    game.update(STEP);
    strike();
    expect(game.player.hp).toBe(4);
    run(game, 1.2);
    enemy.kind = 'boss';
    strike();
    expect(game.player.hp).toBe(2);
    expect(game.player.downTimer).toBeGreaterThan(0);
  });

  it('continues from Marcus A after a knockout, for a score penalty', () => {
    const game = new SideGame();
    game.start('marcus');
    game.hasPackage = true;
    const marcusX = game.stage.marcusX!;
    // Knocked out further along, in the middle of a fight, with the crews before it beaten.
    const fight = game.stage.encounters.find(e => !e.home && e.camera > marcusX && e.spawns.length > 1)!;
    for (const e of game.stage.encounters) {
      if (e.camera >= fight.camera) continue;
      game.encounters.set(e.id, 'cleared');
      for (const x of game.enemies) if (x.encounter === e.id) { x.hp = 0; x.gone = true; }
    }
    teleport(game, marcusX, BAND_TOP + 4);
    game.player.hp = 2;
    game.update(STEP);
    expect(game.healed).toBe(true);
    expect(game.player.hp).toBe(5);
    expect(game.checkpoint).toBe(marcusX);
    teleport(game, fight.camera + WIDTH * 0.4);
    game.update(STEP);
    expect(game.active?.id).toBe(fight.id);
    game.player.hp = 1;
    // One of this crew was knocked out before the courier went down; the rematch shouldn't count it twice.
    const kosBefore = game.koCount;
    const beaten = game.enemies.filter(e => e.encounter === fight.id);
    beaten[1].hp = 0;
    game.koCount++;
    const enemy = beaten[0];
    Object.assign(enemy, { state: 'windup', timer: 0.01, facing: -1, x: game.player.x + 20, y: game.player.y });
    run(game, 1.5);
    expect(game.mode).toBe('defeat');
    game.continueFromCheckpoint();
    expect(game.mode).toBe('playing');
    expect(game.player.hp).toBe(5);
    expect(game.player.x).toBe(marcusX);
    expect(game.continues).toBe(1);
    expect(game.koCount).toBe(kosBefore);
    expect(game.encounterState(fight.id)).toBe('waiting');
    expect(game.camera).toBeLessThan(fight.camera);
  });

  it('chooses Marcus A at the junction during play and carries progress through the turn', () => {
    const game = new SideGame();
    game.start();
    game.interact();
    expect(game.route).toBe('direct');
    teleport(game, direct.forkX);
    game.interact();
    expect(game.route).toBe('direct'); // Pick up the package first.
    game.hasPackage = true;
    game.encounters.set(0, 'cleared');
    game.player.hp = 2;
    game.koCount = 4;
    game.elapsed = 24;
    const camera = game.camera;
    expect(game.interaction?.kind).toBe('turn');
    game.interact();
    expect(game.route).toBe('marcus');
    expect(game.stage).toBe(marcus);
    expect(game.player.x).toBe(direct.forkX);
    expect(game.camera).toBe(camera);
    expect(game.player.hp).toBe(2);
    expect(game.hasPackage).toBe(true);
    expect(game.koCount).toBe(4);
    expect(game.elapsed).toBe(24);
    expect(game.encounterState(0)).toBe('cleared');
    expect(game.enemies.some(e => e.encounter === 0)).toBe(false);
    expect(game.decisions.get('romares')).toBe('turn');
    game.interact();
    expect(game.route).toBe('marcus');
  });

  it('keeps walking straight by default and still offers the later shop turn', () => {
    const game = new SideGame();
    game.start();
    game.hasPackage = true;
    clearStreets(game);
    teleport(game, direct.forkX - 40);
    game.setMovement(1, 0);
    run(game, 1.5);
    game.setMovement(0, 0);
    expect(game.route).toBe('direct');
    expect(game.decisions.get('romares')).toBe('straight');
    const junction = direct.junctions.find(j => j.id === 'kurir')!;
    teleport(game, junction.x);
    game.interact();
    expect(game.route).toBe('kurir');
    expect(game.stage.shopX).not.toBeNull();
    game.start();
    expect(game.route).toBe('direct');
    expect(game.decisions.size).toBe(0);
    expect(game.shopHealed).toBe(false);
  });

  it('cannot use a turn to escape a fight, jump, knockout or pause', () => {
    const game = new SideGame();
    game.start();
    game.hasPackage = true;
    teleport(game, direct.forkX);
    game.active = direct.encounters[0];
    game.interact();
    expect(game.route).toBe('direct');
    game.active = null;
    for (const property of ['z', 'downTimer', 'hurtTimer', 'riseTimer', 'attackTimer', 'dodgeTimer'] as const) {
      game.player[property] = 1;
      game.interact();
      expect(game.route).toBe('direct');
      game.player[property] = 0;
    }
    game.togglePause();
    game.interact();
    expect(game.route).toBe('direct');
    game.togglePause();
    game.player.hp = 0;
    game.interact();
    expect(game.route).toBe('direct');
  });

  it('can visit both stops and keeps the Marcus checkpoint after the shop turn', () => {
    const game = new SideGame();
    game.start();
    game.hasPackage = true;
    clearStreets(game);
    teleport(game, direct.forkX);
    game.interact();
    run(game, 0.4);
    clearStreets(game);
    teleport(game, game.stage.marcusX!, BAND_TOP + 4);
    game.player.hp = 1;
    game.update(STEP);
    const checkpoint = game.checkpoint;
    expect(game.healed).toBe(true);
    expect(checkpoint).toBe(marcus.marcusX);
    teleport(game, game.stage.junctions.find(j => j.id === 'kurir')!.x);
    game.interact();
    expect(game.route).toBe('marcus-kurir');
    expect(game.checkpoint).toBe(checkpoint);
    expect(game.player.hp).toBe(5);
    run(game, 0.4);
    teleport(game, game.stage.shopX!, BAND_TOP + 4);
    game.player.hp = 2;
    game.interact();
    expect(game.shopHealed).toBe(true);
    expect(game.player.hp).toBe(5);
    // A later knockout returns to Marcus on the chosen route, without resetting supplies.
    game.mode = 'defeat';
    game.player.hp = 0;
    game.continueFromCheckpoint();
    expect(game.player.x).toBe(checkpoint);
    expect(game.route).toBe('marcus-kurir');
    expect(game.shopHealed).toBe(true);
    expect(game.hasPackage).toBe(true);
    expect(game.decisions.size).toBe(2);
  });

  it('refills once at the shop entrance and saves supplies when health is full', () => {
    const game = new SideGame();
    game.start('kurir');
    game.hasPackage = true;
    clearStreets(game);
    teleport(game, game.stage.shopX!, BAND_TOP + 4);
    game.interact();
    expect(game.shopHealed).toBe(false);
    game.player.hp = 2;
    game.player.y = 240;
    game.interact();
    expect(game.player.hp).toBe(2); // Must step up to the shop.
    game.player.y = BAND_TOP + 4;
    game.player.z = 4;
    game.interact();
    expect(game.player.hp).toBe(2);
    game.player.z = 0;
    game.active = game.stage.encounters[0];
    game.interact();
    expect(game.player.hp).toBe(2);
    game.active = null;
    game.interact();
    expect(game.player.hp).toBe(5);
    expect(game.shopHealed).toBe(true);
    game.player.hp = 3;
    game.interact();
    expect(game.player.hp).toBe(3);
    expect(game.checkpoint).toBeNull();
  });

  it('picks up the package, patches up at Marcus A and beats the home crew to deliver', () => {
    const game = new SideGame();
    game.start('marcus');
    expect(game.objective).toContain('Pick up the package');
    teleport(game, game.stage.package.x, game.stage.package.y);
    game.update(STEP);
    expect(game.hasPackage).toBe(true);
    expect(game.objective).toContain('Marcus A');
    clearStreets(game);
    teleport(game, game.stage.marcusX!, BAND_TOP + 4);
    game.update(STEP);
    expect(game.healed).toBe(true);
    teleport(game, game.stage.length - WIDTH * 0.5);
    game.update(STEP);
    expect(game.crewSprung).toBe(true);
    expect(game.objective).toContain('Shake off');
    expect(game.mode).toBe('playing');
    for (const e of game.enemies) if (e.encounter === 100) e.hp = 0;
    game.update(STEP);
    expect(game.homeCrewDown).toBe(true);
    teleport(game, game.stage.homeX, BAND_TOP + 4);
    game.update(STEP);
    expect(game.mode).toBe('victory');
    expect(game.score).toBeGreaterThan(0);
  });
});

describe('D.D, his handgun and the police', () => {
  /** The middle of a long stretch of carriageway, where traffic can pass. */
  const roadSpot = (stage: Stage) => {
    const run = stage.surfaces.find(r => (r.value === 'major' || r.value === 'road') && r.x1 - r.x0 > 1400)!;
    return Math.round((run.x0 + run.x1) / 2);
  };
  function onRoad(game: SideGame): void {
    game.start('direct');
    game.hasPackage = true;
    clearStreets(game);
    teleport(game, roadSpot(game.stage));
    game.random = () => 0.9; // Heading left, towards the courier.
  }
  function officer(game: SideGame, dx: number, cooldown = 99): Officer {
    const o: Officer = {
      id: 77, unit: 99, x: game.player.x + dx, y: game.player.y, z: 0, vx: 0, vz: 0, facing: dx > 0 ? -1 : 1, hp: 1, maxHp: 1,
      flash: 0, walk: 0, state: 'run', timer: 0, cooldown, gone: false,
    };
    game.police.push(o);
    return o;
  }

  it('drives D.D by, pulls over when waved at, and hands over the gun', () => {
    const game = new SideGame();
    onRoad(game);
    game.bmwTimer = 0;
    game.update(STEP);
    const bmw = game.cars.find(c => c.kind === 'bmw')!;
    expect(bmw).toBeDefined();
    expect(game.events).toContain('honk');
    expect(game.interaction?.kind).not.toBe('hail');
    for (let t = 0; t < 5 && !game.bmwInReach; t += STEP) game.update(STEP);
    expect(game.interaction?.kind).toBe('hail');
    game.interact();
    expect(bmw.state).toBe('braking');
    for (let t = 0; t < 3 && bmw.state !== 'stopped'; t += STEP) game.update(STEP);
    expect(bmw.state).toBe('stopped');
    // He pulls up with his window just beside the courier.
    expect(Math.abs(bmw.x + bmw.dir * 7 - game.player.x)).toBeLessThan(60);
    run(game, 0.7);
    expect(game.ammo).toBe(CLIP);
    expect(game.metDD).toBe(true);
    run(game, 5);
    expect(game.cars.some(c => c.kind === 'bmw')).toBe(false);
    // While the courier is armed, he doesn't come round again.
    game.bmwTimer = 0;
    run(game, 1);
    expect(game.cars.some(c => c.kind === 'bmw')).toBe(false);
  });

  it('drives on if nobody waves, and comes round again later', () => {
    const game = new SideGame();
    onRoad(game);
    game.bmwTimer = 0;
    run(game, 6);
    expect(game.cars).toEqual([]);
    expect(game.ammo).toBe(0);
    expect(game.bmwTimer).toBeGreaterThan(20);
  });

  it('only comes by on an open road once the package has been picked up', () => {
    const game = new SideGame();
    game.start('direct');
    game.bmwTimer = 0;
    run(game, 1);
    expect(game.cars).toEqual([]);
    game.hasPackage = true;
    teleport(game, game.stage.start.x);
    run(game, 1);
    expect(game.cars).toEqual([]);
  });

  it('shoots the nearest crew member in the lane ahead and staggers a bruiser mid-windup', () => {
    const game = new SideGame();
    const bruiser = sparring(game, 'bruiser', 90);
    const behind = { ...bruiser, id: 501, kind: 'runner' as const, x: game.player.x - 60, hp: 3, maxHp: 3 };
    const otherLane = { ...bruiser, id: 502, kind: 'runner' as const, x: game.player.x + 40, y: game.player.y + 30, hp: 3, maxHp: 3 };
    game.enemies.push(behind, otherLane);
    game.ammo = CLIP;
    game.metDD = true;
    game.player.facing = 1;
    bruiser.state = 'windup';
    bruiser.timer = 5;
    game.queueShot();
    game.update(STEP);
    expect(game.ammo).toBe(CLIP - 1);
    expect(bruiser.hp).toBe(KINDS.bruiser.hp - 2);
    expect(bruiser.state).toBe('hurt');
    expect(behind.hp).toBe(3);
    expect(otherLane.hp).toBe(3);
    expect(game.wanted).toBe(true);
  });

  it('holds fire with an officer in the way, and has nothing to fire when empty', () => {
    const game = new SideGame();
    const runner = sparring(game, 'runner', 60);
    game.player.facing = 1;
    officer(game, 30);
    game.ammo = 3;
    game.queueShot();
    game.update(STEP);
    expect(game.ammo).toBe(3);
    expect(runner.hp).toBe(3);
    expect(game.message).toBe('NOT AT THE POLICE');
    game.police = [];
    game.ammo = 0;
    game.queueShot();
    game.update(STEP);
    expect(runner.hp).toBe(3);
  });

  it('sends a Swedish patrol after a shot, and an arrest takes the gun and costs a fine', () => {
    const game = new SideGame();
    onRoad(game);
    game.bmwTimer = 99;
    game.ammo = CLIP;
    game.metDD = true;
    game.queueShot();
    game.update(STEP);
    expect(game.dispatch).toBeCloseTo(3.5, 1);
    run(game, 3.6);
    expect(game.cars.some(c => c.kind === 'police')).toBe(true);
    expect(game.events).toContain('siren');
    for (let t = 0; t < 6 && !game.police.length; t += STEP) game.update(STEP);
    expect(game.police).toHaveLength(2);
    // Standing still, the courier gets caught.
    for (let t = 0; t < 10 && !game.fines; t += STEP) game.update(STEP);
    expect(game.fines).toBe(1);
    expect(game.ammo).toBe(0);
    expect(game.player.cuffTimer).toBeGreaterThan(0);
    run(game, 8);
    expect(game.wanted).toBe(false);
    expect(game.police).toEqual([]);
  });

  it('shoves officers over but never knocks them out, and the police give up in time', () => {
    const game = new SideGame();
    sparring(game, 'runner', 300);
    const o = officer(game, 24);
    game.player.facing = 1;
    for (let i = 0; i < 3; i++) { game.queueAttack(); run(game, 0.3); }
    expect(o.state).toBe('down');
    expect(o.gone).toBe(false);
    expect(game.heat).toBeGreaterThan(0);
    expect(game.koCount).toBe(0);
    // Out of reach, the chase winds down once nothing else happens.
    game.player.invulnerable = 99;
    run(game, GIVE_UP + 1);
    expect(game.message).toBe('THE POLICE LOST YOUR TRAIL');
    run(game, 4);
    expect(game.police).toEqual([]);
  });

  it('loses the police round the corner at a junction', () => {
    const game = new SideGame();
    game.start();
    game.hasPackage = true;
    clearStreets(game);
    teleport(game, direct.forkX);
    officer(game, -120);
    game.dispatch = 2;
    game.heat = 3;
    expect(game.interaction?.kind).toBe('turn');
    game.interact();
    expect(game.route).toBe('marcus');
    expect(game.police).toEqual([]);
    expect(game.wanted).toBe(false);
  });

  it('deducts fines from the final score', () => {
    const game = new SideGame();
    game.start('direct');
    game.hasPackage = true;
    clearStreets(game);
    game.fines = 2;
    teleport(game, game.stage.length - WIDTH * 0.5);
    game.update(STEP);
    for (const e of game.enemies) if (e.encounter === 100) e.hp = 0;
    game.update(STEP);
    teleport(game, game.stage.homeX, BAND_TOP + 4);
    game.update(STEP);
    expect(game.mode).toBe('victory');
    expect(game.score).toBe(Math.max(0, computeScore(game.elapsed, game.player.hp, game.koCount, game.continues) - 2 * FINE));
  });
});
