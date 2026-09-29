import type { SideGame } from '../../../side/game';
import { getLang } from '../../../side/i18n';
import type { TitleView } from '../../actions';

/** What the presentation models read. A Session satisfies it as it is, and so does a plain object in a test. */
export interface UiContext {
  game: SideGame;
  titleView: TitleView;
  phoneReceipt: boolean;
  muted: boolean;
}

/** Changes whenever a model's content or the language does, so a renderer can skip redrawing an unchanged model. */
export function modelKey(model: object): string {
  return `${getLang()}|${JSON.stringify(model)}`;
}

/** Stamps a finished model with its `key`. */
export function withKey<T extends { key: string }>(model: Omit<T, 'key'>): T {
  return { ...model, key: modelKey(model) } as T;
}

/** `filled` of `max` pips, clamped so a bar can never overflow. */
export interface Meter { filled: number; max: number }
export const meter = (filled: number, max: number): Meter => ({ filled: Math.max(0, Math.min(max, filled)), max });

/** Scores and the best run are shown as five digits. */
export const padScore = (value: number): string => value.toString().padStart(5, '0');
