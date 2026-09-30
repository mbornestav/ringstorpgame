// The game's music, as chiptune written out step by step: a pulse-wave lead, a thinner pulse arpeggio, a triangle bass and
// noise drums, like a 16-bit console's sound chip. Pure data plus a compiler that turns it into timed note events, so it is
// unit-tested without a browser; src/play/audio/music.ts plays it.
//
// Each section is some bars of sixteenth-note steps (16 a bar). In a lead line a step is a note (`E5`, `F#4`, `Bb3`),
// `-` to hold the note before, or `.` for silence. Bass and arpeggio lines are generated from one chord per bar. Drum
// steps are letters: `k` kick, `s` snare, `h` hat, `o` open hat (combinations like `kh` are fine), `.` nothing.

export type Instrument = 'lead' | 'arp' | 'bass' | 'drums';
export type BassStyle = 'octave' | 'drive' | 'bounce' | 'walk' | 'pulse' | 'long';
export type ArpStyle = 'up' | 'updown' | 'broken' | 'none';

export interface Section {
  /** One chord per bar: a root with an optional `m` (minor) or `7`, e.g. `Am`, `F#`, `B7`, `Bb`. */
  chords: string[];
  /** The melody, 16 steps a bar, as space-separated tokens (`|` between bars is ignored). */
  lead: string;
  /** One bar of drums, repeated for every bar of the section. */
  drums: string;
}

export interface Song {
  id: string;
  bpm: number;
  bass: BassStyle;
  bassOctave: number;
  arp: ArpStyle;
  arpOctave: number;
  sections: Record<string, Section>;
  /** The order the sections play in; the whole list then loops. */
  order: string[];
}

export interface NoteEvent { instrument: Instrument; step: number; midi: number; steps: number }
export interface DrumEvent { instrument: 'drums'; step: number; hit: 'k' | 's' | 'h' | 'o' }
export interface CompiledSong { id: string; stepSeconds: number; steps: number; events: Array<NoteEvent | DrumEvent>[] }

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A note name to its MIDI number: `A4` is 69, `C4` is 60. */
export function midi(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!m) throw new Error(`Not a note: "${note}"`);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const frequency = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

/** A chord's tones as semitones above its root: `Am` → root and [0, 3, 7]. */
export function chord(symbol: string, octave: number): number[] {
  const m = /^([A-G])(#|b)?(m|7)?$/.exec(symbol);
  if (!m) throw new Error(`Not a chord: "${symbol}"`);
  const root = midi(`${m[1]}${m[2] ?? ''}${octave}`);
  const third = m[3] === 'm' ? 3 : 4;
  return m[3] === '7' ? [root, root + 4, root + 7, root + 10] : [root, root + third, root + 7];
}

const tokens = (line: string): string[] => line.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);

/** One bar of bass for a chord, as [step, midi, length in steps]. */
function bassBar(style: BassStyle, root: number): Array<[number, number, number]> {
  const fifth = root + 7, up = root + 12;
  switch (style) {
    case 'octave': return [0, 2, 4, 6, 8, 10, 12, 14].map((s, i) => [s, i % 2 ? up : root, 1]);
    case 'drive': return [0, 2, 4, 6, 8, 10, 12, 14].map((s, i) => [s, i === 3 || i === 7 ? up : root, 1]);
    case 'bounce': return [0, 2, 4, 6, 8, 10, 12, 14].map((s, i) => [s, i % 2 ? fifth : root, 1]);
    case 'pulse': return [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, root, 1]);
    case 'walk': return [[0, root, 2], [4, fifth, 2], [8, up, 2], [12, fifth, 2]];
    case 'long': return [[0, root, 7], [8, fifth, 7]];
  }
}

/** One bar of arpeggio over a chord, sixteenths. */
function arpBar(style: ArpStyle, tones: number[]): Array<[number, number]> {
  if (style === 'none') return [];
  const up = [...tones, tones[0] + 12];
  const cycle = style === 'up' ? up : style === 'updown' ? [...up, ...up.slice(1, -1).reverse()] : [up[0], up[2], up[1], up[3] ?? up[2] + 5];
  return Array.from({ length: 16 }, (_, s) => [s, cycle[s % cycle.length]]);
}

/** Checks a song and turns it into events per step. Throws with a readable message if any line is malformed. */
export function compile(song: Song): CompiledSong {
  const events: Array<NoteEvent | DrumEvent>[] = [];
  let offset = 0;
  for (const name of song.order) {
    const sec = song.sections[name];
    if (!sec) throw new Error(`${song.id}: no section "${name}"`);
    const bars = sec.chords.length, steps = bars * 16;
    const lead = tokens(sec.lead), drums = tokens(sec.drums);
    if (lead.length !== steps) throw new Error(`${song.id}.${name}: the lead has ${lead.length} steps, ${bars} bars need ${steps}`);
    if (drums.length !== 16) throw new Error(`${song.id}.${name}: the drums need exactly 16 steps, not ${drums.length}`);
    for (let s = 0; s < steps; s++) events[offset + s] = [];
    const at = (s: number) => events[offset + s];
    // Lead: a note lasts for itself plus every "-" after it.
    for (let s = 0; s < steps; s++) {
      const tk = lead[s];
      if (tk === '.' || tk === '-') continue;
      let len = 1;
      while (s + len < steps && lead[s + len] === '-') len++;
      at(s).push({ instrument: 'lead', step: offset + s, midi: midi(tk), steps: len });
    }
    sec.chords.forEach((c, bar) => {
      const [root] = chord(c, song.bassOctave);
      for (const [s, n, len] of bassBar(song.bass, root)) at(bar * 16 + s).push({ instrument: 'bass', step: offset + bar * 16 + s, midi: n, steps: len });
      for (const [s, n] of arpBar(song.arp, chord(c, song.arpOctave))) at(bar * 16 + s).push({ instrument: 'arp', step: offset + bar * 16 + s, midi: n, steps: 1 });
      drums.forEach((tk, s) => {
        if (tk === '.') return;
        for (const hit of tk) {
          if (!'ksho'.includes(hit)) throw new Error(`${song.id}.${name}: unknown drum "${hit}"`);
          at(bar * 16 + s).push({ instrument: 'drums', step: offset + bar * 16 + s, hit: hit as DrumEvent['hit'] });
        }
      });
    });
    offset += steps;
  }
  return { id: song.id, stepSeconds: 60 / song.bpm / 4, steps: offset, events };
}

// ---------------------------------------------------------------- the tracks

/** The title screen and results: an upbeat theme in A minor. */
const TITLE: Song = {
  id: 'title', bpm: 128, bass: 'octave', bassOctave: 2, arp: 'updown', arpOctave: 4,
  sections: {
    A: { chords: ['Am', 'F', 'C', 'G'], drums: 'k . h . s . h . k . h k s . h .', lead:
      'E5 - - . E5 . D5 . C5 - D5 - E5 - A4 - | C5 - - . A4 . C5 . F5 - E5 - C5 - A4 - | G4 - - . C5 . E5 . G5 - F5 - E5 - C5 - | D5 - - - B4 - G4 - D5 - - . E5 - D5 -' },
    A2: { chords: ['Am', 'F', 'C', 'G'], drums: 'k . h . s . h . k . h k s . h .', lead:
      'E5 - - . E5 . D5 . C5 - D5 - E5 - A4 - | C5 - - . A4 . C5 . F5 - E5 - C5 - A4 - | G4 - - . C5 . E5 . G5 - F5 - E5 - C5 - | B4 - - - . . G4 - A4 - - - - - . .' },
    B: { chords: ['F', 'G', 'Em', 'Am'], drums: 'k . h h s . h . k . h k s . o .', lead:
      'A5 - - - G5 - F5 - E5 - F5 - A5 - - . | G5 - - - F5 - E5 - D5 - E5 - G5 - - . | E5 - - - D5 - B4 - G4 - B4 - E5 - D5 - | C5 - - - B4 - - - A4 - - - - - . .' },
  },
  order: ['A', 'A2', 'B', 'A2'],
};

/** Level 1, the package run: driving and punchy, for fights. */
const STREET: Song = {
  id: 'street', bpm: 140, bass: 'drive', bassOctave: 2, arp: 'up', arpOctave: 4,
  sections: {
    A: { chords: ['Em', 'C', 'D', 'B'], drums: 'k . h k s . h . k k h . s . h h', lead:
      'B4 . B4 . E5 - . B4 D5 - . B4 E5 - G5 - | G5 - - . E5 . C5 . E5 - G5 - C6 - B5 - | A5 - - . F#5 . D5 . F#5 - A5 - D6 - C6 - | B5 - - - F#5 - - - D#5 - - - B4 - . .' },
    B: { chords: ['Am', 'Em', 'C', 'D'], drums: 'k . h k s . h . k k h . s . o .', lead:
      'A4 . C5 . E5 . A5 . G5 - E5 - C5 - E5 - | B4 . E5 . G5 . B5 . A5 - G5 - E5 - G5 - | C5 . E5 . G5 . C6 . B5 - G5 - E5 - G5 - | F#5 - - - A5 - - - D6 - - - . . . .' },
  },
  order: ['A', 'A', 'B', 'A'],
};

/** Level 2, the Gods run: sneaking, plucked and sparse. */
const GODS: Song = {
  id: 'gods', bpm: 96, bass: 'walk', bassOctave: 2, arp: 'none', arpOctave: 4,
  sections: {
    A: { chords: ['Dm', 'Dm', 'Bb', 'A'], drums: 'k . . . h . . . k . . . h . h .', lead:
      'D5 . . F5 . . A5 . G#5 . A5 . . . . . | D5 . . F5 . . A5 . C6 . A5 . F5 . . . | D5 . . F5 . . Bb5 . A5 . F5 . D5 . . . | C#5 . . E5 . . A5 . G5 . E5 . C#5 . . .' },
    B: { chords: ['Gm', 'Dm', 'Bb', 'A'], drums: 'k . . . h . . . k . . . h . . .', lead:
      'G4 . Bb4 . D5 . . . Bb4 . . . G4 . . . | F4 . A4 . D5 . . . A4 . . . F4 . . . | F4 . Bb4 . D5 . F5 . D5 . Bb4 . F4 . . . | E4 . A4 . C#5 . E5 . . . . . A4 . . .' },
  },
  order: ['A', 'B', 'A', 'B'],
};

/** Level 3, the Kapell job: tense, at night. */
const HEIST: Song = {
  id: 'heist', bpm: 116, bass: 'pulse', bassOctave: 2, arp: 'broken', arpOctave: 3,
  sections: {
    A: { chords: ['Cm', 'Ab', 'Bb', 'G'], drums: 'k . . h s . . h k . k h s . h .', lead:
      'G4 - - - - - Eb5 - D5 - C5 - - - - - | C5 - - - Eb5 - Ab5 - G5 - - - Eb5 - - - | D5 - - - F5 - Bb5 - Ab5 - G5 - F5 - - - | G5 - - - - - F5 - Eb5 - D5 - B4 - - -' },
    B: { chords: ['Fm', 'Cm', 'Ab', 'G'], drums: 'k . . h s . . h k . k h s . o .', lead:
      'C5 . C5 . Ab4 . F4 . Ab4 . C5 . F5 - - - | Eb5 . Eb5 . C5 . G4 . C5 . Eb5 . G5 - - - | Ab5 - - - G5 - - - F5 - - - Eb5 - - - | D5 - - - B4 - - - G4 - - - - - . .' },
  },
  order: ['A', 'A', 'B', 'A'],
};

/** The game chooser: gentle and friendly. */
const HUB: Song = {
  id: 'hub', bpm: 100, bass: 'long', bassOctave: 2, arp: 'up', arpOctave: 4,
  sections: {
    A: { chords: ['F', 'Dm', 'Bb', 'C'], drums: 'k . . . h . . . . . k . h . . .', lead:
      'A4 - - - C5 - F5 - E5 - - - C5 - - - | D5 - - - F5 - A5 - G5 - - - F5 - - - | F5 - - - D5 - Bb4 - D5 - F5 - Bb5 - - - | A5 - - - G5 - - - E5 - - - C5 - - -' },
  },
  order: ['A', 'A'],
};

/** Carl-Otto's bike ride: happy and bouncy. */
const BIKE: Song = {
  id: 'bike', bpm: 126, bass: 'bounce', bassOctave: 2, arp: 'updown', arpOctave: 4,
  sections: {
    A: { chords: ['G', 'C', 'D', 'G'], drums: 'k . h . s . h h k . h . s . h .', lead:
      'D5 . B4 . D5 . G5 . F#5 . G5 . A5 - B5 - | C6 - - . B5 . A5 . G5 . E5 . C5 - E5 - | D5 . F#5 . A5 . D6 . C6 . A5 . F#5 - A5 - | G5 - - - D5 - - - G5 - - - . . . .' },
    B: { chords: ['Em', 'C', 'A', 'D'], drums: 'k . h . s . h h k . h . s . o .', lead:
      'B4 - E5 - G5 - B5 - A5 - G5 - E5 - G5 - | A5 - G5 - E5 - C5 - E5 - G5 - C6 - - - | C#6 - B5 - A5 - E5 - C#5 - E5 - A5 - - - | F#5 - - - A5 - - - D6 - - - C6 - A5 -' },
  },
  order: ['A', 'B', 'A', 'B'],
};

/** Kurragömma: tiptoeing, with a giggly middle. */
const HIDE: Song = {
  id: 'hide', bpm: 110, bass: 'walk', bassOctave: 2, arp: 'none', arpOctave: 4,
  sections: {
    A: { chords: ['C', 'Am', 'F', 'G'], drums: 'k . . . s . . . k . k . s . . .', lead:
      'C5 . E5 . G5 . E5 . F5 . . . E5 . . . | A4 . C5 . E5 . C5 . D5 . . . C5 . . . | F4 . A4 . C5 . F5 . E5 . Eb5 . D5 . . . | G4 . . . B4 . . . D5 - - - G5 . . .' },
    B: { chords: ['F', 'G', 'Em', 'G7'], drums: 'k . h . s . h . k . h . s . h h', lead:
      'A5 . A5 . G5 . F5 . G5 . A5 . . . . . | B5 . B5 . A5 . G5 . A5 . B5 . . . . . | G5 . E5 . B4 . E5 . G5 . B5 . . . . . | D6 . . . B5 . . . G5 . F5 . D5 . . .' },
  },
  order: ['A', 'A', 'B', 'A'],
};

export const SONGS = { title: TITLE, street: STREET, gods: GODS, heist: HEIST, hub: HUB, bike: BIKE, hide: HIDE } satisfies Record<string, Song>;
export type TrackId = keyof typeof SONGS;
