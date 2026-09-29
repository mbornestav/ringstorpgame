import { afterEach, describe, expect, it } from 'vitest';
import { TABLE_KEYS, getLang, setLang, t, tableFor } from '../src/side/i18n';
import { SideGame } from '../src/side/game';

afterEach(() => setLang('en'));

describe('translation', () => {
  it('has a Swedish entry for every key, with the same placeholders', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    for (const key of TABLE_KEYS) {
      expect(tableFor('sv')[key], key).toBeTruthy();
      expect(placeholders(tableFor('sv')[key]), key).toEqual(placeholders(tableFor('en')[key]));
    }
  });

  it('defaults to English and fills placeholders', () => {
    expect(getLang()).toBe('en');
    expect(t('ph.wallet', { cash: 200 })).toBe('YOUR CASH  200 KR');
    setLang('sv');
    expect(t('ph.wallet', { cash: 200 })).toBe('DINA PENGAR  200 KR');
  });

  it('renders toasts and objectives in the language that is active when they are shown', () => {
    const g = new SideGame(); g.start();
    expect(g.message).toBe('Pick up the package at Pålsjö kiosk');
    expect(g.objective).toBe('Pick up the package · Pålsjö kiosk');
    setLang('sv');
    expect(g.message).toBe('Hämta paketet vid Pålsjö kiosk');
    expect(g.objective).toBe('Hämta paketet · Pålsjö kiosk');
  });
});
