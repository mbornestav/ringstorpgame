// Carl-Ottos spel 3, Filmkväll: everything that is about the things and the places, in one file. Positions are pixels
// across the living room (the 960 × 540 illustrated world, where the room is ROOM pixels wide), laid out after the photo:
// the TV wall, the coffee table, the sofa, the leather chair, the floor lamp, the bookshelf and the doorway to the dining
// room. The rules are in ../movie-run.ts and the pictures in ../home-art.ts.

import type { KidLook, Words } from './kurragomma';

export type ItemId = 'blanket' | 'cushion' | 'teddy' | 'popcorn' | 'remote';
export type PlaceKind = 'console' | 'table' | 'chair' | 'books' | 'toybasket' | 'baskethouse' | 'redbox' | 'doorway';
/** What an empty place holds. `dining` is the doorway's: a peek into the next room, for another day. */
export type SurpriseKind = 'dustbunny' | 'sock' | 'puzzle' | 'dino' | 'crayon' | 'dining';

export interface Item {
  id: ItemId;
  /** As it reads after "Found …" or "… hittad!". */
  name: Words;
  /** Under its icon in the top bar. */
  short: Words;
  /** What Carl-Otto says when he finds it. */
  found: Words;
  /** The places it can hide in: the blanket never ends up in the red box. */
  fits: PlaceKind[];
}
export interface Place { kind: PlaceKind; x: number }
export interface Surprise { kind: SurpriseKind; line: Words }

export const ROOM = 2200;
/** The middle of the sofa, where everything is brought. */
export const SOFA_X = 820;
/** Where Carl-Otto stands when the round begins: beside the sofa. */
export const START_X = 900;
/** How close Carl-Otto must be to look somewhere. */
export const REACH = 70;
/** How close to the sofa's middle he must come to put things on it. */
export const SOFA_REACH = 110;

/** Carl-Otto at home, as in the photo: a light-blue long-sleeved top, soft trousers and bare feet. */
export const CARL_OTTO_HOME: KidLook = {
  skin: '#f0c197', hair: '#e8c870', style: 'short', top: '#cfe2ec', bottom: '#8798ab', shoes: '#f0c197', barefoot: true,
};

const EVERYWHERE: PlaceKind[] = ['console', 'table', 'chair', 'books', 'toybasket', 'baskethouse', 'redbox', 'doorway'];

export const ITEMS: Item[] = [
  { id: 'blanket', name: { sv: 'Filten', en: 'the blanket' }, short: { sv: 'Filt', en: 'Blanket' },
    found: { sv: 'Filten! Mjuk och gosig.', en: 'The blanket! Soft and snuggly.' }, fits: ['console', 'table', 'chair', 'toybasket', 'doorway'] },
  { id: 'cushion', name: { sv: 'Kudden', en: 'the cushion' }, short: { sv: 'Kudde', en: 'Cushion' },
    found: { sv: 'Kudden! Den ska stå i soffan.', en: 'The cushion! It goes on the sofa.' }, fits: ['console', 'table', 'chair', 'books', 'toybasket', 'doorway'] },
  { id: 'teddy', name: { sv: 'Nallen', en: 'Teddy' }, short: { sv: 'Nalle', en: 'Teddy' },
    found: { sv: 'Nallen! Nallen vill också titta.', en: 'Teddy! Teddy wants to watch too.' }, fits: EVERYWHERE },
  { id: 'popcorn', name: { sv: 'Popcornen', en: 'the popcorn' }, short: { sv: 'Popcorn', en: 'Popcorn' },
    found: { sv: 'Popcorn! Knaper, knaper.', en: 'Popcorn! Crunch, crunch.' }, fits: ['console', 'table', 'chair', 'books', 'baskethouse', 'doorway'] },
  { id: 'remote', name: { sv: 'Fjärrkontrollen', en: 'the remote' }, short: { sv: 'Fjärris', en: 'Remote' },
    found: { sv: 'Fjärrkontrollen! Den gömde sig.', en: 'The remote! It was hiding.' }, fits: EVERYWHERE },
];

/** Left to right, as Carl-Otto walks the room. The sofa (SOFA_X) is not a place: it is where things go. */
export const PLACES: Place[] = [
  { kind: 'console', x: 330 },
  { kind: 'table', x: 560 },
  { kind: 'chair', x: 1060 },
  { kind: 'books', x: 1350 },
  { kind: 'toybasket', x: 1510 },
  { kind: 'baskethouse', x: 1670 },
  { kind: 'redbox', x: 1830 },
  { kind: 'doorway', x: 2020 },
];

export const SURPRISES: Surprise[] = [
  { kind: 'dustbunny', line: { sv: 'En dammråtta! ATJOO!', en: 'A dust bunny! ATCHOO!' } },
  { kind: 'sock', line: { sv: 'En ensam strumpa. Var är den andra?', en: 'A lonely sock. Where’s the other one?' } },
  { kind: 'puzzle', line: { sv: 'En pusselbit! Den har vi letat efter.', en: 'A puzzle piece! We’ve been looking for that.' } },
  { kind: 'dino', line: { sv: 'RAAAWR! En dinosaurie!', en: 'RAAAWR! A dinosaur!' } },
  { kind: 'crayon', line: { sv: 'En krita. Inte rita på väggen!', en: 'A crayon. No drawing on the walls!' } },
];
/** The doorway, when nothing is hidden there. */
export const DINING: Surprise = { kind: 'dining', line: { sv: 'Matsalen utforskar vi en annan gång!', en: 'We’ll explore the dining room another time!' } };

/** Timings, in seconds. */
export const TUNING = {
  /** Carl-Otto's walking speed, pixels a second. */
  walk: 230,
  /** With nothing found or brought to the sofa for this long, the next place (or the sofa) sparkles. */
  hintAfter: 20,
  /** How long a found thing pops up before it is in his arms. */
  popOut: 0.9,
  /** Once everything is on the sofa: when the TV comes on, and when the "film is starting" panel shows. */
  tvOn: 1.1,
  showtime: 3.5,
};
