import { afterEach, describe, expect, it } from 'vitest';
import { Session } from '../src/play/session';
import { hudModel, panelModel, phoneModel, promptModel, worldHudModel } from '../src/play/ui/models';
import { SideGame } from '../src/side/game';
import { setLang } from '../src/side/i18n';
import { compileLevel, menuLevels, validateLevel } from '../src/side/levels';
import level from '../src/side/levels/karlstad.level';
import { BAND_TOP, WIDTH } from '../src/side/layout';
import { stageFor } from '../src/side/stage';

const frame = 1 / 60;
afterEach(() => setLang('en'));
const run = () => { const g = new SideGame(); g.startLevel(level); return g; };
function teleport(g: SideGame, x: number, y = BAND_TOP + 12): void {
  g.camera = Math.max(0, Math.min(g.stage.length - WIDTH, x - WIDTH * 0.4));
  g.player.x = x; g.player.y = y;
}
function collect(g: SideGame): void { teleport(g, g.stage.package.x, g.stage.package.y); g.update(frame); }
function clearStreets(g: SideGame): void {
  for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
  for (const e of g.enemies) { e.hp = 0; e.gone = true; }
}
function clearFinal(g: SideGame): void {
  clearStreets(g); teleport(g, g.stage.length - WIDTH / 2); g.update(frame);
  expect(g.active?.home).toBe(true);
  for (const e of g.enemies) if (e.encounter === g.active!.id) e.hp = 0;
  g.update(frame);
  expect(g.homeCrewDown).toBe(true);
  teleport(g, g.stage.homeX);
}

describe('Karlstad to Liljedal', () => {
  it('is listed, valid, much longer than the first run, and has distinct landmarks and 19 crews', () => {
    expect(validateLevel(level)).toEqual([]);
    expect(menuLevels()).toContain(level);
    const stage = compileLevel(level);
    expect(stage.length).toBeGreaterThan(stageFor('direct').length * 2);
    expect(stage.encounters).toHaveLength(19);
    expect(stage.facades.filter(f => f.landmark).map(f => f.landmark)).toEqual(expect.arrayContaining(['townhall', 'stonebridge', 'sandgrund', 'coffee', 'busstop']));
    expect(stage.facades.find(f => f.role === 'home')?.landmark).toBe('busstop');
  });

  it('fika needs the parcel and a clear street, heals once, and preserves the latest checkpoint', () => {
    const g = run(), stops = level.street.restStops!;
    teleport(g, stops[0].x); g.interact(); expect(g.checkpoint).toBeNull();
    collect(g); clearStreets(g); teleport(g, stops[0].x);
    g.active = g.stage.encounters[0];
    expect(g.interaction).toBeNull(); g.active = null;
    g.player.hp = 1; g.interact();
    expect(g.player.hp).toBe(g.player.maxHp); expect(g.checkpoint).toBe(stops[0].x);
    g.player.hp = 1; g.interact(); expect(g.player.hp).toBe(1);
    teleport(g, stops[2].x); g.interact();
    teleport(g, stops[1].x); g.interact();
    expect(g.checkpoint).toBe(stops[2].x); expect(g.rested.size).toBe(3);
    g.mode = 'defeat'; g.continueFromCheckpoint();
    expect(g.player.x).toBe(stops[2].x); expect(g.player.hp).toBe(g.player.maxHp);
    expect(g.hasPackage).toBe(true); expect(g.continues).toBe(1);
    expect(g.encounterState(1)).toBe('cleared');
  });

  it('every crew gates its screen and the home crew still requires an explicit bus interaction', () => {
    const g = run(); collect(g);
    for (const crew of g.stage.encounters) {
      teleport(g, crew.camera + WIDTH * 0.4);
      g.update(frame); expect(g.active?.id).toBe(crew.id);
      // Finish all initial members and any timed backup, then let the rules unlock the screen.
      for (let i = 0; i < 200 && g.active; i++) {
        for (const e of g.enemies) if (e.encounter === crew.id) e.hp = 0;
        g.update(0.05);
      }
      expect(g.encounterState(crew.id)).toBe('cleared');
    }
    teleport(g, g.stage.homeX); g.update(frame);
    expect(g.mode).toBe('playing'); expect(g.busRide).toBeNull();
    expect(g.interaction?.kind).toBe('bus');
  });

  it('cannot board before clearing the final fight or away from the stop', () => {
    const g = run(); collect(g); clearStreets(g);
    teleport(g, g.stage.homeX); g.interact(); expect(g.busRide).toBeNull();
    clearFinal(g);
    g.player.y = 240; g.interact(); expect(g.busRide).toBeNull();
    g.player.y = BAND_TOP + 12; g.interact(); expect(g.busRide).toBe(0);
  });

  it('rides the yellow bus, respects pause, and only wins after arriving at the cabin', () => {
    const g = run(); collect(g); clearFinal(g); g.metDD = true; g.interact();
    const s = new Session(g, true);
    expect(g.hasPhone).toBe(false); expect(g.interaction).toBeNull();
    expect(hudModel(s).visible).toBe(false); expect(worldHudModel(s).arrows).toEqual([]);
    expect(promptModel(s)).toBeNull();
    g.togglePause(); g.update(0.05); expect(g.busRide).toBe(0); g.togglePause();
    for (let i = 0; i < 120; i++) g.update(0.05);
    expect(g.mode).toBe('playing'); expect(g.busRide).toBeCloseTo(6);
    for (let i = 0; i < 65; i++) g.update(0.05);
    expect(g.mode).toBe('victory'); expect(g.busRide).toBe(9);
    expect(g.events.filter(e => e === 'victory')).toHaveLength(1);
    const result = panelModel(s)!;
    expect(result.scenic).toBe(true); expect(result.title).toContain('LILJEDAL');
    expect(result.body).not.toContain('Ringstorpsvägen');
    s.dispatch('restart'); expect(g.custom).toBe(level); expect(g.busRide).toBeNull(); expect(g.rested.size).toBe(0);
    expect(g.checkpoint).toBeNull(); expect(g.hasPackage).toBe(false);
    s.dispatch('menu'); s.dispatch('start'); expect(g.custom).toBeNull();
  });

  it('uses Karlstad objectives and Swedish checkpoint and arrival copy', () => {
    setLang('sv'); const g = run(), s = new Session(g, true);
    expect(hudModel(s).objective.steps.map(x => x.title).join(' ')).not.toMatch(/Marcus|Kurir|Pålsjö/);
    collect(g); clearStreets(g); teleport(g, level.street.restStops![0].x); g.interact(); g.mode = 'defeat';
    const defeat = panelModel(s)!;
    expect(defeat.body).toContain('fikapaus'); expect(defeat.actions[0].label).toContain('FIKAPAUSEN');
    g.continueFromCheckpoint(); clearFinal(g); g.interact();
    for (let i = 0; i < 185; i++) g.update(0.05);
    expect(panelModel(s)?.title).toBe('HEMMA I LILJEDAL');
  });

  it('a taxi from the phone takes the courier (and the parcel) to the bus station from anywhere', () => {
    const g = run();
    // Before D.D has given his number, the phone is still there: for the taxi.
    expect(g.metDD).toBe(false);
    expect(g.hasPhone).toBe(true); expect(g.canTaxi).toBe(true);
    const cash = g.cash;
    g.openPhone(); g.callTaxi();
    expect(g.phoneOpen).toBe(false); expect(g.taxi?.state).toBe('coming'); expect(g.hasPhone).toBe(false);
    for (let i = 0; i < 60 * 6 && g.taxi?.state === 'coming'; i++) g.update(frame);
    expect(g.taxi?.state).toBe('boarding');
    for (let i = 0; i < 60 && g.taxi?.state === 'boarding'; i++) g.update(frame);
    expect(g.taxi?.state).toBe('riding');
    expect(g.objective).toBe('By taxi · to the bus station');
    // Riding: the streets, their crews and the last crew at the stop are left behind; the parcel comes along.
    expect(g.enemies).toHaveLength(0); expect(g.hasPackage).toBe(true); expect(g.homeCrewDown).toBe(true);
    for (let i = 0; i < 60 * 7 && g.taxi?.state === 'riding'; i++) g.update(frame);
    expect(g.taxi?.state).toBe('arriving');
    expect(g.player.x).toBeGreaterThan(g.stage.homeX - 40);
    expect(g.cash).toBe(cash - Math.min(cash, 100));
    // Out beside the yellow bus: E boards it, and the ride home to Liljedal follows.
    expect(g.interaction?.kind).toBe('bus');
    g.interact();
    expect(g.busRide).toBe(0);
    for (let i = 0; i < 60 * 10; i++) g.update(frame);
    expect(g.mode).toBe('victory');
  });

  it('takes no taxi when already at the bus station, and the taxi goes away after a knockout', () => {
    const g = run();
    teleport(g, g.stage.homeX - 100);
    expect(g.canTaxi).toBe(false);
    const h = run();
    h.callTaxi(); h.mode = 'defeat'; h.checkpoint = 100;
    h.continueFromCheckpoint();
    expect(h.taxi).toBeNull(); expect(h.canTaxi).toBe(true);
  });

  it('shows the taxi button on the phone in Karlstad, with the taxi on the handset before D.D', () => {
    const session = new Session(new SideGame());
    session.game.startLevel(level);
    session.dispatch('phone', 'key');
    const m = phoneModel({ game: session.game, phoneReceipt: false, muted: false, titleView: 'main' } as never);
    expect(m.taxi).toMatchObject({ visible: true, disabled: false });
    expect(m.lcd.contact).toBe('TAXI'); expect(m.action.disabled).toBe(true);
    expect(session.available('phone-call')).toBe(false);
    expect(session.dispatch('phone-taxi', 'key')).toBe(true);
    expect(session.game.taxi?.state).toBe('coming');
  });
});

