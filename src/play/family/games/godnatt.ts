// Carl-Ottos spel 3, Hemma: Godnatt, in Carl-Otto's room (after the family's photos: the wallpaper of foxes, squirrels,
// hedgehogs, badgers and rabbits, the grey-green bed with rails under the window and its grey curtain, the paper globe lamp,
// the white shelf of games and books over the desk with its green Lego plate, the toy piano on a red stool, the pink
// dollhouse, the red fire station and the black rug). Positions are world pixels (the 960 × 540 world); the rules are in
// ../goodnight-run.ts and the pictures in ../goodnight-art.ts.

import type { Words } from './kurragomma';

export type Pt = [number, number];
export type ToyId = 'engine' | 'doll' | 'lego' | 'ball' | 'book' | 'dino';
export type AnimalId = 'squirrel' | 'hedgehog' | 'fox' | 'rabbit' | 'badger';

/** The foot of the wall; the floor runs from here to the bottom. */
export const FLOOR = 452;

export interface Toy {
  id: ToyId;
  name: Words;
  /** Where it lies on the rug when the round begins, and where it lives. */
  start: Pt;
  home: Pt;
  /** What Carl-Otto says when it is put away. */
  placed: Words;
}

export const TOYS: Toy[] = [
  { id: 'engine', name: { sv: 'Brandbilen', en: 'The fire engine' }, start: [452, 506], home: [886, 518], placed: { sv: 'Brandbilen kör hem. Tuut tuut!', en: 'The fire engine drives home. Nee-naw!' } },
  { id: 'doll', name: { sv: 'Dockan', en: 'The doll' }, start: [528, 520], home: [890, 440], placed: { sv: 'Dockan går in i dockskåpet.', en: 'The doll goes into the dollhouse.' } },
  { id: 'lego', name: { sv: 'Legot', en: 'The Lego' }, start: [596, 500], home: [150, 318], placed: { sv: 'Klick! Legot på plattan.', en: 'Click! The Lego goes on its plate.' } },
  { id: 'ball', name: { sv: 'Bollen', en: 'The ball' }, start: [664, 522], home: [286, 418], placed: { sv: 'Bollen i korgen!', en: 'The ball goes in the basket!' } },
  { id: 'book', name: { sv: 'Boken', en: 'The book' }, start: [726, 504], home: [118, 190], placed: { sv: 'Boken på hyllan.', en: 'The book goes on the shelf.' } },
  { id: 'dino', name: { sv: 'Dinosaurien', en: 'The dinosaur' }, start: [780, 526], home: [612, 404], placed: { sv: 'RAWR! Dinon sover under sängen.', en: 'RAWR! The dino sleeps under the bed.' } },
];

export interface Animal { id: AnimalId; name: Words; at: Pt; r: number; night: Words }
/** The five animals from the wallpaper that get a goodnight, a little bigger than the rest of the pattern. */
export const ANIMALS: Animal[] = [
  { id: 'squirrel', name: { sv: 'Ekorren', en: 'The squirrel' }, at: [262, 122], r: 30, night: { sv: 'Godnatt, ekorren!', en: 'Goodnight, squirrel!' } },
  { id: 'hedgehog', name: { sv: 'Igelkotten', en: 'The hedgehog' }, at: [256, 300], r: 30, night: { sv: 'Godnatt, igelkotten!', en: 'Goodnight, hedgehog!' } },
  { id: 'fox', name: { sv: 'Räven', en: 'The fox' }, at: [462, 214], r: 34, night: { sv: 'Godnatt, räven!', en: 'Goodnight, fox!' } },
  { id: 'rabbit', name: { sv: 'Kaninen', en: 'The rabbit' }, at: [872, 132], r: 30, night: { sv: 'Godnatt, kaninen!', en: 'Goodnight, rabbit!' } },
  { id: 'badger', name: { sv: 'Grävlingen', en: 'The badger' }, at: [876, 262], r: 32, night: { sv: 'Godnatt, grävlingen!', en: 'Goodnight, badger!' } },
];

/** The paper globe lamp, the bed (where Carl-Otto's head goes on the pillow), and the toy piano under the desk. */
export const LAMP = { x: 352, y: 150, r: 58 };
export const BED = { x: 420, y: 316, w: 380, h: 126, pillow: [462, 330] as Pt };
export const PIANO = { x: 60, y: 384, w: 132, h: 30 };

/** The piano's eight keys, C to C (Swedish names, where B is H), and their pitches. */
export const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'H', 'C'];
export const PITCH = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
/** Blinka lilla stjärna (Twinkle, twinkle, little star; the tune is old and free), as keys 0–7. */
export const SONG = [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0, 4, 4, 3, 3, 2, 2, 1, 4, 4, 3, 3, 2, 2, 1, 0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0];

export const LINES = {
  start: { sv: 'Oj, vad stökigt! Hjälp mig att städa.', en: 'Oh, what a mess! Help me tidy up.' },
  wrong: { sv: 'Hmm, där bor den inte. Titta, där!', en: 'Hmm, it doesn’t live there. Look, there!' },
  tidy: { sv: 'Snyggt! Nu är det läggdags. Tryck på sängen!', en: 'Tidy! Now it’s bedtime. Tap the bed!' },
  bed: { sv: 'Säg godnatt till djuren på tapeten!', en: 'Say goodnight to the animals on the wallpaper!' },
  animals: { sv: 'Nu släcker vi lampan.', en: 'Now let’s turn off the lamp.' },
  notYetBed: { sv: 'Först städar vi!', en: 'Let’s tidy up first!' },
  notYetLamp: { sv: 'Först säger vi godnatt!', en: 'Let’s say goodnight first!' },
  asleep: { sv: 'Sov gott…', en: 'Sleep tight…' },
  song: { sv: 'Bravo! Blinka lilla stjärna!', en: 'Bravo! Twinkle, twinkle, little star!' },
} satisfies Record<string, Words>;

/** Timings in seconds, distances in world pixels. */
export const TUNING = {
  /** A toy hopping home, or back to where it lay. */
  hop: 0.6,
  /** A dragged toy let go this close to its home goes in. */
  homeReach: 80,
  /** A touch this close to a toy picks it up. */
  grab: 54,
  /** A press that moves less than this is a tap (the toy hops home by itself). */
  tap: 14,
  /** With nothing done for this long, the next thing to do sparkles. */
  hintAfter: 10,
  /** The room darkening once the lamp is out, and when the "sleep tight" panel shows. */
  dark: 1.4,
  done: 3,
};
