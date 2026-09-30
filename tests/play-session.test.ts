import { afterEach, describe, expect, it } from 'vitest';
import { Session } from '../src/play/session';
import { SideGame } from '../src/side/game';
import { getLang, setLang } from '../src/side/i18n';

afterEach(() => setLang('en'));

const fresh = () => new Session(new SideGame(), false);

describe('Session', () => {
  it('starts Level 1 from the title and restarts it after a defeat', () => {
    const s = fresh();
    expect(s.game.mode).toBe('title');
    expect(s.dispatch('start')).toBe(true);
    expect(s.game.mode).toBe('playing');
    expect(s.game.level).toBe(1);
    s.game.mode = 'defeat';
    s.dispatch('restart');
    expect(s.game.mode).toBe('playing');
  });

  it('starts a level file from the title, and restarts that same level', () => {
    const s = fresh();
    expect(s.available('level-no-such-level')).toBe(false);
    expect(s.dispatch('level-sample')).toBe(true);
    expect(s.game.custom?.id).toBe('sample');
    expect(s.game.stage.length).toBe(s.game.custom!.street.length);
    s.game.mode = 'defeat';
    s.dispatch('restart');
    expect(s.game.mode).toBe('playing');
    expect(s.game.custom?.id).toBe('sample');
    expect(s.available('level-sample')).toBe(false);
  });

  it('reaches Level 2 and Level 3 only through their briefings', () => {
    const s = fresh();
    expect(s.available('answer')).toBe(false);
    s.dispatch('start-2');
    expect(s.titleView).toBe('gods');
    expect(s.game.mode).toBe('title');
    expect(s.dispatch('answer')).toBe(true);
    expect(s.game.level).toBe(2);
    expect(s.titleView).toBe('main');

    const t = fresh();
    t.dispatch('start-3');
    expect(t.titleView).toBe('heist');
    t.dispatch('back');
    expect(t.titleView).toBe('main');
    t.dispatch('start-3');
    t.dispatch('answer-3');
    expect(t.game.level).toBe(3);
  });

  it('retries the same Gods assignment after a defeat and advances after a victory', () => {
    const s = fresh();
    s.dispatch('start-2'); s.dispatch('answer');
    const first = s.game.gods.assignment;
    s.game.mode = 'defeat'; s.dispatch('restart');
    expect(s.game.level).toBe(2);
    expect(s.game.gods.assignment).toBe(first);
    s.game.mode = 'victory'; s.dispatch('restart');
    expect(s.game.gods.assignment).toBe(first + 1);
  });

  it('returns to the title from the menu with a fresh run', () => {
    const s = fresh();
    s.dispatch('start-3'); s.dispatch('answer-3');
    s.game.mode = 'victory';
    s.dispatch('menu');
    expect(s.game.mode).toBe('title');
    expect(s.game.level).toBe(1);
  });

  it('pauses and resumes, and only offers resume while paused', () => {
    const s = fresh();
    s.dispatch('start');
    expect(s.available('resume')).toBe(false);
    s.dispatch('pause');
    expect(s.game.mode).toBe('paused');
    expect(s.available('resume')).toBe(true);
    s.dispatch('resume');
    expect(s.game.mode).toBe('playing');
  });

  it('pauses on blur and forgets held keys', () => {
    const s = fresh();
    let cleared = 0;
    s.onClearInput(() => { cleared++; });
    s.dispatch('start');
    const before = cleared;
    s.blur();
    expect(s.game.mode).toBe('paused');
    expect(cleared).toBeGreaterThan(before);
  });

  it('presses lift floors only in Level 2, and notifies reset listeners on every fresh run', () => {
    const s = fresh();
    let resets = 0;
    s.onReset(() => { resets++; });
    s.dispatch('start');
    expect(s.dispatch('floor-3')).toBe(false);
    s.dispatch('menu'); s.dispatch('start-2'); s.dispatch('answer');
    expect(resets).toBe(3);
    expect(s.available('floor-3')).toBe(true);
  });

  it('toggles and persists nothing extra beyond the mute flag', () => {
    const s = fresh();
    expect(s.muted).toBe(false);
    s.dispatch('sound');
    expect(s.muted).toBe(true);
    s.dispatch('sound');
    expect(s.muted).toBe(false);
  });

  it('flips the language', () => {
    const s = fresh();
    expect(getLang()).toBe('en');
    s.dispatch('lang');
    expect(getLang()).toBe('sv');
    s.dispatch('lang');
    expect(getLang()).toBe('en');
  });

  it('runs the phone: opens only with a number, calls D.D, and closes', () => {
    const s = fresh();
    s.dispatch('start');
    expect(s.dispatch('phone')).toBe(false);
    s.game.metDD = true;
    expect(s.dispatch('phone')).toBe(true);
    expect(s.game.phoneOpen).toBe(true);
    expect(s.dispatch('phone-call')).toBe(true);
    expect(s.game.phoneCall).toBe('dialing');
    expect(s.dispatch('phone-away')).toBe(true);
    expect(s.game.phoneOpen).toBe(false);
    expect(s.dispatch('phone-call')).toBe(false);
  });

  it('notifies change listeners only for dispatched actions', () => {
    const s = fresh();
    let changes = 0;
    s.onChange(() => { changes++; });
    s.dispatch('resume');
    expect(changes).toBe(0);
    s.dispatch('start');
    expect(changes).toBe(1);
  });
});
