import type { EncounterState, SideGame } from '../../../side/game';
import { t } from '../../../side/i18n';
import type { UiContext } from './base';

/** A dot on the route strip. `state` picks the colour: crews go open (waiting), active, done (cleared); Marcus A and the shop go open, done. */
export interface RouteMarker {
  kind: 'crew' | 'package' | 'marcus' | 'shop' | 'junction' | 'home';
  /** How far along the stage, 0 to 1. */
  at: number;
  state: 'open' | 'active' | 'done';
}

export interface RouteStrip {
  /** The courier's place along the stage, 0 to 1. The line is lit up to here. */
  player: number;
  /** In drawing order, so a later marker sits on top of an earlier one. */
  markers: RouteMarker[];
  label: string;
}

/**
 * What the old canvas drew over the game, as data. Blinking, bobbing and fading with time are left to the renderer: the
 * old code drove them from its own clock, not from the game, so only the game's timers appear here.
 */
export interface WorldHudModel {
  /** Playing or paused, the only modes the old HUD was drawn in. Everything but `arrows` is empty when this is false. */
  visible: boolean;
  /** Inside the lift or a landing, where only the GO arrow and the toast were drawn. */
  interior: boolean;
  /** The GO arrow after a crew is cleared. The old code blinked it at 4 Hz for as long as `timer` is above 0. */
  go: { label: string; timer: number } | null;
  /** The message toast, shown while playing. `alpha` is 1 for most of its life and fades over the last half second. */
  toast: { text: string; fromDD: boolean; alpha: number } | null;
  /** The police are after you. The old badge swapped its two lights at 6 Hz. */
  polis: boolean;
  /** The boss's health, while he is fighting. It replaces the route strip. */
  boss: { label: string; hp: number; maxHp: number; ratio: number } | null;
  route: RouteStrip | null;
  /** Stage x of each bouncing step-up arrow that should be showing: at a junction, the shop door, Marcus A or home. They sit in the street, so the renderer culls the ones off screen. */
  arrows: number[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const CREW_STATE: Record<EncounterState, RouteMarker['state']> = { waiting: 'open', active: 'active', cleared: 'done' };

function routeStrip(game: SideGame): RouteStrip {
  const stage = game.stage;
  const along = (x: number) => clamp(x / stage.homeX, 0, 1);
  const markers: RouteMarker[] = [];
  for (const e of stage.encounters) {
    if (!e.home) markers.push({ kind: 'crew', at: along(e.spawns[0].x), state: CREW_STATE[game.encounterState(e.id)] });
  }
  if (!game.hasPackage) markers.push({ kind: 'package', at: along(stage.package.x), state: 'open' });
  if (stage.marcusX !== null) markers.push({ kind: 'marcus', at: along(stage.marcusX), state: game.healed ? 'done' : 'open' });
  if (stage.shopX !== null) markers.push({ kind: 'shop', at: along(stage.shopX), state: game.shopHealed ? 'done' : 'open' });
  for (const stop of game.custom?.street.restStops ?? []) markers.push({ kind: 'shop', at: along(stop.x), state: game.rested.has(stop.x) ? 'done' : 'open' });
  for (const j of stage.junctions) if (!game.decisions.has(j.id)) markers.push({ kind: 'junction', at: along(j.x), state: 'open' });
  markers.push({ kind: 'home', at: 1, state: 'open' });
  return { player: along(game.player.x), markers, label: t(game.custom?.busHome ? 'level.toBus' : 'cv.metresHome', { m: Math.round(game.metresToHome) }) };
}

function stepUpArrows(game: SideGame): number[] {
  const stage = game.stage, x = game.player.x, arrows: number[] = [];
  const ahead = game.junctionAhead;
  for (const j of stage.junctions) if (ahead?.id === j.id) arrows.push(j.x);
  if (stage.shopX !== null && game.level === 1 && !game.shopHealed && game.hasPackage) arrows.push(stage.shopX);
  if (stage.marcusX !== null && stage.facades.some(f => f.role === 'marcus') && game.marcusAhead && game.hasPackage && Math.abs(x - stage.marcusX) < 170) arrows.push(stage.marcusX);
  if (stage.facades.some(f => f.role === 'home') && game.homeCrewDown) arrows.push(stage.homeX);
  for (const stop of game.custom?.street.restStops ?? []) if (!game.rested.has(stop.x) && Math.abs(x - stop.x) < 170) arrows.push(stop.x);
  return arrows;
}

/** The in-canvas HUD extras: toast, GO arrow, POLIS badge, boss bar and route strip. */
export function worldHudModel({ game }: UiContext): WorldHudModel {
  if (game.busRide !== null) return { visible: false, interior: false, go: null, toast: null, polis: false, boss: null, route: null, arrows: [] };
  const visible = game.mode === 'playing' || game.mode === 'paused';
  const interior = game.level === 2 && game.gods.scene !== 'street' && game.mode !== 'title';
  const arrows = interior ? [] : stepUpArrows(game);
  if (!visible) return { visible, interior, go: null, toast: null, polis: false, boss: null, route: null, arrows };
  const go = game.goTimer > 0 ? { label: t('cv.go'), timer: game.goTimer } : null;
  const toast = game.messageTimer > 0 && game.mode === 'playing'
    ? { text: game.message, fromDD: game.messageFromDD, alpha: Math.min(1, game.messageTimer * 2) }
    : null;
  if (interior) return { visible, interior, go, toast, polis: false, boss: null, route: null, arrows };
  const boss = game.enemies.find(e => e.kind === 'boss' && e.hp > 0 && e.state !== 'idle');
  return {
    visible, interior, go, toast, arrows,
    polis: game.wanted,
    boss: boss ? { label: t(game.custom?.busHome ? 'level.boss' : 'cv.boss'), hp: boss.hp, maxHp: boss.maxHp, ratio: boss.hp / boss.maxHp } : null,
    route: boss || (game.level === 3 && !game.heist.driving) ? null : routeStrip(game),
  };
}
