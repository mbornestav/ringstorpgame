import { MAP_ATTRIBUTION } from '../../../map';
import { getLang, t, type Key } from '../../../side/i18n';
import { padScore, type UiContext } from './base';

export interface ControlHint { keys: string; label: string }

/** The controls strip below the game. It lists F only once D.D has given you his number. */
export function controlsModel({ game }: UiContext): ControlHint[] {
  const keys: Array<[string, Key]> = game.level === 3
    ? game.heist.driving
      ? [['D', 'ctl.gas'], ['A', 'ctl.brakes'], ['W S / ↑ ↓', 'ctl.lane'], ['ESC', 'ctl.pause'], ['M', 'ctl.sound']]
      : [['A D / ← →', 'ctl.walk'], ['W S / ↑ ↓', 'ctl.step'], ['SHIFT', 'ctl.sneak'], ['K', 'ctl.dodge'], ['E', 'ctl.work'], ['ESC', 'ctl.pause'], ['M', 'ctl.sound']]
    : game.level === 2
    ? [['A D / ← →', 'ctl.walk'], ['W S / ↑ ↓', 'ctl.step'], ['SHIFT', 'ctl.sneak'], ['SPACE / L', 'ctl.jump'], ['K', 'ctl.dodge'], ['E', 'ctl.use2'], ['0-8', 'ctl.floor'], ['ESC', 'ctl.pause'], ['M', 'ctl.sound']]
    : [['A D / ← →', 'ctl.walk'], ['W S / ↑ ↓', 'ctl.step'], ['SPACE / L', 'ctl.jump'], ['J', 'ctl.punch'], ['K', 'ctl.dodge'], ['I', 'ctl.shoot'], ['E', 'ctl.use'], ...(game.hasPhone ? [['F', 'ctl.phone'] as [string, Key]] : []), ['ESC', 'ctl.pause'], ['M', 'ctl.sound']];
  return keys.map(([caps, label]) => ({ keys: caps, label: t(label) }));
}

/** The page header: brand, edition, and the language and sound switches. */
export interface MastheadModel {
  pageTitle: string;
  /** The value for the document's `lang` attribute. */
  htmlLang: string;
  brand: string;
  sub: string;
  edition: string;
  canvasLabel: string;
  /** The button offers the other language, so its own `lang` is the one it switches to. */
  lang: { label: string; aria: string; lang: string };
  sound: { label: string; aria: string; muted: boolean };
}

export function mastheadModel({ muted }: UiContext): MastheadModel {
  return {
    pageTitle: t('page.title'),
    htmlLang: getLang(),
    brand: 'RINGSTORP RUN',
    sub: t('brand.sub'),
    edition: t('edition'),
    canvasLabel: t('a11y.canvas'),
    lang: { label: t('lang.button'), aria: t('lang.aria'), lang: getLang() === 'en' ? 'sv' : 'en' },
    sound: { label: t(muted ? 'sound.off' : 'sound.on'), aria: t(muted ? 'sound.unmute' : 'sound.mute'), muted },
  };
}

/** `attribution` alone is the short credit, for when the full line does not fit (the retro footer). */
export interface FooterModel { credit: string; attribution: string; bestLabel: string; best: string }

export function footerModel({ game }: UiContext): FooterModel {
  return {
    credit: t('footer.credit', { attribution: MAP_ATTRIBUTION.toUpperCase() }),
    attribution: MAP_ATTRIBUTION.toUpperCase(),
    bestLabel: t('footer.best'),
    best: padScore(game.bestScore),
  };
}
