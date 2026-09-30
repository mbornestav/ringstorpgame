import { describe, expect, it } from 'vitest';
import { SideGame } from '../src/side/game';
import { setLang } from '../src/side/i18n';
import { BAND_TOP, WIDTH } from '../src/side/layout';
import { LEVELS, compileLevel, levelById, levelText, validateLevel, type LevelDefinition } from '../src/side/levels';
import { BUILDING_KINDS, BUILDINGS } from '../src/side/levels/catalogue';
import { HOME_CREW_ID } from '../src/side/levels/compile';
import template from '../src/side/levels/_template.level';

const STEP = 1 / 60;
const sample = levelById('sample')!;
/** A copy of the sample with some fields changed, for the validator's failure cases. */
const variant = (change: (d: LevelDefinition) => void): LevelDefinition => {
  const d = structuredClone(sample) as LevelDefinition;
  change(d);
  return d;
};

describe('level files', () => {
  it('every level in src/side/levels passes validation, and ids are unique', () => {
    expect(LEVELS.length).toBeGreaterThan(0);
    for (const level of LEVELS) expect(validateLevel(level), level.id).toEqual([]);
    expect(new Set(LEVELS.map(l => l.id)).size).toBe(LEVELS.length);
    expect(LEVELS.some(l => l.id.startsWith('_'))).toBe(false);
  });

  it('compiles to a stage the brawl rules can run: crews in order, the home crew last with the final screen', () => {
    const stage = compileLevel(sample);
    expect(stage.level).toBe(1);
    expect(stage.length).toBe(sample.street.length);
    expect(stage.facades.some(f => f.role === 'home')).toBe(true);
    const cams = stage.encounters.map(e => e.camera);
    expect(cams).toEqual([...cams].sort((a, b) => a - b));
    const home = stage.encounters.at(-1)!;
    expect(home.id).toBe(HOME_CREW_ID);
    expect(home.home).toBe(true);
    expect(home.camera).toBe(stage.length - WIDTH);
    expect(stage.shopX).not.toBeNull();
    for (const e of stage.encounters) for (const s of e.spawns) expect(s.y).toBeGreaterThanOrEqual(BAND_TOP + 6);
  });

  it('reports mistakes as sentences an author can act on', () => {
    const problems = (change: (d: LevelDefinition) => void) => validateLevel(variant(change)).join('\n');
    expect(problems(d => { d.id = 'Bad Id'; })).toContain('lowercase');
    expect(problems(d => { d.street.buildings.push({ kind: 'castle' as never, from: 10, to: 20 }); })).toContain('unknown kind "castle"');
    expect(problems(d => { d.street.buildings.push({ kind: 'house', from: 50, to: 200 }); })).toContain('overlaps street.buildings[0]');
    expect(problems(d => { d.street.names = [{ from: 0, to: 1000, value: 'A' }]; })).toContain('must reach the end of the street');
    expect(problems(d => { d.title = { sv: 'Bara svenska', en: '' }; })).toContain('needs both sv and en');
    expect(problems(d => { d.intro = 'no.such.key' as never; })).toContain('is not a key');
    expect(problems(d => { d.street.homeCrew = []; })).toContain('street.homeCrew: needs at least one member');
    expect(problems(d => { d.street.crews = [{ x: 300, members: [{ kind: 'runner' }] }]; })).toContain('past it');
    expect(problems(d => { d.street.parcel.lane = 400; })).toContain('off the pavement');
    expect(problems(d => { d.street.buildings.push({ kind: 'house', from: 3900, to: 4100 }); })).toContain('home terrace');
  });

  it('plays from start to finish under the Level 1 rules, with the level\'s own texts', () => {
    setLang('en');
    const game = new SideGame();
    game.startLevel(sample);
    expect(game.custom).toBe(sample);
    expect(game.mode).toBe('playing');
    expect(game.message).toBe('Pick up the parcel at the kiosk');
    expect(game.objective).toBe('Pick up the parcel · the kiosk');
    const teleport = (x: number, y = 214) => { game.camera = Math.max(0, Math.min(game.stage.length - WIDTH, x - WIDTH * 0.4)); game.player.x = x; game.player.y = y; };
    teleport(game.stage.package.x, game.stage.package.y);
    game.update(STEP);
    expect(game.hasPackage).toBe(true);
    expect(game.objective).toBe('Top up your health · the shop on Testvägen');
    teleport(game.stage.shopX! + 200);
    expect(game.objective).toBe('Go home · Övningsgatan 55B');
    for (const e of game.stage.encounters) if (!e.home) game.encounters.set(e.id, 'cleared');
    for (const e of game.enemies) { e.hp = 0; e.gone = true; }
    teleport(game.stage.length - WIDTH * 0.5);
    game.update(STEP);
    expect(game.crewSprung).toBe(true);
    for (const e of game.enemies) if (e.encounter === HOME_CREW_ID) e.hp = 0;
    game.update(STEP);
    teleport(game.stage.homeX, BAND_TOP + 4);
    game.update(STEP);
    expect(game.mode).toBe('victory');
    // Back to a built-in level, the level file is forgotten.
    game.start();
    expect(game.custom).toBeNull();
    setLang('sv');
    expect(levelText(sample.title)).toBe('Övningsgatan');
    setLang('en');
  });

  it('the template is a valid starting point, and is not loaded as a level', () => {
    expect(validateLevel(template)).toEqual([]);
    expect(levelById(template.id)).toBeUndefined();
  });

  it('the catalogue documents every building kind', () => {
    for (const kind of BUILDING_KINDS) expect(BUILDINGS[kind].about.length).toBeGreaterThan(8);
  });
});
