import type { UiAction } from '../actions';
import type { Session } from '../session';
import { familyText } from '../family/text';
import type { HudModel, MastheadModel, PanelModel, PhoneModel, PromptModel, WorldHudModel, ControlHint, FooterModel } from '../ui/models';

export interface MirrorState {
  masthead: MastheadModel;
  hud: HudModel;
  panel: PanelModel | null;
  prompt: PromptModel | null;
  phone: PhoneModel;
  controls: ControlHint[];
  footer: FooterModel;
  world: WorldHudModel;
}

const set = (el: HTMLElement, value: string): void => { if (el.textContent !== value) el.textContent = value; };
const show = (el: HTMLElement, visible: boolean): void => { el.hidden = !visible; el.inert = !visible; };

/** Builds `<tag class id ...>` with attributes; small enough to keep the markup below readable. */
function make<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  parent?.append(el);
  return el;
}

/**
 * A visually hidden copy of the canvas interface in real DOM: headings, live regions and buttons. Screen readers announce it,
 * keyboard users Tab through it, and its buttons are the only elements that ever hold DOM focus. Each activation goes through
 * the same `Session.dispatch` as a click on the canvas, and the canvas draws a focus ring on whatever the DOM has focused.
 */
export class A11yMirror {
  private readonly status: HTMLElement;
  private readonly lang: HTMLButtonElement;
  private readonly sound: HTMLButtonElement;
  private readonly chooser: HTMLButtonElement;
  private readonly level: HTMLElement;
  private readonly street: HTMLElement;
  private readonly life: HTMLElement;
  private readonly objective: HTMLElement;
  private readonly time: HTMLElement;
  private readonly score: HTMLElement;
  private readonly ammo: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly panelTitle: HTMLElement;
  private readonly panelBody: HTMLElement;
  private readonly panelPortrait: HTMLElement;
  private readonly panelList: HTMLElement;
  private readonly panelActions: HTMLElement;
  private readonly promptBox: HTMLElement;
  private readonly promptText: HTMLElement;
  private readonly promptButton: HTMLButtonElement;
  private readonly launcher: HTMLButtonElement;
  private readonly phone: HTMLElement;
  private readonly lcdContact: HTMLElement;
  private readonly lcdNumber: HTMLElement;
  private readonly lcdStatus: HTMLElement;
  private readonly yes: HTMLButtonElement;
  private readonly no: HTMLButtonElement;
  private readonly phoneAction: HTMLButtonElement;
  private readonly phoneCancel: HTMLButtonElement;
  private readonly phoneTaxi: HTMLButtonElement;
  private readonly phonePocket: HTMLButtonElement;
  private readonly phoneWallet: HTMLElement;
  private readonly phoneHint: HTMLElement;
  private readonly phoneRounds: HTMLElement;
  private readonly controls: HTMLElement;
  private readonly footer: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly abort = new AbortController();
  private panelKey = '';
  private panelKind = '';
  private toast = '';
  private phoneOpen = false;
  private beforePhone: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement, private readonly session: Session, private readonly onFocus: (id: string | null) => void) {
    root.replaceChildren();
    this.heading = make('h1', { class: 'sr-only' }, root);
    this.status = make('p', { id: 'a11y-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, root);

    const head = make('div', { role: 'group', id: 'a11y-masthead' }, root);
    this.lang = make('button', { type: 'button', 'data-action': 'lang' }, head);
    this.sound = make('button', { type: 'button', 'data-action': 'sound' }, head);
    this.chooser = make('button', { type: 'button', 'data-action': 'chooser' }, head);
    this.level = make('p', { id: 'a11y-level' }, root);
    this.street = make('p', { id: 'a11y-street' }, root);
    this.life = make('p', { id: 'a11y-life' }, root);
    this.objective = make('p', { id: 'a11y-objective', 'aria-live': 'polite' }, root);
    const clock = make('p', { id: 'a11y-clock' }, root);
    this.time = make('span', { id: 'a11y-time' }, clock);
    clock.append(' ');
    this.score = make('span', { id: 'a11y-score' }, clock);
    this.ammo = make('p', { id: 'a11y-ammo' }, root);

    this.panel = make('section', { id: 'a11y-panel', role: 'dialog', 'aria-labelledby': 'a11y-panel-title', hidden: '' }, root);
    this.panelTitle = make('h2', { id: 'a11y-panel-title' }, this.panel);
    this.panelBody = make('p', { id: 'a11y-panel-body' }, this.panel);
    this.panelPortrait = make('div', { role: 'img', hidden: '' }, this.panel);
    this.panelList = make('ul', { id: 'a11y-panel-list' }, this.panel);
    this.panelActions = make('div', { id: 'a11y-panel-actions' }, this.panel);

    this.promptBox = make('div', { id: 'a11y-prompt', 'aria-live': 'polite' }, root);
    this.promptText = make('p', {}, this.promptBox);
    this.promptButton = make('button', { type: 'button', 'data-action': 'interact' }, this.promptBox);
    this.launcher = make('button', { type: 'button', 'data-action': 'phone', id: 'a11y-phone-launcher' }, root);

    this.phone = make('aside', { class: 'phone-drawer', role: 'dialog', hidden: '' }, root);
    const handset = make('div', { role: 'group' }, this.phone);
    this.yes = make('button', { type: 'button', class: 'phone-key phone-yes', 'data-action': 'phone-call' }, handset);
    this.no = make('button', { type: 'button', class: 'phone-key phone-no', 'data-action': 'phone-away' }, handset);
    this.lcdContact = make('strong', { class: 'lcd-contact' }, handset);
    this.lcdNumber = make('span', { class: 'lcd-number' }, handset);
    this.lcdStatus = make('span', { class: 'lcd-status', 'aria-live': 'polite' }, handset);
    this.phoneWallet = make('p', { class: 'phone-wallet' }, this.phone);
    this.phoneHint = make('p', { class: 'phone-hint', 'aria-live': 'polite' }, this.phone);
    this.phoneAction = make('button', { type: 'button', class: 'phone-action', 'data-action': 'phone-call' }, this.phone);
    this.phoneTaxi = make('button', { type: 'button', class: 'phone-taxi', 'data-action': 'phone-taxi' }, this.phone);
    this.phoneCancel = make('button', { type: 'button', class: 'phone-cancel', 'data-action': 'phone-cancel' }, this.phone);
    this.phonePocket = make('button', { type: 'button', class: 'phone-pocket', 'data-action': 'phone-away' }, this.phone);
    this.phoneRounds = make('span', { class: 'phone-rounds' }, this.phone);

    this.controls = make('ul', { id: 'a11y-controls' }, root);
    this.footer = make('footer', { id: 'a11y-footer' }, root);

    const { signal } = this.abort;
    // Enter and Space belong to the focused button. Phaser listens on the window and would act on them too.
    root.addEventListener('keydown', event => {
      if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) event.stopPropagation();
    }, { signal });
    root.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!button || button.disabled) return;
      // A mouse click has detail > 0; keyboard activation does not. After a mouse click, give the keys back to the game.
      this.session.dispatch(button.dataset.action as UiAction, event.detail > 0 ? 'pointer' : 'key');
      if (event.detail > 0) button.blur();
    }, { signal });
    root.addEventListener('focusin', event => this.onFocus((event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action ?? null), { signal });
    root.addEventListener('focusout', () => this.onFocus(null), { signal });
  }

  /** Re-applies every text and state from the current models. Cheap when nothing changed. */
  sync(s: MirrorState): void {
    const { masthead: m, hud, panel, prompt, phone, world } = s;
    document.documentElement.lang = m.htmlLang;
    document.title = m.pageTitle;
    set(this.heading, m.brand);
    this.root.setAttribute('aria-label', m.canvasLabel);
    set(this.lang, m.lang.label);
    this.lang.setAttribute('aria-label', m.lang.aria);
    this.lang.lang = m.lang.lang;
    set(this.sound, m.sound.label);
    set(this.chooser, familyText('menu'));
    this.sound.setAttribute('aria-label', m.sound.aria);
    set(this.level, hud.levelLine);
    set(this.street, hud.streetLine);
    show(this.life, hud.visible); show(this.objective, hud.visible); show(this.time.parentElement!, hud.visible); show(this.ammo, hud.visible);
    set(this.life, this.lifeText(hud.life));
    set(this.objective, hud.objective.text);
    set(this.time, hud.score.time);
    set(this.score, hud.score.value);
    const ammo = hud.life.kind === 'health' ? hud.life.ammo : null;
    set(this.ammo, ammo ? `${ammo.aria}${ammo.callHint ? ` ${ammo.callHint}` : ''}` : '');
    this.syncPanel(panel);
    this.syncPrompt(prompt);
    this.syncPhone(phone);
    this.controls.replaceChildren(...s.controls.map(c => { const li = document.createElement('li'); li.textContent = `${c.keys} ${c.label}`; return li; }));
    set(this.footer, `${s.footer.bestLabel} ${s.footer.best} · ${s.footer.credit}`);
    // A new toast is read out once.
    const toast = world.toast?.text ?? '';
    if (toast && toast !== this.toast) set(this.status, toast);
    this.toast = toast;
  }

  private lifeText(life: HudModel['life']): string {
    if (life.kind === 'health') return life.hearts.aria;
    if (life.kind === 'cargo') return `${life.status}${life.sneak ? ` · ${life.sneak}` : ''}`;
    const noise = life.noise ? ` · ${life.noise.label} ${life.noise.filled}/${life.noise.max}` : '';
    return `${life.crates}${life.carrying ? ` · ${life.carrying}` : ''} · ${life.car.label} ${life.car.filled}/${life.car.max}${noise}`;
  }

  private syncPanel(panel: PanelModel | null): void {
    show(this.panel, !!panel);
    if (!panel) { this.panelKey = ''; return; }
    if (panel.key === this.panelKey) return;
    const previousKind = this.panelKind;
    this.panelKey = panel.key;
    this.panelKind = panel.kind;
    this.panel.className = /^(victory|defeat)/.test(panel.kind) ? 'outcome-panel' : '';
    set(this.panelTitle, panel.title);
    set(this.panelBody, [panel.subtitle, panel.body].filter(Boolean).join(' '));
    show(this.panelPortrait, !!panel.portrait);
    if (panel.portrait) {
      this.panelPortrait.setAttribute('aria-label', panel.portrait.name);
      // Content gives the box a size, so it counts as showing; the picture itself is only on the canvas.
      this.panelPortrait.textContent = panel.portrait.caption;
    }
    const items = [...panel.bullets, ...panel.stats.map(s => `${s.label}: ${s.value}`), ...(panel.hint ? [panel.hint] : [])];
    this.panelList.replaceChildren(...items.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    this.panelActions.replaceChildren(...panel.actions.map(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.action = a.id;
      b.textContent = a.sub ? `${a.label}. ${a.sub}` : a.label;
      return b;
    }));
    set(this.status, `${panel.title}. ${panel.body}`);
    // Briefings focus their answer button, as they always have; going back to the menu focuses the level pick.
    const focus = panel.initialFocus ?? (previousKind.endsWith('briefing') && panel.kind === 'title' ? 'start-2' : null);
    if (focus) queueMicrotask(() => this.panelActions.querySelector<HTMLButtonElement>(`[data-action="${focus}"]`)?.focus({ preventScroll: true }));
  }

  private syncPrompt(prompt: PromptModel | null): void {
    show(this.promptBox, !!prompt);
    if (!prompt) return;
    set(this.promptText, `${prompt.small}. ${prompt.title}. ${prompt.sub}`);
    set(this.promptButton, prompt.button.label);
    this.promptButton.setAttribute('aria-label', prompt.button.aria);
    this.promptButton.disabled = !prompt.button.enabled;
  }

  private syncPhone(phone: PhoneModel): void {
    show(this.launcher, phone.launcher.visible && !phone.visible);
    set(this.launcher, `${phone.launcher.name} ${phone.launcher.cash}`);
    this.launcher.setAttribute('aria-label', phone.launcher.aria);
    this.phone.setAttribute('aria-label', phone.dialogLabel);
    (this.phone.firstElementChild as HTMLElement).setAttribute('aria-label', phone.handsetLabel);
    show(this.phone, phone.visible);
    set(this.lcdContact, phone.lcd.contact);
    set(this.lcdNumber, phone.lcd.number);
    set(this.lcdStatus, phone.lcd.status);
    set(this.phoneWallet, phone.wallet);
    set(this.phoneHint, phone.hint);
    set(this.phoneRounds, phone.rounds);
    set(this.phoneAction, phone.action.label);
    this.phoneAction.disabled = this.yes.disabled = phone.action.disabled;
    this.yes.setAttribute('aria-label', phone.yesAria);
    this.no.setAttribute('aria-label', phone.noAria);
    this.phoneTaxi.hidden = !phone.taxi.visible;
    set(this.phoneTaxi, phone.taxi.label);
    this.phoneTaxi.setAttribute('aria-label', phone.taxi.aria);
    this.phoneTaxi.disabled = phone.taxi.disabled;
    this.phoneCancel.hidden = !phone.cancel.visible;
    set(this.phoneCancel, phone.cancel.label);
    set(this.phonePocket, phone.pocketLabel);
    if (phone.visible && !this.phoneOpen) {
      this.beforePhone = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      queueMicrotask(() => this.yes.focus({ preventScroll: true }));
    } else if (!phone.visible && this.phoneOpen) this.beforePhone?.focus({ preventScroll: true });
    this.phoneOpen = phone.visible;
  }

  destroy(): void {
    this.abort.abort();
    this.root.replaceChildren();
  }
}
