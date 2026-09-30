import { TABLE_KEYS } from '../i18n';
import { BAND_BOTTOM, BAND_TOP, WIDTH } from '../layout';
import type { EnemyKind, FrontKind, FurnitureKind, Surface } from '../stage';
import { BUILDINGS } from './catalogue';
import type { Lane, LevelDefinition, LevelText, Stretch } from './types';

const ENEMIES = new Set<EnemyKind>(['runner', 'bruiser', 'boss']);
const PROPS = new Set<FurnitureKind>(['lamp', 'sign', 'busstop', 'bench', 'bin', 'postbox', 'crossing', 'shelter', 'floodlight']);
const SURFACES = new Set<Surface>(['road', 'major', 'path', 'paved', 'yard']);
const FRONTS = new Set<FrontKind>(['hedge', 'picket', 'plank', 'wall', 'rendered-wall', 'open', 'forecourt', 'chainlink']);
const KEYS = new Set<string>(TABLE_KEYS);
/** The terrace built around home's door spans about this far to each side. */
const TERRACE_REACH = 260;

/**
 * Everything wrong with a level, as sentences an author can act on; empty when it is fine. It checks what the compiler
 * and the rules rely on: sizes and order, known kinds, texts in both languages, and a run that can be finished.
 */
export function validateLevel(def: LevelDefinition): string[] {
  const out: string[] = [];
  const bad = (where: string, what: string) => out.push(`${def.id}: ${where}: ${what}`);
  const s = def.street;
  if (!/^[a-z0-9-]+$/.test(def.id)) bad('id', 'use lowercase letters, digits and dashes');
  if (def.mode !== 'brawl') bad('mode', `unknown mode "${def.mode as string}" (only 'brawl' can be made from data)`);
  const text = (where: string, value: LevelText | undefined, required = false) => {
    if (value === undefined) { if (required) bad(where, 'missing'); return; }
    if (typeof value === 'string') { if (!KEYS.has(value)) bad(where, `"${value}" is not a key in src/side/i18n.ts`); }
    else if (!value.sv?.trim() || !value.en?.trim()) bad(where, 'needs both sv and en');
  };
  text('title', def.title, true); text('subtitle', def.subtitle); text('intro', def.intro);
  text('objectives.parcel', def.objectives?.parcel, true); text('objectives.crew', def.objectives?.crew); text('objectives.shop', def.objectives?.shop); text('objectives.home', def.objectives?.home, true);

  const inside = (where: string, x: number) => { if (!(x >= 0 && x <= s.length)) bad(where, `${x} is outside the street (0–${s.length})`); };
  const lane = (where: string, l: Lane | undefined) => {
    if (typeof l === 'number' && (l < BAND_TOP + 6 || l > BAND_BOTTOM - 6)) bad(where, `lane ${l} is off the pavement (${BAND_TOP + 6}–${BAND_BOTTOM - 6})`);
  };
  if (!(s.length >= WIDTH * 2)) bad('street.length', `at least ${WIDTH * 2} pixels (two screens)`);
  if (!(s.start.x >= 0 && s.start.x < s.length - WIDTH)) bad('street.start', 'must be at least one screen before the end');
  lane('street.start.lane', s.start.lane);
  inside('street.parcel', s.parcel.x); lane('street.parcel.lane', s.parcel.lane);
  if (!(s.parcel.x > s.start.x)) bad('street.parcel', 'must lie ahead of the start');
  if (!(s.home > s.parcel.x + WIDTH / 2)) bad('street.home', 'must lie well past the parcel');
  if (!(s.home <= s.length - 120)) bad('street.home', 'leave at least 120 pixels of street after home');
  if (!s.homeCrew.length) bad('street.homeCrew', 'needs at least one member: beating it is how the run ends');
  s.homeCrew.forEach((k, i) => { if (!ENEMIES.has(k)) bad(`street.homeCrew[${i}]`, `unknown enemy "${k}"`); });

  const runs = <T,>(where: string, list: Array<Stretch<T>> | undefined, known?: Set<T>, cover = false) => {
    if (!list) return;
    let last = 0;
    list.forEach((r, i) => {
      if (!(r.to > r.from)) bad(`${where}[${i}]`, '"to" must be after "from"');
      if (r.from < last - 0.5) bad(`${where}[${i}]`, 'overlaps the stretch before it (list them left to right)');
      if (cover && Math.abs(r.from - last) > 0.5) bad(`${where}[${i}]`, `leaves a gap from ${last} to ${r.from}`);
      if (known && !known.has(r.value)) bad(`${where}[${i}]`, `unknown kind "${String(r.value)}"`);
      inside(`${where}[${i}]`, r.to); last = r.to;
    });
    if (cover && Math.abs(last - s.length) > 0.5) bad(where, `must reach the end of the street (${s.length}), stops at ${last}`);
  };
  if (!s.names.length) bad('street.names', 'name at least one street');
  runs('street.names', s.names, undefined, true);
  runs('street.surfaces', s.surfaces, SURFACES, true);
  runs('street.fronts', s.fronts, FRONTS);

  const byRow: Array<Array<[number, number, number]>> = [[], []];
  s.buildings.forEach((b, i) => {
    const where = `street.buildings[${i}]`;
    if (!(b.kind in BUILDINGS)) { bad(where, `unknown kind "${b.kind as string}"`); return; }
    if (!(b.to > b.from)) bad(where, '"to" must be after "from"');
    inside(where, b.from); inside(where, b.to);
    if (b.door !== undefined && (b.door < b.from || b.door > b.to)) bad(where, 'the door must be within the building');
    if (b.from < s.home + TERRACE_REACH && b.to > s.home - TERRACE_REACH && (b.row ?? 0) === 0) bad(where, `overlaps the home terrace (${s.home - TERRACE_REACH}–${s.home + TERRACE_REACH})`);
    for (const c of ['wall', 'roof'] as const) if (b[c] !== undefined && !/^#[0-9a-f]{6}$/i.test(b[c]!)) bad(where, `${c} must be #rrggbb`);
    const row = byRow[b.row ?? 0];
    for (const [from, to, j] of row) if (b.from < to && b.to > from) bad(where, `overlaps street.buildings[${j}] in the same row`);
    row.push([b.from, b.to, i]);
  });
  if (s.buildings.filter(b => b.kind === 'shop').length > 1) bad('street.buildings', 'at most one shop');
  (s.trees ?? []).forEach((tr, i) => inside(`street.trees[${i}]`, tr.x));
  (s.scatter ?? []).forEach((sc, i) => { inside(`street.scatter[${i}]`, sc.from); inside(`street.scatter[${i}]`, sc.to); if (sc.gap && !(sc.gap[0] > 20 && sc.gap[1] >= sc.gap[0])) bad(`street.scatter[${i}]`, 'gap must be [min, max] with min above 20'); });
  (s.props ?? []).forEach((p, i) => { if (!PROPS.has(p.kind)) bad(`street.props[${i}]`, `unknown kind "${p.kind}"`); inside(`street.props[${i}]`, p.x); });
  if (s.lampsEvery !== undefined && !(s.lampsEvery >= 120)) bad('street.lampsEvery', 'at least 120 pixels');

  (s.crews ?? []).forEach((c, i) => {
    const where = `street.crews[${i}]`;
    if (!c.members.length) bad(where, 'a crew needs members');
    c.members.forEach((m, k) => { if (!ENEMIES.has(m.kind)) bad(`${where}.members[${k}]`, `unknown enemy "${m.kind}"`); lane(`${where}.members[${k}].lane`, m.lane); });
    (c.backup ?? []).forEach((k, j) => { if (!ENEMIES.has(k)) bad(`${where}.backup[${j}]`, `unknown enemy "${k}"`); });
    if (!(c.x > s.parcel.x)) bad(where, 'crews only come after the parcel is picked up: place them past it');
    if (!(c.x < s.home - WIDTH / 2)) bad(where, 'too close to home: that screen belongs to the home crew');
  });
  return out;
}
