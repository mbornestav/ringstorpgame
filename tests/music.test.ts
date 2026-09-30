import { describe, expect, it } from 'vitest';
import { SONGS, chord, compile, frequency, midi, type Song } from '../src/play/audio/songs';

describe('music', () => {
  it('reads note names and chords', () => {
    expect(midi('A4')).toBe(69); expect(midi('C4')).toBe(60); expect(midi('F#5')).toBe(78); expect(midi('Bb3')).toBe(58);
    expect(frequency(69)).toBe(440);
    expect(chord('Am', 3)).toEqual([57, 60, 64]);
    expect(chord('B7', 2)).toEqual([47, 51, 54, 57]);
    expect(() => midi('H2')).toThrow(); expect(() => chord('Cmaj', 3)).toThrow();
  });

  it('every track compiles, loops on whole bars and stays in a playable range', () => {
    for (const song of Object.values(SONGS)) {
      const c = compile(song);
      expect(c.steps % 16, song.id).toBe(0);
      expect(c.events).toHaveLength(c.steps);
      const notes = c.events.flat().filter(e => e.instrument !== 'drums') as Array<{ midi: number; instrument: string }>;
      expect(notes.some(n => n.instrument === 'lead'), song.id).toBe(true);
      for (const n of notes) { expect(n.midi, song.id).toBeGreaterThanOrEqual(36); expect(n.midi, song.id).toBeLessThanOrEqual(90); }
      // A loop is between about 15 seconds and two minutes.
      expect(c.steps * c.stepSeconds, song.id).toBeGreaterThan(15);
      expect(c.steps * c.stepSeconds, song.id).toBeLessThan(120);
    }
  });

  it('holds a note across "-" and rests on "."', () => {
    const song: Song = { id: 't', bpm: 120, bass: 'long', bassOctave: 2, arp: 'none', arpOctave: 4, order: ['A'],
      sections: { A: { chords: ['C'], drums: 'k . . . . . . . . . . . . . . .', lead: 'C5 - - . E5 . . . G5 - - - - - - -' } } };
    const lead = compile(song).events.flat().filter(e => e.instrument === 'lead') as Array<{ step: number; steps: number }>;
    expect(lead.map(e => [e.step, e.steps])).toEqual([[0, 3], [4, 1], [8, 8]]);
  });

  it('says exactly what is wrong with a malformed line', () => {
    const bad = (lead: string, drums = 'k . . . . . . . . . . . . . . .'): Song => ({ id: 'bad', bpm: 100, bass: 'walk', bassOctave: 2, arp: 'up', arpOctave: 4, order: ['A'], sections: { A: { chords: ['C'], drums, lead } } });
    expect(() => compile(bad('C5 . .'))).toThrow('the lead has 3 steps, 1 bars need 16');
    expect(() => compile(bad('C5 . . . . . . . . . . . . . . .', 'k . z . . . . . . . . . . . . .'))).toThrow('unknown drum "z"');
  });
});
