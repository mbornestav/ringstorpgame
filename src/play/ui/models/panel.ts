import { DD_CONTACT, DD_NUMBER, FINE } from '../../../side/game';
import { t, type Key } from '../../../side/i18n';
import type { UiAction } from '../../actions';
import { formatTime, splitLead } from '../text';
import { padScore, withKey, type UiContext } from './base';

export type PanelKind =
  | 'title' | 'gods-briefing' | 'heist-briefing' | 'pause'
  | 'victory-1' | 'victory-2' | 'victory-3' | 'defeat-1' | 'defeat-3';

export interface PanelAction {
  id: UiAction;
  label: string;
  /** The icon glyph peeled off the front of the label, so it can be drawn as a vector. */
  lead: '▶' | '↻' | '✚' | null;
  kind: 'primary' | 'secondary';
  /** The small second line of a level-pick button. */
  sub?: string;
}

/** One overlay panel: the title screen, a mission briefing, the pause card or a result. */
export interface PanelModel {
  kind: PanelKind;
  /** Changes whenever anything shown changes, including the language. */
  key: string;
  eyebrow: string;
  /** The level number badge before the eyebrow, on the title screen and the briefings. */
  chip?: '01' | '02' | '03';
  /** Text after the eyebrow rule. */
  eyebrowExtra?: string;
  title: string;
  /** The punctuation after the title: a gold or red full stop, or a blinking cursor. */
  titleAccent: 'gold' | 'red' | 'blink' | null;
  subtitle?: string;
  body: string;
  bullets: string[];
  /** The result grid. */
  stats: Array<{ label: string; value: string }>;
  /** The key hint beside the buttons (under them on the pause card). */
  hint: string | null;
  /** D.D's picture and the line under it, on the two briefings. */
  portrait?: { name: string; caption: string };
  /** The title screen's controls grid; each entry lists the key caps that share one label. */
  controls?: Array<{ keys: string[]; label: string }>;
  actions: PanelAction[];
  /** The button that takes keyboard focus when the panel appears. */
  initialFocus?: UiAction;
}

function button(id: UiAction, label: Key, kind: PanelAction['kind'], sub?: Key): PanelAction {
  const { icon, label: text } = splitLead(t(label));
  return { id, label: text, lead: icon, kind, ...(sub && { sub: t(sub) }) };
}

const stat = (label: Key, value: string | number) => ({ label: t(label), value: String(value) });

function titlePanel(): PanelModel {
  return withKey<PanelModel>({
    kind: 'title',
    eyebrow: t('title.eyebrow'), chip: '01', eyebrowExtra: '1994',
    title: 'RINGSTORP RUN', titleAccent: null,
    subtitle: t('title.subtitle'),
    body: t('title.story'),
    bullets: [], stats: [],
    hint: t('title.hint'),
    controls: [
      { keys: ['WASD', '↑↓←→'], label: t('title.walk') },
      { keys: ['SPACE'], label: t('title.jump') },
      { keys: ['J'], label: t('title.punch') },
      { keys: ['K'], label: t('title.dodge') },
    ],
    actions: [
      button('start', 'title.start', 'primary'),
      button('start-2', 'title.level2', 'secondary', 'title.level2Hint'),
      button('start-3', 'title.level3', 'secondary', 'title.level3Hint'),
    ],
  });
}

function godsBriefing(): PanelModel {
  return withKey<PanelModel>({
    kind: 'gods-briefing',
    eyebrow: t('brief.eyebrow'), chip: '02',
    title: t('brief.title'), titleAccent: 'blink',
    body: t('brief.text'),
    bullets: [t('brief.one'), t('brief.two'), t('brief.three')], stats: [],
    hint: t('brief.hint'),
    portrait: { name: DD_CONTACT, caption: DD_NUMBER },
    actions: [button('answer', 'brief.answer', 'primary'), button('back', 'brief.back', 'secondary')],
    initialFocus: 'answer',
  });
}

function heistBriefing(): PanelModel {
  return withKey<PanelModel>({
    kind: 'heist-briefing',
    eyebrow: t('brief3.eyebrow'), chip: '03',
    title: t('brief3.title'), titleAccent: 'blink',
    body: t('brief3.text'),
    bullets: [t('brief3.one'), t('brief3.two'), t('brief3.three')], stats: [],
    hint: t('brief.hint'),
    portrait: { name: DD_CONTACT, caption: t('brief3.you') },
    actions: [button('answer-3', 'brief3.answer', 'primary'), button('back', 'brief.back', 'secondary')],
    initialFocus: 'answer-3',
  });
}

function pausePanel(): PanelModel {
  return withKey<PanelModel>({
    kind: 'pause',
    eyebrow: t('pause.eyebrow'),
    title: t('pause.title'), titleAccent: 'blink',
    body: t('pause.text'),
    bullets: [], stats: [],
    hint: t('pause.hint'),
    actions: [button('resume', 'pause.resume', 'primary'), button('restart', 'pause.restart', 'secondary')],
  });
}

/** The result cards all share this shape: a stop-punctuated title, a paragraph, three stats and one or two buttons. */
function outcome(
  kind: PanelKind, eyebrow: Key, title: string, accent: 'gold' | 'red', body: string,
  stats: PanelModel['stats'], actions: PanelAction[], hint: Key | null,
): PanelModel {
  return withKey<PanelModel>({
    kind, eyebrow: t(eyebrow), title, titleAccent: accent, body, bullets: [], stats,
    hint: hint && t(hint), actions,
  });
}

function heistVictory({ game }: UiContext): PanelModel {
  const h = game.heist;
  const dmg = h.damageTaken ? t('win3.dmg', { n: h.damageTaken }) : '';
  return outcome('victory-3', 'win3.eyebrow', t('win.title'), 'gold', t('win3.text', { n: h.delivered, dmg, pay: h.payout }), [
    stat('win.time', formatTime(game.elapsed)), stat('win3.crates', h.delivered), stat('win3.pay', `${h.payout} KR`),
  ], [button('restart', 'win3.again', 'primary'), button('menu', 'win2.menu', 'secondary')], 'win3.hint');
}

function heistDefeat({ game }: UiContext): PanelModel {
  const h = game.heist, why = h.failure ?? 'busted';
  return outcome('defeat-3', 'lose3.eyebrow', t(why === 'wrecked' ? 'lose3.wrecked' : 'lose3.busted'), 'red',
    t(`lose3.${why}.text` as Key, { fine: h.fine }), [
      stat('win.time', formatTime(game.elapsed)), stat('lose3.crates', h.crates), stat('lose3.fine', `${h.fine} KR`),
    ], [button('restart', 'lose3.again', 'primary'), button('menu', 'win2.menu', 'secondary')], 'lose3.hint');
}

function godsVictory({ game }: UiContext): PanelModel {
  const g2 = game.gods;
  const spotted = g2.spotted ? t('win2.spotted', { n: g2.spotted }) : '';
  return outcome('victory-2', 'win2.eyebrow', t('win.title'), 'gold', t('win2.text', { pay: g2.payout, n: g2.assignment, spotted }), [
    stat('win.time', formatTime(game.elapsed)), stat('win2.pay', `${g2.payout} KR`), stat('win2.cash', `${game.cash} KR`),
  ], [button('restart', 'win2.next', 'primary'), button('menu', 'win2.menu', 'secondary')], 'win2.nextHint');
}

function packageVictory({ game }: UiContext): PanelModel {
  const withPatch = game.healed, withSupplies = game.shopHealed;
  const story = t('win.base') + (withPatch ? t('win.withPatch') : '') + (withSupplies ? t(withPatch ? 'win.andSupplies' : 'win.withSupplies') : '')
    + (game.metDD ? t('win.dd') : '') + (game.fines ? t('win.fined', { points: game.fines * FINE }) : '') + '.';
  return outcome('victory-1', 'win.eyebrow', t('win.title'), 'gold', story, [
    stat('win.time', formatTime(game.elapsed)), stat('win.crews', game.koCount), stat('win.score', padScore(game.score)),
  ], [button('restart', 'win.again', 'primary')], 'win.againHint');
}

/** Also what a lost Gods run shows, as it did in the DOM. */
function packageDefeat({ game }: UiContext): PanelModel {
  const checkpoint = game.checkpoint !== null;
  return outcome('defeat-1', 'lose.eyebrow', t('lose.title'), 'red', t(checkpoint ? 'lose.checkpoint' : 'lose.nocheckpoint'), [
    stat('win.time', formatTime(game.elapsed)), stat('lose.package', t(game.hasPackage ? 'lose.carried' : 'lose.atKiosk')), stat('win.crews', game.koCount),
  ], checkpoint
    ? [button('continue', 'lose.continue', 'primary'), button('restart', 'lose.startOver', 'secondary')]
    : [button('restart', 'lose.retry', 'primary')], checkpoint ? null : 'lose.retryHint');
}

/** The overlay for the current mode, or null while the game is being played. */
export function panelModel(ctx: UiContext): PanelModel | null {
  const { game, titleView } = ctx;
  switch (game.mode) {
    case 'playing': return null;
    case 'title': return titleView === 'heist' ? heistBriefing() : titleView === 'gods' ? godsBriefing() : titlePanel();
    case 'paused': return pausePanel();
    case 'victory': return game.level === 3 ? heistVictory(ctx) : game.level === 2 ? godsVictory(ctx) : packageVictory(ctx);
    case 'defeat': return game.level === 3 ? heistDefeat(ctx) : packageDefeat(ctx);
  }
}
