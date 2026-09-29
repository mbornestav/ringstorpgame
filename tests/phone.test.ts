import { describe, expect, it } from 'vitest';
import { CLIP, CREW_CASH, DD_CONTACT, DD_NUMBER, REFILL_PRICE, SideGame, STARTING_CASH } from '../src/side/game';

function advance(g: SideGame, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.025) g.update(0.025);
}
function start(): SideGame { const g = new SideGame(); g.start(); return g; }
function request(g: SideGame): void { g.metDD = true; g.openPhone(); g.callDD(); }
function onRoad(g: SideGame): void {
  const road = g.stage.surfaces.find(r => (r.value === 'road' || r.value === 'major') && r.x1 - r.x0 > 1400)!;
  g.player.x = (road.x0 + road.x1) / 2; g.camera = g.player.x - 192;
}

describe('Ericsson GH337 and paid D.D visits', () => {
  it('has no phone until D.D has pulled over and handed over the gun', () => {
    const g = start(); onRoad(g); g.hasPackage = true; g.bmwTimer = 0;
    for (const e of g.stage.encounters) g.encounters.set(e.id, 'cleared');
    g.enemies = [];
    g.openPhone(); expect(g.phoneOpen).toBe(false); expect(g.hasPhone).toBe(false);
    g.callDD(); expect(g.phoneCall).toBe('idle');
    for (let t = 0; t < 6 && !g.bmwInReach; t += 0.025) g.update(0.025);
    g.interact(); advance(g, 3);
    expect(g.metDD).toBe(true); expect(g.hasPhone).toBe(true);
    g.openPhone(); expect(g.phoneOpen).toBe(true);
  });

  it('auto-dials the supplied contact, with no charge until a confirmed purchase', () => {
    expect(DD_CONTACT).toBe('D.D'); expect(DD_NUMBER).toBe('042218626');
    const g = start(); request(g);
    expect(g.phoneCall).toBe('dialing');
    advance(g, 0.8); expect(g.phoneCall).toBe('ringing');
    advance(g, 1.3); expect(g.phoneCall).toBe('connected');
    expect(g.delivery?.state).toBe('coming');
    expect(g.cash).toBe(STARTING_CASH); expect(g.ammo).toBe(0);
  });

  it('summons him on foot before package pickup and waits for an explicit paid refill', () => {
    const g = start(); request(g); advance(g, 6);
    expect(g.hasPackage).toBe(false); expect(g.dealerNearby).toBe(true);
    expect(g.delivery?.carId).toBeNull(); expect(g.cars).toHaveLength(0);
    expect(g.ammo).toBe(0); expect(g.cash).toBe(STARTING_CASH);
    expect(g.buyAmmo()).toBe(true);
    expect(g.ammo).toBe(CLIP); expect(g.cash).toBe(STARTING_CASH - REFILL_PRICE);
    expect(g.metDD).toBe(true); expect(g.buyAmmo()).toBe(false);
    g.closePhone(); g.queueShot(); advance(g, 0.05);
    expect(g.ammo).toBe(CLIP - 1);
    expect(g.wanted).toBe(true);
  });

  it('brings the BMW automatically and cannot queue duplicate visits', () => {
    const g = start(); onRoad(g); request(g);
    for (let i = 0; i < 10; i++) { g.callDD(); advance(g, 0.5); }
    advance(g, 3);
    expect(g.dealerNearby).toBe(true);
    expect(g.cars.filter(c => c.kind === 'bmw')).toHaveLength(1);
    expect(g.delivery?.carId).toBe(g.cars[0].id);
    expect(g.cars[0].state).toBe('stopped');
    advance(g, 10);
    expect(g.cars[0].state).toBe('stopped');
    expect(g.ammo).toBe(0); expect(g.buyAmmo()).toBe(true);
    expect(g.cars[0].state).toBe('leaving');
  });

  it('reuses a passing BMW instead of spawning another D.D', () => {
    const g = start(); onRoad(g); g.hasPackage = true; g.bmwTimer = 0;
    g.update(0.025);
    const car = g.cars.find(c => c.kind === 'bmw')!;
    request(g); advance(g, 8);
    expect(g.cars.filter(c => c.kind === 'bmw')).toEqual([car]);
    expect(g.dealerNearby).toBe(true); expect(g.ammo).toBe(0);
  });

  it('pauses combat and clears buffered actions, but lets D.D arrive with the handset open', () => {
    const g = start();
    const enemy = g.enemies[0];
    enemy.state = 'windup'; enemy.timer = 0.05; enemy.x = g.player.x + 20; enemy.y = g.player.y;
    g.setMovement(1, 0); g.queueAttack(); g.queueShot();
    const x = g.player.x, hp = g.player.hp;
    request(g); advance(g, 7);
    expect(g.elapsed).toBe(0); expect(g.player.x).toBe(x); expect(g.player.hp).toBe(hp);
    expect(enemy.state).toBe('windup'); expect(g.dealerNearby).toBe(true);
    enemy.gone = true;
    g.closePhone(); g.update(0.025);
    expect(g.player.x).toBe(x); expect(g.player.attackTimer).toBe(0);
    expect(g.events).not.toContain('shot');
  });

  it('continues the call in your pocket, and cancels without taking payment', () => {
    const g = start(); request(g); g.closePhone(); advance(g, 7);
    expect(g.dealerNearby).toBe(true); expect(g.cash).toBe(STARTING_CASH);
    expect(g.buyAmmo()).toBe(false);
    g.dismissDD(); advance(g, 4);
    expect(g.delivery).toBeNull(); expect(g.ammo).toBe(0);
    request(g); advance(g, 0.2); g.dismissDD(); advance(g, 6);
    expect(g.phoneCall).toBe('idle'); expect(g.delivery).toBeNull();
    expect(g.cash).toBe(STARTING_CASH);
  });

  it('refuses payment for full ammo, insufficient cash, or a distant dealer', () => {
    const g = start(); request(g); advance(g, 6);
    g.ammo = CLIP;
    expect(g.canBuyAmmo).toBe(false); expect(g.buyAmmo()).toBe(false);
    expect(g.cash).toBe(STARTING_CASH);
    g.ammo = 2; g.cash = REFILL_PRICE - 1;
    expect(g.buyAmmo()).toBe(false); expect(g.ammo).toBe(2);
    g.cash = REFILL_PRICE; g.delivery!.x = g.player.x - 500;
    expect(g.buyAmmo()).toBe(false);
    advance(g, 4); expect(g.buyAmmo()).toBe(true);
    expect(g.cash).toBe(0); expect(g.ammo).toBe(CLIP);
  });

  it('follows a requested visit around a corner, retaining cash and ammo', () => {
    const g = start(); g.hasPackage = true;
    for (const e of g.stage.encounters) g.encounters.set(e.id, 'cleared');
    g.enemies = [];
    g.player.x = g.stage.forkX; g.camera = g.player.x - 192;
    request(g); advance(g, 2.2); g.closePhone();
    expect(g.interaction?.kind).toBe('turn'); g.interact();
    expect(g.route).toBe('marcus'); expect(g.delivery?.state).toBe('coming');
    g.openPhone(); advance(g, 8);
    expect(g.dealerNearby).toBe(true); expect(g.cash).toBe(STARTING_CASH);
  });

  it('pays each cleared crew once, keeps the wallet, and resets the phone for a new run', () => {
    const g = start();
    const crew = g.stage.encounters.find(e => !e.home)!;
    g.active = { ...crew, backup: [] }; g.encounters.set(crew.id, 'active');
    for (const e of g.enemies) if (e.encounter === crew.id) e.hp = 0;
    g.update(0.025); advance(g, 1);
    expect(g.cash).toBe(STARTING_CASH + CREW_CASH);
    request(g); advance(g, 6); expect(g.buyAmmo()).toBe(true);
    g.start(); expect(g.cash).toBe(STARTING_CASH + CREW_CASH - REFILL_PRICE); expect(g.ammo).toBe(0);
    expect(g.phoneOpen).toBe(false); expect(g.phoneCall).toBe('idle'); expect(g.delivery).toBeNull();
  });

  it('pauses an ongoing call when the game loses focus and disallows the phone after defeat', () => {
    const g = start(); request(g); g.togglePause(); advance(g, 5);
    expect(g.phoneOpen).toBe(false); expect(g.phoneCall).toBe('dialing');
    g.togglePause(); advance(g, 7); expect(g.dealerNearby).toBe(true);
    g.player.hp = 0; g.openPhone(); expect(g.phoneOpen).toBe(false);
    g.mode = 'defeat'; g.openPhone(); expect(g.phoneOpen).toBe(false);
  });

  it('keeps paid ammo and the wallet when continuing, and brings a pending visit to the checkpoint', () => {
    const g = start(); request(g); advance(g, 6); g.buyAmmo(); advance(g, 4);
    request(g); advance(g, 2.2); g.closePhone();
    g.checkpoint = 1000; g.player.hp = 0; g.mode = 'defeat';
    g.continueFromCheckpoint(); g.openPhone(); advance(g, 8);
    expect(g.player.x).toBe(1000); expect(g.dealerNearby).toBe(true);
    expect(g.ammo).toBe(CLIP); expect(g.cash).toBe(STARTING_CASH - REFILL_PRICE);
  });

  it('charges for subsequent roadside refills after the original free gift', () => {
    const g = start(); onRoad(g); g.hasPackage = true; g.metDD = true; g.bmwTimer = 0;
    for (const e of g.stage.encounters) g.encounters.set(e.id, 'cleared');
    g.enemies = [];
    for (let t = 0; t < 6 && !g.bmwInReach; t += 0.025) g.update(0.025);
    expect(g.interaction?.kind).toBe('hail'); g.interact(); advance(g, 2);
    expect(g.dealerNearby).toBe(true); expect(g.ammo).toBe(0); expect(g.cash).toBe(STARTING_CASH);
    g.openPhone(); expect(g.buyAmmo()).toBe(true);
    expect(g.cash).toBe(STARTING_CASH - REFILL_PRICE); expect(g.ammo).toBe(CLIP);
  });
});
