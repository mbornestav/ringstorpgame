import { SideGame } from '../side/game';
import { getLang, setLang } from '../side/i18n';
import { floorOf, type ActionSource, type TitleView, type UiAction } from './actions';
import { readMuted, writeMuted } from './preferences';

type Listener = () => void;

/**
 * One SideGame plus the UI-only state that used to live in side/main.ts (which title page is showing, the phone receipt,
 * the mute switch), and the single command bus every input path goes through: keyboard, pointer, the ARIA proxies and the
 * test bridge. It does not import Phaser, so it can be exercised in plain Vitest.
 */
export class Session {
  section: 'ringstorp' | 'hub' = 'ringstorp';
  titleView: TitleView = 'main';
  /** Set once a refill has just been paid for, until the phone is next opened. */
  phoneReceipt = false;
  muted: boolean;

  private readonly clearers = new Set<Listener>();
  private readonly resetters = new Set<Listener>();
  private readonly changers = new Set<Listener>();

  constructor(readonly game: SideGame = new SideGame(), muted: boolean = readMuted()) {
    this.muted = muted;
  }

  /** Called whenever held keys must be forgotten (a menu press, a level start, the phone opening). */
  onClearInput(fn: Listener): () => void { this.clearers.add(fn); return () => { this.clearers.delete(fn); }; }
  /** Called when a fresh run begins, so the view can restart the title pan and camera. */
  onReset(fn: Listener): () => void { this.resetters.add(fn); return () => { this.resetters.delete(fn); }; }
  /** Called after every dispatched action, for anything that mirrors state. */
  onChange(fn: Listener): () => void { this.changers.add(fn); return () => { this.changers.delete(fn); }; }

  clearInput(): void { for (const fn of this.clearers) fn(); }
  private reset(): void { for (const fn of this.resetters) fn(); }

  /** Whether `action` means anything right now. Panels use this to enable buttons; the bridge uses it for click(). */
  available(action: UiAction): boolean {
    const g = this.game, mode = g.mode;
    const floor = floorOf(action);
    if (floor !== null) return g.level === 2 && mode === 'playing';
    switch (action) {
      case 'start': case 'restart': return mode !== 'playing';
      case 'start-2': case 'start-3': return mode === 'title' && this.titleView === 'main';
      case 'answer': return mode === 'title' && this.titleView === 'gods';
      case 'answer-3': return mode === 'title' && this.titleView === 'heist';
      case 'back': return mode === 'title' && this.titleView !== 'main';
      case 'menu': return mode !== 'title';
      case 'resume': return mode === 'paused';
      case 'continue': return mode === 'defeat' && g.checkpoint !== null;
      case 'pause': return mode === 'playing' || mode === 'paused';
      case 'interact': return mode === 'playing' && !g.phoneOpen;
      case 'sound': case 'lang': case 'chooser': return true;
      case 'phone': return mode === 'playing' && g.hasPhone;
      case 'phone-call': return mode === 'playing' && g.phoneOpen;
      case 'phone-cancel': return mode === 'playing' && g.phoneOpen;
      case 'phone-away': return mode === 'playing' && g.phoneOpen;
      default: return false;
    }
  }

  /** Runs `action` if it is available. Returns whether it was. */
  dispatch(action: UiAction, source: ActionSource = 'pointer'): boolean {
    if (!this.available(action)) return false;
    const g = this.game;
    const floor = floorOf(action);
    if (floor !== null) g.gods.pressFloor(floor);
    else switch (action) {
      case 'start': case 'restart': this.restart(); break;
      case 'start-2': this.showBriefing('gods'); break;
      case 'answer': this.clearInput(); this.titleView = 'main'; g.startGods(1); this.reset(); break;
      case 'start-3': this.showBriefing('heist'); break;
      case 'answer-3': this.clearInput(); this.titleView = 'main'; g.startHeist(); this.reset(); break;
      case 'back': this.showBriefing('main'); break;
      case 'menu': this.clearInput(); this.titleView = 'main'; g.toTitle(); this.reset(); break;
      case 'chooser': this.clearInput(); this.titleView = 'main'; g.toTitle(); this.section = 'hub'; break;
      case 'resume': case 'pause': g.togglePause(); break;
      case 'continue': this.clearInput(); g.continueFromCheckpoint(); break;
      case 'interact': if (source === 'pointer') this.clearInput(); g.interact(); break;
      case 'sound': this.setMuted(!this.muted); break;
      case 'lang': setLang(getLang() === 'en' ? 'sv' : 'en'); break;
      case 'phone': this.togglePhone(); break;
      case 'phone-call':
        this.clearInput();
        if (g.dealerNearby) this.phoneReceipt = g.buyAmmo();
        else { this.phoneReceipt = false; g.callDD(); }
        break;
      case 'phone-cancel': this.clearInput(); g.dismissDD(); break;
      case 'phone-away': this.clearInput(); g.closePhone(); break;
    }
    for (const fn of this.changers) fn();
    return true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeMuted(muted);
  }

  /** Losing focus pauses a running game and forgets held keys. */
  blur(): void {
    this.clearInput();
    if (this.game.mode === 'playing') this.dispatch('pause');
  }

  private restart(): void {
    const g = this.game;
    this.clearInput();
    // In the Gods run, restarting retries the same assignment; after a delivery it moves on to the next.
    if (g.level === 3) g.startHeist();
    else if (g.level === 2) g.startGods(g.gods.assignment + (g.mode === 'victory' ? 1 : 0));
    else g.start();
    this.reset();
  }

  private showBriefing(view: TitleView): void { this.titleView = view; }

  private togglePhone(): void {
    const g = this.game;
    this.clearInput();
    if (!g.hasPhone) return;
    if (g.phoneOpen) g.closePhone();
    else { this.phoneReceipt = false; g.openPhone(); }
  }
}
