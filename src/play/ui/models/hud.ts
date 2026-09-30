import { CLIP, FINE, type SideGame } from '../../../side/game';
import { HEIST } from '../../../side/heist-config';
import { t } from '../../../side/i18n';
import { ROUTE_NAMES } from '../../../side/routes';
import { levelText } from '../../../side/levels';
import { formatTime } from '../text';
import { meter, padScore, withKey, type Meter, type UiContext } from './base';

export interface HudStep {
  /** 'optional' is a detour that is not required; '' has not been reached yet. */
  state: 'active' | 'done' | 'optional' | '';
  icon: '?' | '✓' | '✚' | '★';
  title: string;
}

/** Level 1's rounds in D.D's gun. */
export interface AmmoModel {
  keyLabel: 'I';
  rounds: Meter;
  aria: string;
  /** The nudge to phone D.D, once the gun is empty. */
  callHint: string | null;
}

/** The left card: courier health, the Gods, or the Taunus and its load, depending on the level. */
export type LifeCard =
  | { kind: 'health'; label: string; hearts: Meter & { aria: string }; ammo: AmmoModel | null }
  | { kind: 'cargo'; label: string; cargo: 'none' | 'carried' | 'stashed'; hidden: boolean; status: string; sneak: string | null }
  | {
    kind: 'load'; label: string; crates: string; carrying: string | null;
    car: Meter & { label: string }; noise: (Meter & { label: string }) | null;
  };

export interface HudModel {
  key: string;
  /** False on the title screen. The top line and the best score still show there. */
  visible: boolean;
  streetLabel: string;
  streetLine: string;
  levelLine: string;
  life: LifeCard;
  objective: { label: string; text: string; steps: HudStep[]; routeName: string };
  score: { label: string; time: string; value: string };
  /** The best run, five digits. */
  best: string;
}

function packageLife(game: SideGame): LifeCard {
  const p = game.player;
  return {
    kind: 'health',
    label: t('hud.health'),
    hearts: { ...meter(p.hp, p.maxHp), aria: t('a11y.health', { n: Math.max(0, p.hp), max: p.maxHp }) },
    ammo: !game.metDD && game.ammo <= 0 ? null : {
      keyLabel: 'I',
      rounds: meter(game.ammo, CLIP),
      aria: t('hud.rounds', { n: game.ammo }),
      callHint: game.ammo === 0 && game.hasPhone ? t('hud.callDD').trim() : null,
    },
  };
}

function godsLife(game: SideGame): LifeCard {
  const g2 = game.gods;
  return {
    kind: 'cargo',
    label: t('hud.cargo'),
    cargo: g2.cargo,
    hidden: g2.hidden,
    status: t(g2.hidden ? 'cargo.hidden' : g2.cargo === 'carried' ? 'cargo.carried' : g2.cargo === 'stashed' ? 'cargo.stashed' : 'cargo.none'),
    sneak: game.sneaking && !g2.hidden ? t('cargo.sneak') : null,
  };
}

function heistLife(game: SideGame): LifeCard {
  const h = game.heist;
  return {
    kind: 'load',
    label: t('hud.load'),
    crates: t('h.crates', { n: h.crates, max: HEIST.trunk }),
    carrying: h.yard.carry > 0 ? t('h.carrying', { n: h.yard.carry }) : null,
    car: { label: t('h.car'), ...meter(HEIST.wreckAt - h.damage, HEIST.wreckAt) },
    noise: h.phase === 'yard' ? { label: t('h.noise'), ...meter(Math.round(h.noise * 5), 5) } : null,
  };
}

function packageSteps(game: SideGame): HudStep[] {
  if (game.custom) {
    const own = game.custom.objectives;
    const total = game.custom.street.restStops?.length ?? 0;
    return [
      { state: game.hasPackage ? 'done' : 'active', icon: game.hasPackage ? '✓' : '?', title: own?.parcel ? levelText(own.parcel) : t('lose.package') },
      ...(total ? [{ state: game.rested.size === total ? 'done' as const : 'optional' as const, icon: '✚' as const, title: t('level.fikaCount', { n: game.rested.size, total }) }] : []),
      { state: game.mode === 'victory' ? 'done' : game.hasPackage ? 'active' : '', icon: '★', title: own?.home ? levelText(own.home) : t('step.home') },
    ];
  }
  const marcus = game.healed ? 'done' : game.hasPackage && game.marcusAhead ? 'active' : 'optional';
  const shop = game.shopHealed ? 'done' : game.stage.shopX !== null && game.player.x < game.stage.shopX + 90 ? 'active' : 'optional';
  return [
    { state: game.hasPackage ? 'done' : 'active', icon: game.hasPackage ? '✓' : '?', title: t('step.package') },
    { state: marcus, icon: game.healed ? '✓' : '✚', title: 'Marcus A · Långåkersgatan 4' },
    { state: shop, icon: game.shopHealed ? '✓' : '✚', title: 'Kurir Livs · Kurirgatan 1' },
    { state: game.mode === 'victory' ? 'done' : game.hasPackage && marcus !== 'active' && shop !== 'active' ? 'active' : '', icon: '★', title: t('step.home') },
  ];
}

function godsSteps(game: SideGame): HudStep[] {
  const g2 = game.gods, x = game.player.x, inside = g2.scene !== 'street';
  const shop = game.stage.shopX ?? 0, school = game.stage.facades.find(f => f.role === 'school')?.x1 ?? 0;
  return [
    { state: g2.received ? 'done' : 'active', icon: g2.received ? '✓' : '?', title: t('step2.dd') },
    { state: !inside && g2.received && x > shop + 400 ? 'done' : g2.received ? 'active' : '', icon: x > shop + 400 && g2.received ? '✓' : '✚', title: t('step2.shop') },
    { state: !inside && g2.received && x > school ? 'done' : '', icon: x > school && g2.received ? '✓' : '✚', title: t('step2.school') },
    { state: game.mode === 'victory' ? 'done' : '', icon: '★', title: t('step.home') },
  ];
}

function heistSteps(game: SideGame): HudStep[] {
  const h = game.heist;
  const passedStatoil = h.phase !== 'pickup' && (h.phase !== 'out' || game.player.x > 4900);
  const home = h.phase === 'back' || h.phase === 'done';
  return [
    { state: h.phase === 'pickup' ? 'active' : 'done', icon: h.phase === 'pickup' ? '?' : '✓', title: t('step3.pickup') },
    { state: passedStatoil ? 'done' : h.phase === 'out' ? 'active' : '', icon: passedStatoil ? '✓' : '✚', title: t('step3.statoil') },
    { state: h.phase === 'yard' ? 'active' : home ? 'done' : '', icon: home ? '✓' : '✚', title: t('step3.yard') },
    { state: game.mode === 'victory' ? 'done' : h.phase === 'back' ? 'active' : '', icon: '★', title: t('step3.home') },
  ];
}

function streetLine({ game }: UiContext): string {
  if (game.mode === 'title') return 'PÅLSJÖ KIOSK → RINGSTORPSVÄGEN 55B';
  if (game.busRide !== null) return t(game.busRide < 7 ? 'level.busRide' : 'level.arrived').toUpperCase();
  const toHome = t(game.custom?.busHome ? 'level.toBus' : 'hud.toHome', { m: Math.round(game.metresToHome) });
  if (game.level === 3) return `${(game.street ?? 'Kurirgatan').toUpperCase()}${game.heist.driving ? ` · ${toHome}` : ''}`;
  if (game.level === 2) {
    const g2 = game.gods;
    return g2.scene !== 'street'
      ? `KURIRGATAN 28 · ${t('cabin.floor')} ${g2.floor === 0 ? t('cabin.ground') : g2.floor}`
      : `${(game.street ?? 'Kurirgatan').toUpperCase()} · ${toHome}`;
  }
  const street = game.street ?? (game.hasPackage ? (game.metresToHome < 60 ? 'RINGSTORPSVÄGEN 55B' : 'PÅLSJÖ') : 'PÅLSJÖ KIOSK');
  return `${street.toUpperCase()} · ${toHome}`;
}

function levelLine({ game, titleView }: UiContext): string {
  const title = game.mode === 'title';
  if (game.custom && !title) return levelText(game.custom.title).toUpperCase();
  return t(game.level === 3 || (title && titleView === 'heist') ? 'top.level3' : game.level === 2 || (title && titleView === 'gods') ? 'top.level2' : 'top.level1');
}

/** A level file's route: its first and last street names. */
function customRoute(names: string[]): string {
  const first = names[0] ?? '', last = names[names.length - 1] ?? first;
  return first === last ? first : `${first} → ${last}`;
}

/** Level 1 scores its own points; the other levels show the cash in your pocket. */
function scoreValue(game: SideGame): string {
  if (game.level !== 1) return padScore(game.cash);
  return padScore(Math.max(0, game.koCount * 85 + (game.hasPackage ? 500 : 0) + (game.healed ? 250 : 0) - game.fines * FINE));
}

/** The HUD cards, the top line and the best score, all as text and counts. */
export function hudModel(ctx: UiContext): HudModel {
  const { game } = ctx;
  const level = game.level;
  return withKey<HudModel>({
    visible: game.mode !== 'title' && game.busRide === null,
    streetLabel: t('top.street'),
    streetLine: streetLine(ctx),
    levelLine: levelLine(ctx),
    life: level === 3 ? heistLife(game) : level === 2 ? godsLife(game) : packageLife(game),
    objective: {
      label: t('hud.objective'),
      text: game.objective,
      steps: level === 3 ? heistSteps(game) : level === 2 ? godsSteps(game) : packageSteps(game),
      routeName: game.custom ? customRoute(game.custom.street.names.map(n => n.value)) : level === 3 ? 'Kurirgatan → Industrivägen' : level === 2 ? 'Kurirgatan → Ringstorpsvägen' : ROUTE_NAMES[game.route],
    },
    score: { label: t('hud.score'), time: formatTime(game.elapsed), value: scoreValue(game) },
    best: padScore(game.bestScore),
  });
}
