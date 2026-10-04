// Carl-Ottos spel 3, Hemma: Hemkomst, by the front door (after the family's photo: the white panelled door with its tall
// frosted window, the paper globe lamp, the coats on their hooks and the magnet board, the shoe bench with its woven seat,
// the white shoe cabinet, shoes everywhere on the dark floor). Positions are world pixels (the 960 × 540 world); the rules
// are in ../homecoming-run.ts and the pictures in ../homecoming-art.ts.

import type { Words } from './kurragomma';

export type Pt = [number, number];
export type PairId = 'pappa' | 'mamma' | 'boots' | 'sandals';
export type Side = 'L' | 'R';
export type ShoeId = `${PairId}-${Side}`;
export type ThingId = ShoeId | 'jacket' | 'helmet';
export type ShoeKind = 'sneaker' | 'ankle' | 'rainboot' | 'sandal';

export const FLOOR = 470;

export interface Pair {
  id: PairId;
  /** Whose they are, as said when the pair is put away. */
  done: Words;
  kind: ShoeKind;
  colour: string;
  /** Pappa's are big, Mamma's in between, Carl-Otto's small. */
  size: number;
  /** The middle of the pair's place on the bench: grown-ups' on the seat, Carl-Otto's on the shelf below. */
  slot: Pt;
  /** Where each shoe lies when Carl-Otto comes in. */
  starts: [Pt, Pt];
}

/** The shoe bench: its seat and the shelf under it. */
export const BENCH = { x: 596, w: 256, seat: 372, shelf: 446 };
/** Shoes are drawn this much bigger than their size, so small fingers can catch them. */
export const SHOE_SCALE = 1.2;

export const PAIRS: Pair[] = [
  { id: 'pappa', done: { sv: 'Pappas gympaskor – ett par!', en: 'Pappa’s trainers – a pair!' }, kind: 'sneaker', colour: '#8c8e8a', size: 1.25, slot: [664, 372], starts: [[118, 512], [452, 528]] },
  { id: 'mamma', done: { sv: 'Mammas kängor – ett par!', en: 'Mamma’s boots – a pair!' }, kind: 'ankle', colour: '#8a5a36', size: 1.05, slot: [790, 372], starts: [[268, 520], [520, 504]] },
  { id: 'boots', done: { sv: 'Mina gummistövlar – ett par!', en: 'My wellies – a pair!' }, kind: 'rainboot', colour: '#d6372c', size: 0.8, slot: [664, 446], starts: [[196, 526], [372, 506]] },
  { id: 'sandals', done: { sv: 'Mina sandaler – ett par!', en: 'My sandals – a pair!' }, kind: 'sandal', colour: '#3157b8', size: 0.8, slot: [790, 446], starts: [[86, 530], [326, 532]] },
];
/** How far apart the two shoes of a pair stand, at size 1. */
export const PAIR_GAP = 28;

/** Carl-Otto's yellow raincoat goes on his own low hook; his blue bike helmet on the shelf over the hooks. */
export const JACKET = { start: [160, 494] as Pt, home: [216, 258] as Pt };
export const HELMET = { start: [418, 518] as Pt, home: [204, 138] as Pt };
/** The coat hooks along the wall, and the magnet board beside them (it shows Carl-Otto's latest picture). */
export const HOOKS = { x: 120, y: 168, w: 170 };
export const BOARD = { x: 334, y: 120, w: 96, h: 120 };
/** The front door and its frosted window; Carl-Otto stands in front of the window. */
export const DOOR = { x: 456, y: 96, w: 128, h: FLOOR - 96 };
export const STAND: Pt = [586, 530];

export const NAMES: Record<ThingId, Words> = {
  'pappa-L': { sv: 'Pappas vänstra gympasko', en: 'Pappa’s left trainer' }, 'pappa-R': { sv: 'Pappas högra gympasko', en: 'Pappa’s right trainer' },
  'mamma-L': { sv: 'Mammas vänstra känga', en: 'Mamma’s left boot' }, 'mamma-R': { sv: 'Mammas högra känga', en: 'Mamma’s right boot' },
  'boots-L': { sv: 'Vänster gummistövel', en: 'Left welly' }, 'boots-R': { sv: 'Höger gummistövel', en: 'Right welly' },
  'sandals-L': { sv: 'Vänster sandal', en: 'Left sandal' }, 'sandals-R': { sv: 'Höger sandal', en: 'Right sandal' },
  jacket: { sv: 'Jackan', en: 'The jacket' }, helmet: { sv: 'Hjälmen', en: 'The helmet' },
};

export const LINES = {
  start: { sv: 'Hemma! Var ska alla skor stå?', en: 'Home! Where do all the shoes go?' },
  wrong: { sv: 'Den står inte där. Titta, där!', en: 'That doesn’t go there. Look, there!' },
  jacket: { sv: 'Jackan på min krok!', en: 'My jacket on my hook!' },
  helmet: { sv: 'Hjälmen på hyllan – tills i morgon!', en: 'The helmet on the shelf – until tomorrow!' },
  done: { sv: 'Välkommen hem, Carl-Otto!', en: 'Welcome home, Carl-Otto!' },
} satisfies Record<string, Words>;

/** Timings in seconds, distances in world pixels. */
export const TUNING = { hop: 0.55, homeReach: 64, grab: 46, tap: 14, hintAfter: 10, done: 1.6 };
