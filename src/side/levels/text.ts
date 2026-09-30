import { getLang, t } from '../i18n';
import type { LevelText } from './types';

/** A level's text in the current language. */
export function levelText(value: LevelText): string {
  return typeof value === 'string' ? t(value) : value[getLang()];
}
