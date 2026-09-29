import { describe, expect, it } from 'vitest';
import { decideKey, movementFrom, type KeyContext } from '../src/play/input/keymap';

const base: KeyContext = { mode: 'playing', level: 1, hasPhone: false, phoneOpen: false, titleView: 'main', hasCheckpoint: false, buttonFocused: false };
const NO_MODS = { ctrl: false, meta: false, alt: false };
const press = (key: string, ctx: Partial<KeyContext> = {}, repeat = false, mods = NO_MODS) => decideKey(key, repeat, mods, { ...base, ...ctx });
const ui = (key: string, ctx: Partial<KeyContext> = {}) => press(key, ctx).commands;

describe('decideKey', () => {
  it('ignores anything with Ctrl, Meta or Alt', () => {
    for (const mods of [{ ...NO_MODS, ctrl: true }, { ...NO_MODS, meta: true }, { ...NO_MODS, alt: true }]) {
      expect(press('e', {}, false, mods)).toEqual({ commands: [], hold: false });
      expect(press('f', { hasPhone: true }, false, mods)).toEqual({ commands: [], hold: false });
    }
  });

  it('holds movement keys and issues no command for them', () => {
    expect(press('d')).toEqual({ commands: [], hold: true });
    expect(press('shift')).toEqual({ commands: [], hold: true });
  });

  it('queues attacks only while playing and never on key repeat', () => {
    expect(ui('j')).toEqual([{ queue: 'attack' }]);
    expect(ui('k')).toEqual([{ queue: 'dodge' }]);
    expect(ui('i')).toEqual([{ queue: 'shot' }]);
    expect(ui(' ')).toEqual([{ queue: 'jump' }]);
    expect(ui('l')).toEqual([{ queue: 'jump' }]);
    expect(press('j', {}, true).commands).toEqual([]);
    expect(ui('j', { mode: 'paused' })).toEqual([]);
  });

  it('interacts with E only while playing, and still holds E for the use key', () => {
    expect(press('e')).toEqual({ commands: [{ ui: 'interact' }], hold: true });
    expect(press('e', {}, true)).toEqual({ commands: [], hold: true });
    expect(ui('e', { mode: 'title' })).toEqual([]);
  });

  it('presses lift floors 0-8 in level 2 only', () => {
    expect(ui('8', { level: 2 })).toEqual([{ ui: 'floor-8' }]);
    expect(ui('0', { level: 2 })).toEqual([{ ui: 'floor-0' }]);
    expect(ui('9', { level: 2 })).toEqual([]);
    expect(ui('8', { level: 1 })).toEqual([]);
    expect(ui('8', { level: 2, mode: 'paused' })).toEqual([]);
  });

  it('toggles sound with M and pauses with Escape', () => {
    expect(ui('m')).toEqual([{ ui: 'sound' }]);
    expect(ui('escape')).toEqual([{ ui: 'pause' }]);
    expect(press('escape', {}, true).commands).toEqual([]);
  });

  it('follows the original Enter order', () => {
    expect(ui('enter', { mode: 'defeat', hasCheckpoint: true })).toEqual([{ ui: 'continue' }]);
    expect(ui('enter', { mode: 'defeat', hasCheckpoint: false })).toEqual([{ ui: 'restart' }]);
    expect(ui('enter', { mode: 'title', titleView: 'gods' })).toEqual([{ ui: 'answer' }]);
    expect(ui('enter', { mode: 'title', titleView: 'heist' })).toEqual([{ ui: 'answer-3' }]);
    expect(ui('enter', { mode: 'title' })).toEqual([{ ui: 'restart' }]);
    expect(ui('enter', { mode: 'victory' })).toEqual([{ ui: 'restart' }]);
    expect(ui('enter', { mode: 'playing' })).toEqual([]);
    expect(ui('enter', { mode: 'paused' })).toEqual([]);
  });

  it('goes back from a briefing with Escape, after the pause command as before', () => {
    expect(ui('escape', { mode: 'title', titleView: 'gods' })).toEqual([{ ui: 'pause' }, { ui: 'back' }]);
    expect(ui('escape', { mode: 'title', titleView: 'main' })).toEqual([{ ui: 'pause' }]);
  });

  it('lets a focused button keep Enter and Space', () => {
    expect(press('enter', { mode: 'title', buttonFocused: true })).toEqual({ commands: [], hold: false });
    expect(press(' ', { buttonFocused: true })).toEqual({ commands: [], hold: false });
    expect(ui('j', { buttonFocused: true })).toEqual([{ queue: 'attack' }]);
  });

  it('opens the phone with F once D.D has given the number, and closes it with F or Escape', () => {
    expect(press('f', { hasPhone: true })).toEqual({ commands: [{ ui: 'phone' }], hold: false });
    expect(ui('f', { hasPhone: false })).toEqual([]);
    expect(press('escape', { hasPhone: true, phoneOpen: true })).toEqual({ commands: [{ ui: 'phone' }], hold: false });
    expect(press('f', { hasPhone: true }, true).commands).toEqual([]);
  });

  it('swallows everything but M while the phone is open', () => {
    const open = { hasPhone: true, phoneOpen: true };
    expect(press('d', open)).toEqual({ commands: [], hold: false });
    expect(press('j', open)).toEqual({ commands: [], hold: false });
    expect(press('e', open)).toEqual({ commands: [], hold: false });
    expect(press('m', open)).toEqual({ commands: [{ ui: 'sound' }], hold: false });
    expect(press('m', open, true).commands).toEqual([]);
  });
});

describe('movementFrom', () => {
  it('reads WASD and arrows, cancelling opposites', () => {
    expect(movementFrom(new Set(['d']))).toMatchObject({ x: 1, y: 0 });
    expect(movementFrom(new Set(['arrowleft', 'w']))).toMatchObject({ x: -1, y: -1 });
    expect(movementFrom(new Set(['a', 'd', 's', 'arrowup']))).toMatchObject({ x: 0, y: 0 });
    expect(movementFrom(new Set(['shift', 'e']))).toMatchObject({ sneak: true, use: true });
  });
});
