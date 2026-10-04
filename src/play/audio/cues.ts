/** [frequency Hz, duration s, delay s] */
export type Note = [number, number, number];

const NOTES: Record<string, Note[]> = {
  start: [[392, 0.13, 0], [523, 0.18, 0.12], [659, 0.26, 0.25]],
  swing: [[160, 0.065, 0]], hit: [[85, 0.12, 0], [110, 0.08, 0.04]],
  smash: [[70, 0.18, 0], [55, 0.16, 0.05], [140, 0.06, 0]],
  dodge: [[260, 0.08, 0]], jump: [[300, 0.07, 0], [420, 0.06, 0.04]], thud: [[60, 0.09, 0]],
  hurt: [[155, 0.22, 0], [95, 0.15, 0.1]], warn: [[880, 0.03, 0]],
  pickup: [[523, 0.12, 0], [784, 0.16, 0.1]],
  parcel: [[392, 0.1, 0], [523, 0.1, 0.1], [784, 0.23, 0.2]],
  crew: [[196, 0.1, 0], [185, 0.14, 0.1]], go: [[659, 0.08, 0], [880, 0.12, 0.09]],
  honk: [[392, 0.12, 0], [494, 0.12, 0], [392, 0.16, 0.18], [494, 0.16, 0.18]], brake: [[1300, 0.35, 0]],
  shot: [[1100, 0.03, 0], [170, 0.12, 0.01], [85, 0.16, 0.02]], empty: [[1800, 0.02, 0]],
  gun: [[330, 0.08, 0], [494, 0.08, 0.08], [659, 0.18, 0.16]], cuff: [[2100, 0.03, 0], [2500, 0.03, 0.08], [1400, 0.05, 0.16]],
  dial: [[941, 0.1, 0], [1336, 0.1, 0], [770, 0.1, 0.15], [1209, 0.1, 0.15], [697, 0.1, 0.3], [1336, 0.1, 0.3]],
  doors: [[300, 0.05, 0], [220, 0.09, 0.05]], ding: [[988, 0.12, 0], [784, 0.3, 0.14]], lift: [[110, 0.5, 0], [125, 0.5, 0.45]],
  alert: [[880, 0.08, 0], [660, 0.08, 0.09], [880, 0.14, 0.18]],
  tear: [[180, 0.05, 0], [140, 0.05, 0.06], [200, 0.05, 0.12]], crate: [[220, 0.06, 0], [330, 0.08, 0.05]], whistle: [[1500, 0.12, 0], [1900, 0.18, 0.13]],
  crash: [[90, 0.2, 0], [60, 0.25, 0.05], [130, 0.1, 0]],
  ring: [[425, 0.35, 0], [425, 0.35, 0.65]], connect: [[660, 0.07, 0], [880, 0.1, 0.09]],
  cash: [[1568, 0.06, 0], [2093, 0.11, 0.1]],
  // The two-tone siren of a Swedish patrol car.
  siren: [[650, 0.42, 0], [980, 0.42, 0.44], [650, 0.42, 0.88], [980, 0.42, 1.32]],
  victory: [[392, 0.12, 0], [523, 0.12, 0.12], [659, 0.12, 0.24], [784, 0.45, 0.36]],
  defeat: [[270, 0.18, 0], [210, 0.18, 0.18], [150, 0.3, 0.36]],
  // Kurragömma: counting, "nu kommer jag", giggles from a hiding place, a find, and what the empty places hide.
  tick: [[660, 0.06, 0]],
  ready: [[523, 0.1, 0], [659, 0.1, 0.1], [784, 0.22, 0.2]],
  giggle: [[1046, 0.05, 0], [1175, 0.05, 0.07], [1046, 0.05, 0.14], [1318, 0.07, 0.21]],
  found: [[523, 0.08, 0], [659, 0.08, 0.08], [784, 0.08, 0.16], [1046, 0.26, 0.24]],
  meow: [[900, 0.22, 0], [700, 0.3, 0.18]],
  snuffle: [[180, 0.05, 0], [210, 0.05, 0.08], [180, 0.05, 0.16], [210, 0.05, 0.24]],
  prrrt: [[95, 0.55, 0]],
  twinkle: [[1568, 0.08, 0], [2093, 0.08, 0.08], [2637, 0.16, 0.16]],
  boing: [[330, 0.28, 0]],
  cheer: [[784, 0.08, 0], [988, 0.12, 0.08]],
  // Filmkväll: a thing landing on the sofa, the TV coming on, and two of the surprises.
  plop: [[620, 0.12, 0]],
  tvon: [[1175, 0.05, 0], [1568, 0.05, 0.06], [2093, 0.14, 0.12]],
  atjoo: [[660, 0.08, 0], [880, 0.08, 0.1], [420, 0.32, 0.22]],
  rawr: [[190, 0.45, 0], [150, 0.3, 0.12]],
  // Pannkakor: an egg cracking, milk and batter pouring, the whisk, and bubbles in the pan.
  crack: [[1800, 0.03, 0], [900, 0.05, 0.03]],
  glug: [[300, 0.07, 0], [240, 0.07, 0.1], [320, 0.07, 0.2]],
  swish: [[700, 0.05, 0], [480, 0.06, 0.04]],
  blub: [[400, 0.05, 0], [600, 0.06, 0.08]],
};

const SAWTOOTH = new Set(['hit', 'hurt', 'smash', 'thud', 'shot', 'brake', 'lift', 'crash', 'tear', 'snuffle', 'prrrt', 'atjoo', 'rawr']);
const GLIDES = new Set(['swing', 'dodge', 'shot', 'brake', 'meow', 'prrrt', 'boing', 'plop', 'atjoo', 'rawr', 'swish', 'blub']);
const QUIET = new Set(['warn', 'brake']);

export interface Cue {
  notes: Note[];
  wave: 'square' | 'sawtooth' | 'triangle';
  /** Slide each note down to a third of its pitch over its length. */
  glide: boolean;
  /** Peak gain of each note. */
  gain: number;
}

export const CUES: Record<string, Cue> = Object.fromEntries(Object.entries(NOTES).map(([name, notes]) => [name, {
  notes,
  wave: SAWTOOTH.has(name) ? 'sawtooth' : name === 'siren' ? 'triangle' : 'square',
  glide: GLIDES.has(name),
  gain: QUIET.has(name) ? 0.012 : name === 'siren' ? 0.05 : 0.035,
}])) as Record<string, Cue>;

export const CUE_NAMES = Object.keys(CUES);
