import { CLIP, DD_CONTACT, DD_NUMBER, REFILL_PRICE } from '../../../side/game';
import { t } from '../../../side/i18n';
import { plain } from '../text';
import { withKey, type UiContext } from './base';

/** The Ericsson GH337: its launcher button, and the drawer with the handset, the hints and the buttons. */
export interface PhoneModel {
  key: string;
  /** The drawer is open. */
  visible: boolean;
  launcher: { visible: boolean; aria: string; keyLabel: 'F'; name: 'GH337'; cash: string };
  dialogLabel: string;
  handsetLabel: string;
  /** The green screen of the handset. */
  lcd: { contact: string; number: string; status: string };
  wallet: string;
  hint: string;
  rounds: string;
  /** The handset's YES key. It is disabled together with `action`. */
  yesAria: string;
  noAria: string;
  action: { label: string; disabled: boolean };
  /** Karlstad: the taxi to the bus station. */
  taxi: { visible: boolean; label: string; aria: string; disabled: boolean };
  cancel: { visible: boolean; label: string };
  pocketLabel: string;
}

/** The phone as `PhoneUI.sync` presented it: what the screen, the hint and the main button say for each stage of a visit. */
export function phoneModel({ game: g, phoneReceipt }: UiContext): PhoneModel {
  let status = t('ph.ready'), hint = t('ph.hintReady'), action = t('ph.call'), disabled = false;
  if (g.phoneCall === 'dialing') { status = t('ph.dialing'); hint = t('ph.hintDialing'); disabled = true; }
  else if (g.phoneCall === 'ringing') { status = t('ph.ringing'); hint = t('ph.hintRinging'); disabled = true; }
  else if (g.phoneCall === 'connected') { status = t('ph.connected'); hint = t('ph.hintConnected', { price: REFILL_PRICE }); disabled = true; }
  if (g.delivery) {
    action = t('ph.hisWay'); disabled = true;
    if (g.delivery.state === 'leaving') { status = t('ph.seeYou'); hint = t('ph.hintLeaving'); action = t('ph.bye'); }
    else if (g.dealerNearby) {
      status = t('ph.here'); action = t('ph.buy', { price: REFILL_PRICE });
      hint = g.ammo >= CLIP ? t('ph.hintFull') : g.cash < REFILL_PRICE ? t('ph.hintBroke', { more: REFILL_PRICE - g.cash }) : t('ph.hintOffer');
      disabled = !g.canBuyAmmo;
    } else if (g.phoneCall === 'idle') { status = t('ph.onMyWay'); hint = t('ph.hintComing'); }
  } else if (disabled) action = t('ph.calling');
  if (phoneReceipt) { status = t('ph.refilled'); hint = t('ph.hintRefilled', { clip: CLIP, price: REFILL_PRICE }); }
  // Karlstad before D.D has given his number: the phone is for the taxi.
  const taxiPhone = !!g.custom?.busHome, noDD = taxiPhone && !g.metDD && !g.delivery;
  if (noDD) { action = t('ph.noDD'); disabled = true; status = t('ph.ready'); hint = t('ph.hintTaxi'); }
  else if (taxiPhone && g.phoneCall === 'idle' && !g.delivery && !phoneReceipt) hint = `${hint} ${t('ph.hintTaxi')}`;
  return withKey<PhoneModel>({
    visible: g.phoneOpen && g.mode === 'playing',
    launcher: { visible: g.mode === 'playing' && g.hasPhone, aria: t('phone.open'), keyLabel: 'F', name: 'GH337', cash: `${g.cash} KR` },
    dialogLabel: t('ph.dialog'),
    handsetLabel: t('ph.handset'),
    lcd: noDD ? { contact: t('ph.taxiContact'), number: '054-12 34 56', status } : { contact: DD_CONTACT, number: DD_NUMBER, status },
    wallet: t('ph.wallet', { cash: g.cash }),
    hint,
    rounds: t('ph.carrying', { ammo: g.ammo, clip: CLIP }),
    yesAria: g.dealerNearby ? t('ph.buyAria', { price: REFILL_PRICE }) : t('ph.callAria'),
    noAria: t('ph.away'),
    action: { label: action, disabled },
    taxi: { visible: taxiPhone, label: t('ph.taxi'), aria: t('ph.taxiAria'), disabled: !g.canTaxi },
    cancel: {
      visible: !((!g.delivery || g.delivery.state === 'leaving') && g.phoneCall === 'idle'),
      label: t(g.dealerNearby ? 'ph.sendAway' : 'ph.cancelCall'),
    },
    pocketLabel: plain(t('ph.putAway')),
  });
}
