import { CLIP, DD_CONTACT, DD_NUMBER, REFILL_PRICE, type SideGame } from './game';
import { rect, text, textWidth } from './pixel';
import { getLang, t } from './i18n';
import './phone.css';

const PW = 60, PH = 136;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

/** The handset as pixel art: a chunky grey brick with a green LCD, drawn at 60x130 and scaled up by CSS. */
function drawHandset(c: CanvasRenderingContext2D, lcd: { contact: string; number: string; status: string }): void {
  c.clearRect(0, 0, PW, PH);
  // aerial
  rect(c, 5, 0, 7, 20, '#141b1c'); rect(c, 6, 1, 2, 18, '#3c4645'); rect(c, 5, 15, 7, 3, '#294b8a');
  // body
  rect(c, 0, 16, PW, PH - 16, '#121a18');
  rect(c, 1, 17, PW - 3, PH - 19, '#59625a'); rect(c, 3, 19, PW - 7, PH - 23, '#3b443d');
  rect(c, PW - 3, 18, 2, PH - 19, '#1d2620'); rect(c, 1, PH - 3, PW - 2, 2, '#1d2620');
  // earpiece
  for (let i = 0; i < 3; i++) rect(c, 18, 21 + i * 2, 24, 1, '#141b17');
  text(c, 'GH337', 34, 28, '#b8c0b5');
  // LCD
  rect(c, 5, 34, 50, 34, '#1a3456'); rect(c, 6, 35, 48, 32, '#9fae42'); rect(c, 6, 35, 48, 1, '#839634'); rect(c, 6, 35, 1, 32, '#839634');
  const ink = '#31441c';
  rect(c, 8, 37, 1, 1, ink); rect(c, 9, 36, 1, 2, ink); rect(c, 10, 35, 1, 3, ink);
  text(c, 'SE·GSM', 19, 37, '#516228'); rect(c, 46, 37, 6, 3, ink);
  text(c, lcd.contact, 30 - Math.floor(textWidth(lcd.contact, 2) / 2), 42, ink, 2);
  text(c, lcd.number, 30 - Math.floor(textWidth(lcd.number) / 2), 54, ink);
  text(c, lcd.status, 30 - Math.floor(textWidth(lcd.status) / 2), 60, ink);
  // YES / NO keys, nav keys, keypad
  const key = (x: number, y: number, w: number, h: number, label: string) => {
    rect(c, x, y, w, h, '#0a100c'); rect(c, x, y, w, h - 1, '#a1b52f'); rect(c, x + 1, y + 1, w - 2, h - 3, '#2b352c');
    text(c, label, x + Math.floor((w - textWidth(label)) / 2), y + Math.floor((h - 5) / 2), '#d5dbb7');
  };
  key(8, 72, 20, 9, 'YES'); key(32, 72, 20, 9, 'NO');
  key(8, 84, 12, 7, '<'); key(24, 84, 12, 7, 'CLR'); key(40, 84, 12, 7, '>');
  KEYS.forEach((k, i) => key(8 + (i % 3) * 16, 94 + Math.floor(i / 3) * 9, 12, 8, k));
  text(c, 'ERICSSON', 30 - Math.floor(textWidth('ERICSSON') / 2), 130, '#bec6be');
}

/** A local, in-game handset. The number is display text; it never opens a telephone link. */
export class PhoneUI {
  private readonly dialog: HTMLElement;
  private isOpen = false;
  private readonly status: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly wallet: HTMLElement;
  private readonly rounds: HTMLElement;
  private readonly handset: CanvasRenderingContext2D;
  private lcdKey = '';
  private readonly yes: HTMLButtonElement;
  private readonly action: HTMLButtonElement;
  private readonly cancel: HTMLButtonElement;
  private previousFocus: HTMLElement | null = null;
  private receipt = false;

  constructor(private readonly game: SideGame, private readonly onInput: () => void, parent: HTMLElement) {
    this.dialog = document.createElement('aside');
    this.dialog.className = 'phone-drawer';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-label', t('ph.dialog'));
    this.dialog.inert = true;
    this.dialog.innerHTML = `
      <div class="phone-layout">
        <div class="handset-space" role="group" aria-label="${t('ph.handset')}">
          <canvas class="handset" width="${PW}" height="${PH}" aria-hidden="true"></canvas>
          <button type="button" class="phone-key phone-yes" aria-label="${t('ph.callAria')}"></button>
          <button type="button" class="phone-key phone-no" aria-label="${t('ph.away')}"></button>
          <div class="sr-only"><strong class="lcd-contact">${DD_CONTACT}</strong> <span class="lcd-number">${DD_NUMBER}</span> <span class="lcd-status" aria-live="polite"></span></div>
        </div>
        <div class="phone-copy">
          <p class="phone-wallet"></p>
          <p class="phone-hint" aria-live="polite"></p>
          <button type="button" class="primary-button phone-action">${t('ph.call')}</button>
          <button type="button" class="phone-cancel" hidden>${t('ph.cancelVisit')}</button>
          <button type="button" class="phone-pocket">${t('ph.putAway')}</button>
          <span class="phone-rounds"></span>
        </div>
      </div>`;
    parent.append(this.dialog);
    this.status = this.dialog.querySelector('.lcd-status')!;
    this.hint = this.dialog.querySelector('.phone-hint')!;
    this.wallet = this.dialog.querySelector('.phone-wallet')!;
    this.rounds = this.dialog.querySelector('.phone-rounds')!;
    this.handset = this.dialog.querySelector<HTMLCanvasElement>('.handset')!.getContext('2d')!;
    this.yes = this.dialog.querySelector('.phone-yes')!;
    this.action = this.dialog.querySelector('.phone-action')!;
    this.cancel = this.dialog.querySelector('.phone-cancel')!;
    for (const button of [this.yes, this.action]) button.addEventListener('click', () => {
      onInput();
      if (game.dealerNearby) this.receipt = game.buyAmmo();
      else { this.receipt = false; game.callDD(); }
      this.sync();
    });
    this.cancel.addEventListener('click', () => { onInput(); game.dismissDD(); this.sync(); });
    this.dialog.querySelectorAll('.phone-no, .phone-pocket').forEach(button => button.addEventListener('click', () => this.close()));
  }

  /** Re-applies the static text after a language change. */
  relabel(): void {
    this.dialog.setAttribute('aria-label', t('ph.dialog'));
    this.dialog.querySelector('.handset-space')!.setAttribute('aria-label', t('ph.handset'));
    this.dialog.querySelector('.phone-no')!.setAttribute('aria-label', t('ph.away'));
    this.dialog.querySelector('.phone-pocket')!.innerHTML = t('ph.putAway');
    this.lcdKey = '';
    this.sync();
  }

  toggle(): void {
    this.onInput();
    if (!this.game.hasPhone) return;
    if (this.game.phoneOpen) this.game.closePhone();
    else this.game.openPhone();
    this.sync();
  }

  close(): void { this.onInput(); this.game.closePhone(); this.sync(); }

  sync(): void {
    const g = this.game;
    const visible = g.phoneOpen && g.mode === 'playing';
    if (visible && !this.isOpen) {
      this.isOpen = true;
      this.receipt = false;
      this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.dialog.inert = false;
      this.dialog.classList.add('open');
      this.yes.focus({ preventScroll: true });
    } else if (!visible && this.isOpen) {
      this.isOpen = false;
      this.dialog.inert = true;
      this.dialog.classList.remove('open');
      this.previousFocus?.focus({ preventScroll: true });
    }
    if (!visible) return;
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
    if (this.receipt) { status = t('ph.refilled'); hint = t('ph.hintRefilled', { clip: CLIP, price: REFILL_PRICE }); }
    // Don't re-announce unchanged live-region text on every animation frame.
    const setText = (el: HTMLElement, value: string) => { if (el.textContent !== value) el.textContent = value; };
    setText(this.status, status);
    const lcdKey = `${getLang()}:${status}`;
    if (lcdKey !== this.lcdKey) { this.lcdKey = lcdKey; drawHandset(this.handset, { contact: DD_CONTACT, number: DD_NUMBER, status }); }
    setText(this.hint, hint);
    setText(this.wallet, t('ph.wallet', { cash: g.cash }));
    setText(this.rounds, t('ph.carrying', { ammo: g.ammo, clip: CLIP }));
    setText(this.action, action);
    this.yes.disabled = this.action.disabled = disabled;
    this.yes.setAttribute('aria-label', g.dealerNearby ? t('ph.buyAria', { price: REFILL_PRICE }) : t('ph.callAria'));
    this.cancel.hidden = (!g.delivery || g.delivery.state === 'leaving') && g.phoneCall === 'idle';
    setText(this.cancel, t(g.dealerNearby ? 'ph.sendAway' : 'ph.cancelCall'));
  }
}
