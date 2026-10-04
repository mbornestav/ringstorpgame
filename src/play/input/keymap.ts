import type { Mode } from '../../game';
import { floorAction, type TitleView, type UiAction } from '../actions';

/** What a key press means, decided without touching the DOM or Phaser (a straight port of side/main.ts's keydown handler). */
export interface KeyContext {
  mode: Mode;
  level: 1 | 2 | 3;
  hasPhone: boolean;
  phoneOpen: boolean;
  titleView: TitleView;
  hasCheckpoint: boolean;
  /** A focused UI button takes Enter and Space for itself. */
  buttonFocused: boolean;
}

export type QueuedAction = 'attack' | 'dodge' | 'shot' | 'jump';
export type Command = { ui: UiAction } | { queue: QueuedAction };

export interface KeyDecision {
  commands: Command[];
  /** True when the key should join the held set (movement, sneak, use). */
  hold: boolean;
}

export interface Modifiers { ctrl: boolean; meta: boolean; alt: boolean }

const NOTHING: KeyDecision = { commands: [], hold: false };

/** `key` is `KeyboardEvent.key` lower-cased, so it follows the keyboard layout as the original did. */
export function decideKey(key: string, repeat: boolean, mods: Modifiers, ctx: KeyContext): KeyDecision {
  if (mods.ctrl || mods.meta || mods.alt) return NOTHING;
  if ((key === 'f' && ctx.hasPhone) || (key === 'escape' && ctx.phoneOpen)) {
    return repeat ? NOTHING : { commands: [{ ui: 'phone' }], hold: false };
  }
  if (ctx.phoneOpen) {
    if (repeat) return NOTHING;
    if (key === 'm') return { commands: [{ ui: 'sound' }], hold: false };
    // T calls the taxi (Karlstad).
    if (key === 't') return { commands: [{ ui: 'phone-taxi' }], hold: false };
    return NOTHING;
  }
  if ((key === 'enter' || key === ' ') && ctx.buttonFocused) return NOTHING;

  const commands: Command[] = [];
  const playing = ctx.mode === 'playing';
  if (key === 'e' && !repeat && playing) commands.push({ ui: 'interact' });
  if (ctx.level === 2 && playing && /^[0-8]$/.test(key) && !repeat) commands.push({ ui: floorAction(Number(key)) });
  if (key === 'm' && !repeat) commands.push({ ui: 'sound' });
  if (key === 'escape' && !repeat) commands.push({ ui: 'pause' });
  if (key === 'enter' && !repeat) {
    if (ctx.mode === 'defeat' && ctx.hasCheckpoint) commands.push({ ui: 'continue' });
    else if (ctx.mode === 'title' && ctx.titleView === 'gods') commands.push({ ui: 'answer' });
    else if (ctx.mode === 'title' && ctx.titleView === 'heist') commands.push({ ui: 'answer-3' });
    else if (ctx.mode === 'title' || ctx.mode === 'victory' || ctx.mode === 'defeat') commands.push({ ui: 'restart' });
  }
  if (key === 'escape' && !repeat && ctx.mode === 'title' && ctx.titleView !== 'main') commands.push({ ui: 'back' });
  if (playing && !repeat) {
    if (key === 'j') commands.push({ queue: 'attack' });
    if (key === 'k') commands.push({ queue: 'dodge' });
    if (key === 'i') commands.push({ queue: 'shot' });
    if (key === ' ' || key === 'l') commands.push({ queue: 'jump' });
  }
  return { commands, hold: true };
}

/** Keys the game reads while held. */
export function movementFrom(held: ReadonlySet<string>): { x: number; y: number; sneak: boolean; use: boolean } {
  const x = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
  const y = Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup'));
  return { x, y, sneak: held.has('shift'), use: held.has('e') };
}
