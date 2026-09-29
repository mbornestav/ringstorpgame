import { afterEach, describe, expect, it } from 'vitest';
import type { UiAction } from '../src/play/actions';
import { Session } from '../src/play/session';
import {
  controlsModel, footerModel, hudModel, mastheadModel, panelModel, phoneModel, promptModel, worldHudModel,
  type PanelKind, type UiContext,
} from '../src/play/ui/models';
import { MAP_ATTRIBUTION } from '../src/map';
import { CLIP, DD_NUMBER, FINE, REFILL_PRICE, SideGame, type Car, type SideEnemy } from '../src/side/game';
import { GODS_DOOR_X } from '../src/side/gods-stage';
import { HEIST } from '../src/side/heist-config';
import { OUT } from '../src/side/heist-stages';
import { setLang, t, type Key } from '../src/side/i18n';
import { BAND_TOP, WIDTH } from '../src/side/layout';
import { TRUCK_Y } from '../src/side/yard';

afterEach(() => setLang('en'));

const ctx = (game: SideGame, extra: Partial<UiContext> = {}): UiContext => ({ game, titleView: 'main', phoneReceipt: false, muted: false, ...extra });

function advance(g: SideGame, seconds: number): void { for (let s = 0; s < seconds; s += 0.025) g.update(0.025); }
function until(g: SideGame, done: () => boolean, max = 10): void {
  for (let s = 0; s < max && !done(); s += 0.025) g.update(0.025);
  expect(done()).toBe(true);
}
function level1(route: Parameters<SideGame['start']>[0] = 'direct'): SideGame { const g = new SideGame(); g.start(route); return g; }
function gods(): SideGame { const g = new SideGame(); g.startGods(); return g; }
function heist(): SideGame { const g = new SideGame(); g.random = () => 0.5; g.startHeist(); return g; }
/** Puts the courier somewhere on the stage, with the camera where walking there would leave it. */
function teleport(g: SideGame, x: number, y = 214): void {
  g.camera = Math.max(0, Math.min(g.stage.length - WIDTH, x - WIDTH * 0.4));
  g.player.x = x; g.player.y = y;
}
function clearStreets(g: SideGame): void {
  for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
  for (const e of g.enemies) { e.hp = 0; e.gone = true; }
}
/** Lands in the truck yard with no patrols, as the Kapell Job tests do. */
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
function bmw(x: number, dir: 1 | -1 = 1): Car {
  return { id: 900, kind: 'bmw', x, y: 244, dir, speed: 100, state: 'driving', timer: 0, stopAt: null, wheel: 0, handed: false };
}

describe('panel models', () => {
  const variants: Array<{ name: string; kind: PanelKind; ids: UiAction[]; stats: Key[]; make: () => UiContext }> = [
    { name: 'the title screen', kind: 'title', ids: ['start', 'start-2', 'start-3'], stats: [], make: () => ctx(new SideGame()) },
    { name: 'the Gods briefing', kind: 'gods-briefing', ids: ['answer', 'back'], stats: [], make: () => ctx(new SideGame(), { titleView: 'gods' }) },
    { name: 'the heist briefing', kind: 'heist-briefing', ids: ['answer-3', 'back'], stats: [], make: () => ctx(new SideGame(), { titleView: 'heist' }) },
    { name: 'the pause card', kind: 'pause', ids: ['resume', 'restart'], stats: [], make: () => { const g = level1(); g.togglePause(); return ctx(g); } },
    {
      name: 'the Level 1 victory', kind: 'victory-1', ids: ['restart'], stats: ['win.time', 'win.crews', 'win.score'],
      make: () => { const g = level1(); g.mode = 'victory'; return ctx(g); },
    },
    {
      name: 'the Level 2 victory', kind: 'victory-2', ids: ['restart', 'menu'], stats: ['win.time', 'win2.pay', 'win2.cash'],
      make: () => { const g = gods(); g.mode = 'victory'; return ctx(g); },
    },
    {
      name: 'the Level 3 victory', kind: 'victory-3', ids: ['restart', 'menu'], stats: ['win.time', 'win3.crates', 'win3.pay'],
      make: () => { const g = heist(); g.mode = 'victory'; return ctx(g); },
    },
    {
      name: 'the Level 1 defeat with a checkpoint', kind: 'defeat-1', ids: ['continue', 'restart'], stats: ['win.time', 'lose.package', 'win.crews'],
      make: () => { const g = level1(); g.mode = 'defeat'; g.checkpoint = 1000; return ctx(g); },
    },
    {
      name: 'the Level 1 defeat without one', kind: 'defeat-1', ids: ['restart'], stats: ['win.time', 'lose.package', 'win.crews'],
      make: () => { const g = level1(); g.mode = 'defeat'; return ctx(g); },
    },
    {
      name: 'the Level 3 wreck', kind: 'defeat-3', ids: ['restart', 'menu'], stats: ['win.time', 'lose3.crates', 'lose3.fine'],
      make: () => { const g = heist(); g.mode = 'defeat'; g.heist.failure = 'wrecked'; return ctx(g); },
    },
    {
      name: 'the Level 3 arrest', kind: 'defeat-3', ids: ['restart', 'menu'], stats: ['win.time', 'lose3.crates', 'lose3.fine'],
      make: () => { const g = heist(); g.mode = 'defeat'; g.heist.failure = 'busted'; return ctx(g); },
    },
  ];

  it('is empty while the game is being played', () => {
    expect(panelModel(ctx(level1()))).toBeNull();
    expect(panelModel(ctx(gods()))).toBeNull();
  });

  for (const lang of ['en', 'sv'] as const) {
    for (const v of variants) {
      it(`shows ${v.name} in ${lang === 'en' ? 'English' : 'Swedish'} with its buttons and stats`, () => {
        setLang(lang);
        const panel = panelModel(v.make())!;
        expect(panel.kind).toBe(v.kind);
        expect(panel.actions.map(a => a.id)).toEqual(v.ids);
        expect(panel.actions[0].kind).toBe('primary');
        expect(panel.actions.slice(1).every(a => a.kind === 'secondary')).toBe(true);
        expect(panel.stats.map(s => s.label)).toEqual(v.stats.map(k => t(k)));
        expect(panel.eyebrow).not.toBe('');
        expect(panel.title).not.toBe('');
        // The DOM's markup must not leak into what the widgets draw.
        expect(JSON.stringify(panel)).not.toMatch(/<[a-z/]|&nbsp;|&amp;/i);
      });
    }
  }

  it('gives every panel a key that follows the language and what is shown', () => {
    for (const v of variants) {
      const context = v.make();
      const english = panelModel(context)!.key;
      expect(panelModel(context)!.key, v.name).toBe(english);
      setLang('sv');
      expect(panelModel(context)!.key, v.name).not.toBe(english);
      setLang('en');
    }
    const g = level1(); g.mode = 'victory';
    const before = panelModel(ctx(g))!.key;
    g.elapsed = 61;
    expect(panelModel(ctx(g))!.key).not.toBe(before);
  });

  it('lays out the title screen: badge, story, the start button and the two level picks', () => {
    const panel = panelModel(ctx(new SideGame()))!;
    expect(panel).toMatchObject({ chip: '01', eyebrowExtra: '1994', title: 'RINGSTORP RUN', titleAccent: null, body: t('title.story'), hint: t('title.hint') });
    expect(panel.actions.map(a => [a.label, a.lead, a.sub])).toEqual([
      ['START RUN', '▶', undefined],
      ['LEVEL 2 · GODS RUN', '▶', 'SNEAK PAST THE POLICE · NO FIGHTING'],
      ['LEVEL 3 · THE KAPELL JOB', '▶', 'HARDCORE · YOU ARE D.D · ONE ARREST ENDS IT'],
    ]);
    expect(panel.controls).toEqual([
      { keys: ['WASD', '↑↓←→'], label: 'WALK · STEP' }, { keys: ['SPACE'], label: 'JUMP · J IN AIR KICKS' },
      { keys: ['J'], label: 'PUNCH · COMBO' }, { keys: ['K'], label: 'DODGE' },
    ]);
    setLang('sv');
    expect(panelModel(ctx(new SideGame()))!.actions[0].label).toBe('STARTA');
  });

  it('makes the briefings answerable: D.D portrait, three points, the answer button focused', () => {
    const gods = panelModel(ctx(new SideGame(), { titleView: 'gods' }))!;
    expect(gods).toMatchObject({ chip: '02', titleAccent: 'blink', portrait: { name: 'D.D', caption: DD_NUMBER }, initialFocus: 'answer', hint: t('brief.hint') });
    expect(gods.bullets).toEqual([t('brief.one'), t('brief.two'), t('brief.three')]);
    expect(gods.actions.map(a => [a.label, a.lead])).toEqual([['ANSWER THE CALL', '▶'], ['BACK', null]]);
    const job = panelModel(ctx(new SideGame(), { titleView: 'heist' }))!;
    expect(job).toMatchObject({ chip: '03', title: t('brief3.title'), portrait: { name: 'D.D', caption: t('brief3.you') }, initialFocus: 'answer-3' });
    expect(job.bullets).toEqual([t('brief3.one'), t('brief3.two'), t('brief3.three')]);
    expect(job.actions.map(a => a.label)).toEqual(['TAKE THE WHEEL', 'BACK']);
  });

  it('pauses with a blinking cursor and a way to restart', () => {
    const g = level1(); g.togglePause();
    const panel = panelModel(ctx(g))!;
    expect(panel).toMatchObject({ title: 'PAUSED', titleAccent: 'blink', hint: 'ESC TO RESUME' });
    expect(panel.actions.map(a => [a.id, a.lead])).toEqual([['resume', '▶'], ['restart', '↻']]);
  });

  it('tells the Level 1 story from what happened on the run', () => {
    const g = level1(); g.mode = 'victory'; g.koCount = 6; g.score = 42;
    const plainRun = panelModel(ctx(g))!;
    expect(plainRun.body).toBe('The package made it home.');
    expect(plainRun).toMatchObject({ titleAccent: 'gold', hint: 'PRESS ENTER TO REPLAY' });
    expect(plainRun.stats.map(s => s.value)).toEqual(['00:00', '6', '00042']);
    g.healed = true; g.shopHealed = true; g.metDD = true; g.fines = 1; g.elapsed = 125;
    const full = panelModel(ctx(g))!;
    expect(full.body).toBe(`The package made it home, with a patch-up at Marcus A and supplies from Kurir Livs. D.D had your back, but the police fined you ${FINE} points.`);
    expect(full.stats[0].value).toBe('02:05');
    g.healed = false;
    expect(panelModel(ctx(g))!.body).toContain(', with supplies from Kurir Livs');
  });

  it('reports the Gods delivery with its payout, times spotted and cash', () => {
    const g = gods(); g.mode = 'victory'; g.elapsed = 65;
    g.gods.payout = 400; g.gods.assignment = 2; g.gods.spotted = 0; g.cash = 640;
    const calm = panelModel(ctx(g))!;
    expect(calm.body).toBe('D.D pays 400 kr for assignment 2. The police never got their hands on the Gods.');
    expect(calm.stats.map(s => s.value)).toEqual(['01:05', '400 KR', '640 KR']);
    expect(calm.actions.map(a => [a.id, a.label, a.lead])).toEqual([['restart', 'NEXT ASSIGNMENT', '▶'], ['menu', 'TITLE', null]]);
    g.gods.spotted = 2;
    expect(panelModel(ctx(g))!.body).toContain(', though you were spotted 2 time(s).');
  });

  it('reports the Kapell Job with its crates, dents and payout', () => {
    const g = heist(); g.mode = 'victory';
    g.heist.delivered = 3; g.heist.payout = 280; g.heist.damageTaken = 0;
    const clean = panelModel(ctx(g))!;
    expect(clean.body).toBe('The Taunus made it back with 3 crates. D.D and Goran split 280 kr, and nobody saw a thing.');
    expect(clean.stats.map(s => s.value)).toEqual(['00:00', '3', '280 KR']);
    expect(clean.actions.map(a => [a.label, a.lead])).toEqual([['ANOTHER JOB', '↻'], ['TITLE', null]]);
    g.heist.damageTaken = 2;
    expect(panelModel(ctx(g))!.body).toContain('3 crates, dented 2 time(s).');
  });

  it('explains a lost Level 1 run, and offers the checkpoint only if there is one', () => {
    const g = level1(); g.mode = 'defeat'; g.koCount = 4;
    const over = panelModel(ctx(g))!;
    expect(over).toMatchObject({ titleAccent: 'red', body: t('lose.nocheckpoint'), hint: 'PRESS ENTER TO RETRY' });
    expect(over.stats.map(s => s.value)).toEqual(['00:00', 'AT KIOSK', '4']);
    expect(over.actions.map(a => [a.id, a.label, a.lead])).toEqual([['restart', 'TRY AGAIN', '↻']]);
    g.checkpoint = 1200; g.hasPackage = true;
    const resumed = panelModel(ctx(g))!;
    expect(resumed).toMatchObject({ body: t('lose.checkpoint'), hint: null });
    expect(resumed.stats[1].value).toBe('CARRIED');
    expect(resumed.actions.map(a => [a.id, a.label, a.lead, a.kind])).toEqual([
      ['continue', 'CONTINUE FROM MARCUS A', '✚', 'primary'], ['restart', 'START OVER', '↻', 'secondary'],
    ]);
  });

  it('reads the Level 3 failure out of the heist: title, text and fine', () => {
    const g = heist(); g.mode = 'defeat'; g.heist.fine = HEIST.fine; g.heist.damageTaken = 0;
    const cases: Array<[NonNullable<typeof g.heist.failure> | null, Key]> = [
      ['wrecked', 'lose3.wrecked'], ['busted', 'lose3.busted'], ['goran', 'lose3.busted'], ['arrested', 'lose3.busted'], [null, 'lose3.busted'],
    ];
    for (const [failure, title] of cases) {
      g.heist.failure = failure;
      const panel = panelModel(ctx(g))!;
      expect(panel.title, String(failure)).toBe(t(title));
      expect(panel.titleAccent).toBe('red');
      expect(panel.body, String(failure)).toBe(t(`lose3.${failure ?? 'busted'}.text` as Key, { fine: HEIST.fine }));
      expect(panel.stats[2].value).toBe(`${HEIST.fine} KR`);
    }
    expect(panelModel(ctx(g))!.hint).toBe(t('lose3.hint'));
  });
});

describe('HUD model', () => {
  it('hides the cards on the title screen and shows the level being offered', () => {
    const hud = hudModel(ctx(new SideGame()));
    expect(hud.visible).toBe(false);
    expect(hud.streetLine).toBe('PÅLSJÖ KIOSK → RINGSTORPSVÄGEN 55B');
    expect(hud.levelLine).toBe(t('top.level1'));
    expect(hudModel(ctx(new SideGame(), { titleView: 'gods' })).levelLine).toBe(t('top.level2'));
    expect(hudModel(ctx(new SideGame(), { titleView: 'heist' })).levelLine).toBe(t('top.level3'));
    expect(hudModel(ctx(gods())).levelLine).toBe(t('top.level2'));
    expect(hudModel(ctx(heist())).levelLine).toBe(t('top.level3'));
  });

  it('shows Level 1 health, ammunition and the call-D.D nudge', () => {
    const g = level1(); g.player.hp = 3;
    const fresh = hudModel(ctx(g));
    expect(fresh.visible).toBe(true);
    expect(fresh.life).toMatchObject({ kind: 'health', label: t('hud.health'), hearts: { filled: 3, max: 5, aria: '3 of 5 health' }, ammo: null });
    g.ammo = 3;
    const armed = hudModel(ctx(g)).life;
    expect(armed.kind === 'health' && armed.ammo).toEqual({ keyLabel: 'I', rounds: { filled: 3, max: CLIP }, aria: t('hud.rounds', { n: 3 }), callHint: null });
    g.ammo = 0; g.metDD = true;
    const empty = hudModel(ctx(g)).life;
    expect(empty.kind === 'health' && empty.ammo).toMatchObject({ rounds: { filled: 0, max: CLIP }, callHint: 'F · CALL D.D' });
    setLang('sv');
    const swedish = hudModel(ctx(g)).life;
    expect(swedish.kind === 'health' && swedish.hearts.aria).toBe('3 av 5 hälsa');
  });

  it('steps through Level 1: package, the two optional stops, home', () => {
    const g = level1();
    const steps = () => hudModel(ctx(g)).objective.steps.map(s => `${s.state}|${s.icon}`);
    expect(steps()).toEqual(['active|?', 'optional|✚', 'optional|✚', '|★']);
    expect(hudModel(ctx(g)).objective.steps.map(s => s.title)).toEqual([t('step.package'), 'Marcus A · Långåkersgatan 4', 'Kurir Livs · Kurirgatan 1', t('step.home')]);
    g.hasPackage = true;
    expect(steps()).toEqual(['done|✓', 'optional|✚', 'optional|✚', 'active|★']);
    g.mode = 'victory';
    expect(steps()[3]).toBe('done|★');

    const long = level1('marcus'); long.hasPackage = true;
    const longSteps = () => hudModel(ctx(long)).objective.steps.map(s => `${s.state}|${s.icon}`);
    expect(long.marcusAhead).toBe(true);
    expect(longSteps()).toEqual(['done|✓', 'active|✚', 'optional|✚', '|★']);
    long.healed = true;
    expect(longSteps()).toEqual(['done|✓', 'done|✓', 'optional|✚', 'active|★']);

    const shop = level1('kurir'); shop.hasPackage = true;
    expect(hudModel(ctx(shop)).objective.steps[2]).toMatchObject({ state: 'active', icon: '✚' });
    shop.shopHealed = true;
    expect(hudModel(ctx(shop)).objective.steps[2]).toMatchObject({ state: 'done', icon: '✓' });
  });

  it('scores Level 1 by crews, package and patch-up, less fines, never below zero', () => {
    const g = level1();
    expect(hudModel(ctx(g)).score.value).toBe('00000');
    g.koCount = 3; g.hasPackage = true; g.healed = true;
    expect(hudModel(ctx(g)).score.value).toBe(String(3 * 85 + 500 + 250).padStart(5, '0'));
    g.fines = 1;
    expect(hudModel(ctx(g)).score.value).toBe(String(3 * 85 + 500 + 250 - FINE).padStart(5, '0'));
    g.fines = 5;
    expect(hudModel(ctx(g)).score.value).toBe('00000');
    g.elapsed = 754.9;
    expect(hudModel(ctx(g)).score.time).toBe('12:34');
    g.bestScore = 987;
    expect(hudModel(ctx(g)).best).toBe('00987');
    expect(hudModel(ctx(g)).objective).toMatchObject({ label: t('hud.objective'), text: g.objective });
    expect(hudModel(ctx(g)).score.label).toBe(t('hud.score'));
  });

  it('names the street and the distance home', () => {
    const g = level1();
    const toHome = () => t('hud.toHome', { m: Math.round(g.metresToHome) });
    expect(hudModel(ctx(g)).streetLine).toBe(`${(g.street ?? 'PÅLSJÖ KIOSK').toUpperCase()} · ${toHome()}`);
    expect(hudModel(ctx(g)).objective.routeName).toBe('Johan Banérs gata');
    expect(hudModel(ctx(level1('marcus'))).objective.routeName).toBe('Via Marcus A');
    g.hasPackage = true; teleport(g, g.stage.homeX - 100);
    expect(hudModel(ctx(g)).streetLine.startsWith((g.street ?? 'RINGSTORPSVÄGEN 55B').toUpperCase())).toBe(true);
  });

  it('shows the Gods cargo, sneaking and the three checkpoints of the walk home', () => {
    const g = gods();
    const life = () => hudModel(ctx(g)).life;
    expect(life()).toMatchObject({ kind: 'cargo', label: t('hud.cargo'), cargo: 'none', hidden: false, status: t('cargo.none'), sneak: null });
    g.gods.cargo = 'carried'; g.setSneak(true);
    expect(life()).toMatchObject({ cargo: 'carried', status: t('cargo.carried'), sneak: t('cargo.sneak') });
    g.gods.hidden = true;
    expect(life()).toMatchObject({ hidden: true, status: t('cargo.hidden'), sneak: null });
    g.gods.cargo = 'stashed'; g.gods.hidden = false;
    expect(life()).toMatchObject({ status: t('cargo.stashed') });

    const steps = () => hudModel(ctx(g)).objective.steps.map(s => `${s.state}|${s.icon}`);
    expect(steps()).toEqual(['active|?', '|✚', '|✚', '|★']);
    g.gods.received = true;
    const shop = g.stage.shopX ?? 0, school = g.stage.facades.find(f => f.role === 'school')!.x1;
    g.player.x = shop - 10;
    expect(steps()).toEqual(['done|✓', 'active|✚', '|✚', '|★']);
    g.player.x = shop + 401;
    expect(steps()).toEqual(['done|✓', 'done|✓', '|✚', '|★']);
    g.player.x = school + 1;
    expect(steps()).toEqual(['done|✓', 'done|✓', 'done|✓', '|★']);
    g.gods.scene = 'lobby';
    expect(steps()).toEqual(['done|✓', 'active|✓', '|✓', '|★']);
    g.mode = 'victory';
    expect(steps()[3]).toBe('done|★');
    expect(hudModel(ctx(g)).objective.routeName).toBe('Kurirgatan → Ringstorpsvägen');
  });

  it('shows the Gods score as cash and the lift as the street line', () => {
    const g = gods(); g.cash = 240;
    const hud = () => hudModel(ctx(g));
    expect(hud().score.value).toBe('00240');
    g.player.x = 1500;
    expect(hud().streetLine).toBe(`${(g.street ?? 'Kurirgatan').toUpperCase()} · ${t('hud.toHome', { m: Math.round(g.metresToHome) })}`);
    g.gods.scene = 'cabin'; g.gods.floor = 0;
    expect(hud().streetLine).toBe(`KURIRGATAN 28 · ${t('cabin.floor')} ${t('cabin.ground')}`);
    g.gods.floor = 8;
    expect(hud().streetLine).toBe(`KURIRGATAN 28 · ${t('cabin.floor')} 8`);
  });

  it('follows the Kapell Job from pickup to home, including the Statoil landmark', () => {
    const g = heist();
    const steps = () => hudModel(ctx(g)).objective.steps.map(s => `${s.state}|${s.icon}`);
    expect(steps()).toEqual(['active|?', '|✚', '|✚', '|★']);
    g.heist.phase = 'out'; g.player.x = 4900;
    expect(steps()).toEqual(['done|✓', 'active|✚', '|✚', '|★']);
    g.player.x = 4901;
    expect(steps()).toEqual(['done|✓', 'done|✓', '|✚', '|★']);
    g.heist.phase = 'yard';
    expect(steps()).toEqual(['done|✓', 'done|✓', 'active|✚', '|★']);
    g.heist.phase = 'back';
    expect(steps()).toEqual(['done|✓', 'done|✓', 'done|✓', 'active|★']);
    g.heist.phase = 'done'; g.mode = 'victory';
    expect(steps()).toEqual(['done|✓', 'done|✓', 'done|✓', 'done|★']);
    expect(hudModel(ctx(g)).objective.steps.map(s => s.title)).toEqual([t('step3.pickup'), t('step3.statoil'), t('step3.yard'), t('step3.home')]);
    expect(hudModel(ctx(g)).objective.routeName).toBe('Kurirgatan → Industrivägen');
  });

  it('shows the load, the car and the yard noise on Level 3', () => {
    const g = heist();
    g.heist.drive!.damage = 1;
    const life = () => hudModel(ctx(g)).life;
    expect(life()).toEqual({
      kind: 'load', label: t('hud.load'), crates: t('h.crates', { n: 0, max: HEIST.trunk }), carrying: null,
      car: { label: t('h.car'), filled: HEIST.wreckAt - 1, max: HEIST.wreckAt }, noise: null,
    });
    g.heist.phase = 'yard'; g.heist.yard.trunk = 3; g.heist.yard.carry = 2; g.heist.yard.noiseEvents = 4;
    expect(life()).toMatchObject({
      crates: t('h.crates', { n: 3, max: HEIST.trunk }), carrying: t('h.carrying', { n: 2 }),
      noise: { label: t('h.noise'), filled: 3, max: 5 },
    });
    g.heist.drive!.damage = 9;
    expect(life()).toMatchObject({ car: { filled: 0, max: HEIST.wreckAt } });
  });

  it('shows cash as the Level 3 score and only counts the way home while driving', () => {
    const g = heist(); g.cash = 75;
    expect(hudModel(ctx(g)).score.value).toBe('00075');
    expect(hudModel(ctx(g)).streetLine).toBe(`${(g.street ?? 'Kurirgatan').toUpperCase()} · ${t('hud.toHome', { m: Math.round(g.metresToHome) })}`);
    g.heist.phase = 'yard';
    expect(hudModel(ctx(g)).streetLine).toBe((g.street ?? 'Kurirgatan').toUpperCase());
  });

  it('has a key that changes with the language and with any visible change, but not between identical frames', () => {
    const g = level1();
    const key = hudModel(ctx(g)).key;
    expect(hudModel(ctx(g)).key).toBe(key);
    g.elapsed = 0.9;
    expect(hudModel(ctx(g)).key).toBe(key);
    g.elapsed = 1.1;
    expect(hudModel(ctx(g)).key).not.toBe(key);
    const english = hudModel(ctx(g)).key;
    setLang('sv');
    expect(hudModel(ctx(g)).key).not.toBe(english);
  });
});

describe('street choice prompt', () => {
  it('is empty when there is nothing to choose, or the game is not being played', () => {
    const g = level1(); clearStreets(g);
    expect(promptModel(ctx(g))).toBeNull();
    expect(promptModel(ctx(new SideGame()))).toBeNull();
    g.togglePause();
    expect(promptModel(ctx(g))).toBeNull();
    expect(promptModel(ctx(heist()))).toBeNull();
    const street = gods(); street.player.x = 2000;
    expect(promptModel(ctx(street))).toBeNull();
  });

  it('shows a Level 2 action with the state of the Gods, always enabled', () => {
    const g = gods(); g.player.x = GODS_DOOR_X; g.player.y = 200;
    const action = g.interaction!;
    expect(action.label).toBe(t('act2.enter'));
    expect(promptModel(ctx(g))).toMatchObject({
      id: 'interact', small: t('choice2.small'), title: action.label, sub: t('cargo.none'),
      button: { label: t('choice2.use'), keyLabel: 'E', aria: action.label, enabled: true },
    });
  });

  it('shows a Level 3 action with the crates in the boot', () => {
    const g = inYard();
    const tr = g.heist.yard.trucks[0];
    g.player.x = tr.x - 24; g.player.y = TRUCK_Y + 20; g.camera = g.player.x - 190;
    expect(g.interaction?.kind).toBe('cut');
    expect(promptModel(ctx(g))).toMatchObject({
      small: t('top.level3'), title: t('act3.cut'), sub: t('h.crates', { n: 0, max: HEIST.trunk }),
      button: { label: t('choice2.use'), aria: t('act3.cut'), enabled: true },
    });
  });

  it('offers D.D\'s refill once he arrives, enabled only when E can open the phone', () => {
    const g = level1();
    g.metDD = true; g.openPhone(); g.callDD(); advance(g, 6);
    expect(g.dealerNearby).toBe(true);
    const talk = { label: t('choice.talk'), keyLabel: 'E', aria: t('choice.ddAria') };
    expect(promptModel(ctx(g))).toMatchObject({
      small: t('choice.ddSmall'), title: t('choice.ddTitle', { clip: CLIP, price: REFILL_PRICE }),
      sub: t('choice.ddHint', { cash: g.cash }), button: { ...talk, enabled: false },
    });
    g.closePhone();
    expect(promptModel(ctx(g))!.button).toEqual({ ...talk, enabled: true });
  });

  it('shows the blue BMW as too far, then wavable, from either direction', () => {
    const g = level1(); clearStreets(g);
    teleport(g, 100); g.camera = 0; g.hasPackage = true;
    g.cars = [bmw(480)];
    expect(promptModel(ctx(g))).toMatchObject({
      small: t('choice.bmwFrom'), title: t('choice.bmwTitle'), sub: t('choice.bmwFar'),
      button: { label: t('choice.wave'), aria: t('choice.bmwAria'), enabled: false },
    });
    g.cars = [bmw(200, -1)];
    expect(g.interaction?.kind).toBe('hail');
    expect(promptModel(ctx(g))).toMatchObject({ small: t('choice.bmwTowards'), sub: t('choice.bmwNear'), button: { enabled: true } });
    g.cars = [{ ...bmw(200), handed: true }];
    expect(promptModel(ctx(g))).toBeNull();
  });

  it('describes the junction ahead, and enables the turn only when close enough', () => {
    const g = level1(); clearStreets(g); g.hasPackage = true;
    const junction = g.stage.junctions[0];
    teleport(g, junction.x - 100);
    expect(g.interaction).toBeNull();
    const far = promptModel(ctx(g))!;
    expect(far).toMatchObject({
      small: `${junction.street.toUpperCase()} · 10 M`, title: `↗ ${t(junction.turn as Key)}`,
      sub: t('choice.keepWalking', { straight: t(junction.straight as Key) }),
      button: { label: t('choice.approach'), aria: t('choice.turnAria', { place: junction.id === 'romares' ? 'Marcus A' : 'Kurir Livs' }), enabled: false },
    });
    teleport(g, junction.x - 30);
    expect(promptModel(ctx(g))).toMatchObject({ small: `${junction.street.toUpperCase()} · ${t('choice.junction')}`, button: { label: t('choice.turn'), enabled: true } });
    g.active = g.stage.encounters[0];
    expect(promptModel(ctx(g))).toMatchObject({ button: { label: t('choice.clearCrew'), enabled: false } });
  });

  it('greets the shop door: supplies when hurt, a note when full or already collected', () => {
    const g = level1('kurir'); clearStreets(g); g.hasPackage = true;
    const shop = g.stage.shopX!;
    teleport(g, shop - 120, BAND_TOP + 4);
    expect(promptModel(ctx(g))).toMatchObject({
      small: 'ICA NÄRA · KURIR LIVS', title: t('choice.shopTitle'), sub: t('choice.shopHint'),
      button: { label: t('choice.shopButton'), aria: t('choice.shopAria'), enabled: false },
    });
    teleport(g, shop, BAND_TOP + 4);
    expect(promptModel(ctx(g))).toMatchObject({ sub: t('act.shopFull'), button: { enabled: false } });
    g.player.hp = 2;
    expect(promptModel(ctx(g))).toMatchObject({ sub: t('act.shop'), button: { enabled: true } });
    g.shopHealed = true;
    expect(promptModel(ctx(g))).toMatchObject({ title: t('choice.shopTitleDone'), sub: t('act.shopDone'), button: { enabled: false } });
  });

  it('has a key that follows the language and the button state', () => {
    const g = level1(); clearStreets(g); g.hasPackage = true;
    const junction = g.stage.junctions[0];
    teleport(g, junction.x - 100);
    const far = promptModel(ctx(g))!.key;
    teleport(g, junction.x - 30);
    const near = promptModel(ctx(g))!.key;
    expect(near).not.toBe(far);
    setLang('sv');
    expect(promptModel(ctx(g))!.key).not.toBe(near);
  });
});

describe('controls strip', () => {
  const strip = (g: SideGame) => controlsModel(ctx(g)).map(c => `${c.keys}=${c.label}`);
  const words = (...keys: Key[]) => keys.map(k => t(k));

  it('lists the Level 1 keys, with F only once D.D has given you his number', () => {
    const g = level1();
    expect(controlsModel(ctx(g)).map(c => c.keys)).toEqual(['A D / ← →', 'W S / ↑ ↓', 'SPACE / L', 'J', 'K', 'I', 'E', 'ESC', 'M']);
    expect(controlsModel(ctx(g)).map(c => c.label)).toEqual(words('ctl.walk', 'ctl.step', 'ctl.jump', 'ctl.punch', 'ctl.dodge', 'ctl.shoot', 'ctl.use', 'ctl.pause', 'ctl.sound'));
    g.metDD = true;
    expect(controlsModel(ctx(g)).map(c => c.keys)).toEqual(['A D / ← →', 'W S / ↑ ↓', 'SPACE / L', 'J', 'K', 'I', 'E', 'F', 'ESC', 'M']);
    expect(strip(g)).toContain(`F=${t('ctl.phone')}`);
  });

  it('lists the Gods keys, with sneaking and the lift buttons', () => {
    const keys = controlsModel(ctx(gods()));
    expect(keys.map(c => c.keys)).toEqual(['A D / ← →', 'W S / ↑ ↓', 'SHIFT', 'SPACE / L', 'K', 'E', '0-8', 'ESC', 'M']);
    expect(keys.map(c => c.label)).toEqual(words('ctl.walk', 'ctl.step', 'ctl.sneak', 'ctl.jump', 'ctl.dodge', 'ctl.use2', 'ctl.floor', 'ctl.pause', 'ctl.sound'));
  });

  it('lists the Kapell Job keys for the wheel and for the yard', () => {
    const g = heist();
    expect(controlsModel(ctx(g)).map(c => c.keys)).toEqual(['D', 'A', 'W S / ↑ ↓', 'ESC', 'M']);
    expect(controlsModel(ctx(g)).map(c => c.label)).toEqual(words('ctl.gas', 'ctl.brakes', 'ctl.lane', 'ctl.pause', 'ctl.sound'));
    g.heist.phase = 'yard';
    expect(controlsModel(ctx(g)).map(c => c.keys)).toEqual(['A D / ← →', 'W S / ↑ ↓', 'SHIFT', 'K', 'E', 'ESC', 'M']);
    expect(controlsModel(ctx(g))[4].label).toBe(t('ctl.work'));
    setLang('sv');
    expect(controlsModel(ctx(g))[4].label).toBe('SKÄR / TA (HÅLL) · LASTA');
  });
});

describe('masthead and footer', () => {
  it('offers the other language and the other sound state', () => {
    const g = new SideGame();
    expect(mastheadModel(ctx(g))).toEqual({
      pageTitle: t('page.title'), htmlLang: 'en', brand: 'RINGSTORP RUN', sub: 'HELSINGBORG · ARCADE FILE 01', edition: 'SIDE-SCROLLING ACTION / 1994 EDITION',
      canvasLabel: 'Ringstorp Run game view',
      lang: { label: 'SV', aria: 'Byt till svenska', lang: 'sv' },
      sound: { label: '♪ ON', aria: 'Mute sound', muted: false },
    });
    setLang('sv');
    const swedish = mastheadModel(ctx(g, { muted: true }));
    expect(swedish).toMatchObject({
      htmlLang: 'sv', canvasLabel: 'Ringstorp Run spelvy',
      lang: { label: 'EN', aria: 'Switch to English', lang: 'en' },
      sound: { label: '♪ AV', aria: 'Slå på ljudet', muted: true },
    });
    expect(swedish.pageTitle).toBe(t('page.title'));
  });

  it('credits the map data in capitals and shows the best run in five digits', () => {
    const g = new SideGame(); g.bestScore = 1234;
    expect(footerModel(ctx(g))).toEqual({
      credit: `ORIGINAL PIXEL ART · MAP DATA ${MAP_ATTRIBUTION.toUpperCase()}`, bestLabel: 'BEST RUN', best: '01234',
    });
    setLang('sv');
    expect(footerModel(ctx(g))).toMatchObject({ credit: `EGEN PIXELKONST · KARTDATA ${MAP_ATTRIBUTION.toUpperCase()}`, bestLabel: 'BÄSTA OMGÅNG' });
  });
});

describe('phone model', () => {
  const request = (g: SideGame) => { g.metDD = true; g.openPhone(); g.callDD(); };

  it('shows the launcher once D.D is known, and the drawer only while the phone is open in play', () => {
    const g = level1();
    expect(phoneModel(ctx(g)).launcher.visible).toBe(false);
    g.metDD = true;
    const closed = phoneModel(ctx(g));
    expect(closed).toMatchObject({
      visible: false, launcher: { visible: true, aria: t('phone.open'), keyLabel: 'F', name: 'GH337', cash: `${g.cash} KR` },
    });
    g.openPhone();
    expect(phoneModel(ctx(g)).visible).toBe(true);
    g.mode = 'paused';
    expect(phoneModel(ctx(g))).toMatchObject({ visible: false, launcher: { visible: false } });
    expect(phoneModel(ctx(new SideGame())).launcher.visible).toBe(false);
  });

  it('walks the visit from ready to dialing, ringing, connected, on his way, and here', () => {
    const g = level1(); g.metDD = true; g.openPhone();
    const view = () => phoneModel(ctx(g));
    expect(view()).toMatchObject({
      lcd: { contact: 'D.D', number: DD_NUMBER, status: t('ph.ready') }, hint: t('ph.hintReady'),
      action: { label: t('ph.call'), disabled: false }, cancel: { visible: false },
      yesAria: t('ph.callAria'), noAria: t('ph.away'), dialogLabel: t('ph.dialog'), handsetLabel: t('ph.handset'),
      wallet: t('ph.wallet', { cash: g.cash }), rounds: t('ph.carrying', { ammo: 0, clip: CLIP }),
    });
    g.callDD();
    expect(view()).toMatchObject({
      lcd: { status: t('ph.dialing') }, hint: t('ph.hintDialing'), action: { label: t('ph.calling'), disabled: true }, cancel: { visible: true, label: t('ph.cancelCall') },
    });
    advance(g, 0.8);
    expect(view()).toMatchObject({ lcd: { status: t('ph.ringing') }, hint: t('ph.hintRinging'), action: { label: t('ph.calling'), disabled: true } });
    advance(g, 1.3);
    expect(view()).toMatchObject({
      lcd: { status: t('ph.connected') }, hint: t('ph.hintConnected', { price: REFILL_PRICE }), action: { label: t('ph.hisWay'), disabled: true },
    });
    until(g, () => g.phoneCall === 'idle');
    // A visit sent round a corner or back to a checkpoint is on its way again, with the call long over.
    g.delivery!.state = 'coming'; g.delivery!.x = g.player.x - 500;
    expect(view()).toMatchObject({ lcd: { status: t('ph.onMyWay') }, hint: t('ph.hintComing'), action: { label: t('ph.hisWay'), disabled: true }, cancel: { visible: true } });
    advance(g, 5);
    expect(g.dealerNearby).toBe(true);
    expect(view()).toMatchObject({
      lcd: { status: t('ph.here') }, hint: t('ph.hintOffer'), action: { label: t('ph.buy', { price: REFILL_PRICE }), disabled: false },
      yesAria: t('ph.buyAria', { price: REFILL_PRICE }), cancel: { visible: true, label: t('ph.sendAway') },
    });
  });

  it('explains why a refill cannot be bought', () => {
    const g = level1(); request(g); advance(g, 6);
    const view = () => phoneModel(ctx(g));
    g.cash = REFILL_PRICE - 1;
    expect(view()).toMatchObject({ hint: t('ph.hintBroke', { more: 1 }), action: { label: t('ph.buy', { price: REFILL_PRICE }), disabled: true } });
    g.cash = REFILL_PRICE; g.ammo = CLIP;
    expect(view()).toMatchObject({ hint: t('ph.hintFull'), action: { disabled: true } });
    g.ammo = 2;
    expect(view()).toMatchObject({ hint: t('ph.hintOffer'), action: { disabled: false } });
    expect(view().wallet).toBe(t('ph.wallet', { cash: REFILL_PRICE }));
    expect(view().rounds).toBe(t('ph.carrying', { ammo: 2, clip: CLIP }));
  });

  it('says goodbye while D.D leaves, and shows the receipt after a refill', () => {
    const g = level1(); request(g); advance(g, 6);
    g.delivery!.state = 'leaving';
    expect(phoneModel(ctx(g))).toMatchObject({
      lcd: { status: t('ph.seeYou') }, hint: t('ph.hintLeaving'), action: { label: t('ph.bye'), disabled: true }, cancel: { visible: false },
    });
    expect(phoneModel(ctx(g, { phoneReceipt: true }))).toMatchObject({
      lcd: { status: t('ph.refilled') }, hint: t('ph.hintRefilled', { clip: CLIP, price: REFILL_PRICE }),
    });
  });

  it('follows a real visit through the session, receipt included', () => {
    const s = new Session(new SideGame(), false);
    s.dispatch('start');
    const g = s.game;
    g.metDD = true;
    s.dispatch('phone');
    expect(phoneModel(s).visible).toBe(true);
    s.dispatch('phone-call');
    expect(phoneModel(s).lcd.status).toBe(t('ph.dialing'));
    advance(g, 7);
    expect(phoneModel(s).lcd.status).toBe(t('ph.here'));
    s.dispatch('phone-call');
    expect(g.ammo).toBe(CLIP);
    expect(s.phoneReceipt).toBe(true);
    expect(phoneModel(s)).toMatchObject({ lcd: { status: t('ph.refilled') }, rounds: t('ph.carrying', { ammo: CLIP, clip: CLIP }) });
    s.dispatch('phone-away');
    s.dispatch('phone');
    expect(s.phoneReceipt).toBe(false);
    expect(phoneModel(s).lcd.status).not.toBe(t('ph.refilled'));
  });

  it('strips the markup from the put-away label and follows the language in its key', () => {
    const g = level1(); g.metDD = true; g.openPhone();
    expect(phoneModel(ctx(g)).pocketLabel).toBe('PUT AWAY F / ESC');
    const english = phoneModel(ctx(g)).key;
    expect(phoneModel(ctx(g)).key).toBe(english);
    setLang('sv');
    expect(phoneModel(ctx(g)).pocketLabel).toBe('LÄGG UNDAN F / ESC');
    expect(phoneModel(ctx(g)).key).not.toBe(english);
    setLang('en');
    g.callDD();
    expect(phoneModel(ctx(g)).key).not.toBe(english);
  });
});

describe('world HUD model', () => {
  it('draws nothing outside play and pause', () => {
    for (const mode of ['title', 'victory', 'defeat'] as const) {
      const g = level1(); g.mode = mode; g.say('msg.start'); g.goTimer = 2;
      expect(worldHudModel(ctx(g)), mode).toMatchObject({ visible: false, go: null, toast: null, polis: false, boss: null, route: null });
    }
  });

  it('fades the toast out over its last half second and marks D.D\'s lines', () => {
    const g = level1();
    expect(worldHudModel(ctx(g)).toast).toEqual({ text: g.message, fromDD: false, alpha: 1 });
    g.messageTimer = 0.2;
    expect(worldHudModel(ctx(g)).toast!.alpha).toBeCloseTo(0.4);
    g.say('msg.ddOnWay', { price: REFILL_PRICE });
    expect(worldHudModel(ctx(g)).toast).toEqual({ text: t('msg.ddOnWay', { price: REFILL_PRICE }), fromDD: true, alpha: 1 });
    setLang('sv');
    expect(worldHudModel(ctx(g)).toast!.text).toBe(t('msg.ddOnWay', { price: REFILL_PRICE }));
    g.messageTimer = 0;
    expect(worldHudModel(ctx(g)).toast).toBeNull();
    g.messageTimer = 2; g.togglePause();
    expect(worldHudModel(ctx(g))).toMatchObject({ visible: true, toast: null });
  });

  it('shows the GO arrow while its timer runs, even when paused', () => {
    const g = level1();
    expect(worldHudModel(ctx(g)).go).toBeNull();
    g.goTimer = 1.5;
    expect(worldHudModel(ctx(g)).go).toEqual({ label: t('cv.go'), timer: 1.5 });
    g.togglePause();
    expect(worldHudModel(ctx(g)).go).toEqual({ label: t('cv.go'), timer: 1.5 });
  });

  it('raises the POLIS badge when the police are called', () => {
    const g = level1();
    expect(worldHudModel(ctx(g)).polis).toBe(false);
    g.dispatch = 5;
    expect(worldHudModel(ctx(g)).polis).toBe(true);
  });

  it('shows the boss health bar in place of the route strip', () => {
    const g = level1();
    expect(worldHudModel(ctx(g)).boss).toBeNull();
    const boss: SideEnemy = { ...g.enemies[0], kind: 'boss', hp: 7, maxHp: 14, state: 'walk' };
    g.enemies.push(boss);
    expect(worldHudModel(ctx(g))).toMatchObject({ boss: { label: t('cv.boss'), hp: 7, maxHp: 14, ratio: 0.5 }, route: null });
    boss.state = 'idle';
    expect(worldHudModel(ctx(g)).boss).toBeNull();
    boss.state = 'walk'; boss.hp = 0;
    expect(worldHudModel(ctx(g)).boss).toBeNull();
  });

  it('lays out the route strip: crews, the package, junctions and home along the stage', () => {
    const g = level1();
    const strip = () => worldHudModel(ctx(g)).route!;
    const crews = g.stage.encounters.filter(e => !e.home);
    const at = (x: number) => Math.min(1, x / g.stage.homeX);
    expect(strip().markers.filter(m => m.kind === 'crew')).toEqual(crews.map(e => ({ kind: 'crew', at: at(e.spawns[0].x), state: 'open' })));
    expect(strip().markers.filter(m => m.kind === 'package')).toEqual([{ kind: 'package', at: at(g.stage.package.x), state: 'open' }]);
    expect(strip().markers.filter(m => m.kind === 'junction')).toHaveLength(g.stage.junctions.length);
    expect(strip().markers.at(-1)).toEqual({ kind: 'home', at: 1, state: 'open' });
    expect(strip().player).toBeCloseTo(at(g.player.x));
    expect(strip().label).toBe(t('cv.metresHome', { m: Math.round(g.metresToHome) }));

    g.encounters.set(crews[0].id, 'cleared'); g.encounters.set(crews[1].id, 'active');
    g.hasPackage = true; g.decisions.set(g.stage.junctions[0].id, 'straight');
    const markers = strip().markers;
    expect(markers.filter(m => m.kind === 'crew').map(m => m.state).slice(0, 3)).toEqual(['done', 'active', 'open']);
    expect(markers.some(m => m.kind === 'package')).toBe(false);
    expect(markers.filter(m => m.kind === 'junction')).toHaveLength(g.stage.junctions.length - 1);
    teleport(g, g.stage.homeX * 2);
    expect(strip().player).toBe(1);
    setLang('sv');
    expect(strip().label).toBe(t('cv.metresHome', { m: 0 }));
  });

  it('marks Marcus A and Kurir Livs, and greys them once used', () => {
    const marcus = level1('marcus');
    const spot = (g: SideGame, kind: 'marcus' | 'shop') => worldHudModel(ctx(g)).route!.markers.filter(m => m.kind === kind);
    expect(spot(marcus, 'marcus')).toEqual([{ kind: 'marcus', at: marcus.stage.marcusX! / marcus.stage.homeX, state: 'open' }]);
    marcus.healed = true;
    expect(spot(marcus, 'marcus')[0].state).toBe('done');
    expect(spot(marcus, 'shop')).toEqual([]);
    const kurir = level1('kurir');
    expect(spot(kurir, 'shop')).toEqual([{ kind: 'shop', at: kurir.stage.shopX! / kurir.stage.homeX, state: 'open' }]);
    kurir.shopHealed = true;
    expect(spot(kurir, 'shop')[0].state).toBe('done');
    expect(spot(level1(), 'marcus')).toEqual([]);
  });

  it('draws no route strip while on foot in the truck yard, but does while driving', () => {
    const g = heist();
    expect(worldHudModel(ctx(g)).route).not.toBeNull();
    g.heist.phase = 'yard';
    expect(worldHudModel(ctx(g))).toMatchObject({ route: null, interior: false });
  });

  it('keeps only the GO arrow and the toast inside the lift', () => {
    const g = gods(); g.say('msg.dd2Call'); g.goTimer = 1; g.dispatch = 1;
    expect(worldHudModel(ctx(g)).route).not.toBeNull();
    g.gods.scene = 'cabin';
    const inside = worldHudModel(ctx(g));
    expect(inside).toMatchObject({ visible: true, interior: true, polis: false, boss: null, route: null, arrows: [] });
    expect(inside.go).not.toBeNull();
    expect(inside.toast).toMatchObject({ fromDD: true });
  });

  it('points the step-up arrows at the junction, Kurir Livs, Marcus A and home when they matter', () => {
    const g = level1(); clearStreets(g);
    expect(worldHudModel(ctx(g)).arrows).toEqual([]);
    g.hasPackage = true;
    const junction = g.stage.junctions[0];
    teleport(g, junction.x - 100);
    expect(worldHudModel(ctx(g)).arrows).toEqual([junction.x]);

    const shop = level1('kurir'); clearStreets(shop); shop.hasPackage = true; teleport(shop, shop.stage.shopX! - 500);
    expect(worldHudModel(ctx(shop)).arrows).toContain(shop.stage.shopX);
    shop.shopHealed = true;
    expect(worldHudModel(ctx(shop)).arrows).not.toContain(shop.stage.shopX);

    const long = level1('marcus'); clearStreets(long); long.hasPackage = true;
    teleport(long, long.stage.marcusX! - 100);
    expect(worldHudModel(ctx(long)).arrows).toContain(long.stage.marcusX);
    teleport(long, long.stage.marcusX! - 300);
    expect(worldHudModel(ctx(long)).arrows).not.toContain(long.stage.marcusX);

    const home = level1(); home.crewSprung = true;
    expect(worldHudModel(ctx(home)).arrows).not.toContain(home.stage.homeX);
    home.encounters.set(home.stage.encounters.find(e => e.home)!.id, 'cleared');
    expect(worldHudModel(ctx(home)).arrows).toContain(home.stage.homeX);
  });
});
