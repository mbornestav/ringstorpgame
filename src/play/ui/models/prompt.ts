import { CLIP, REFILL_PRICE, type SideGame } from '../../../side/game';
import { HEIST } from '../../../side/heist-config';
import { t, type Key } from '../../../side/i18n';
import { withKey, type UiContext } from './base';

/** The "street choice" bar above the road: what E would do here, and whether it can be done yet. */
export interface PromptModel {
  key: string;
  id: 'interact';
  small: string;
  title: string;
  sub: string;
  button: { label: string; keyLabel: 'E'; aria: string; enabled: boolean };
}

type Draft = Omit<PromptModel, 'key' | 'id'>;

/** Arguments in reading order: the three text lines, then the button's word, its spoken name and whether it works yet. */
const draft = (small: string, title: string, sub: string, label: string, aria: string, enabled: boolean): Draft =>
  ({ small, title, sub, button: { label, keyLabel: 'E', aria, enabled } });

/** The BMW that would be worth waving at, if one is passing near the screen. */
const passingBmw = (game: SideGame) =>
  game.cars.find(c => c.kind === 'bmw' && c.state === 'driving' && !c.handed && !c.delivery && c.x > game.camera - 60 && c.x < game.camera + 540);

/** Only one variant shows at a time, in this order of priority. */
function choice(game: SideGame): Draft | null {
  if (game.mode !== 'playing') return null;
  const action = game.interaction;
  if (game.level === 3) {
    return action ? draft(t('top.level3'), action.label, t('h.crates', { n: game.heist.crates, max: HEIST.trunk }), t('choice2.use'), action.label, true) : null;
  }
  if (game.level === 2) {
    if (!action) return null;
    const g2 = game.gods;
    const state = g2.hidden ? 'cargo.hidden' : g2.cargo === 'carried' ? 'cargo.carried' : g2.cargo === 'stashed' ? 'cargo.stashed' : 'cargo.none';
    return draft(t('choice2.small'), action.label, t(state), t('choice2.use'), action.label, true);
  }
  if (game.dealerNearby) {
    return draft(t('choice.ddSmall'), t('choice.ddTitle', { clip: CLIP, price: REFILL_PRICE }), t('choice.ddHint', { cash: game.cash }),
      t('choice.talk'), t('choice.ddAria'), action?.kind === 'ammo');
  }
  const bmw = passingBmw(game);
  if (bmw) {
    const near = action?.kind === 'hail';
    return draft(t(bmw.dir > 0 ? 'choice.bmwFrom' : 'choice.bmwTowards'), t('choice.bmwTitle'), t(near ? 'choice.bmwNear' : 'choice.bmwFar'),
      t('choice.wave'), t('choice.bmwAria'), near);
  }
  const junction = game.junctionAhead;
  if (junction) {
    const distance = Math.max(0, Math.ceil((junction.x - game.player.x) / 60) * 5);
    const place = junction.id === 'romares' ? 'Marcus A' : 'Kurir Livs';
    const turning = action?.kind === 'turn';
    return draft(
      `${junction.street.toUpperCase()}${distance > 5 ? ` · ${distance} M` : ` · ${t('choice.junction')}`}`,
      `↗ ${t(junction.turn as Key)}`,
      t('choice.keepWalking', { straight: t(junction.straight as Key) }),
      t(game.active ? 'choice.clearCrew' : turning ? 'choice.turn' : 'choice.approach'),
      t('choice.turnAria', { place }),
      turning,
    );
  }
  if (game.stage.shopX !== null && Math.abs(game.player.x - game.stage.shopX) < 150) {
    return draft('ICA NÄRA · KURIR LIVS', t(game.shopHealed ? 'choice.shopTitleDone' : 'choice.shopTitle'),
      action?.kind === 'shop' ? action.label : t('choice.shopHint'),
      t('choice.shopButton'), t('choice.shopAria'),
      action?.kind === 'shop' && !game.shopHealed && game.player.hp < game.player.maxHp);
  }
  return null;
}

/** The street choice bar, or null when there is nothing to choose. */
export function promptModel({ game }: UiContext): PromptModel | null {
  const shown = choice(game);
  return shown && withKey<PromptModel>({ id: 'interact', ...shown });
}
