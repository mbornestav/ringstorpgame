// Carl-Ottos spel 3, Hemma: Duka bordet, in the dining room (after the family's photo: the pink wall with its round
// mirrors, the crystal chandelier with candles, the oval table under a cream cloth with a pattern of circles and a dark
// border, green placemats, teak chairs with striped seats, the seagrass rug, a grey curtain on one side and a red one by the
// window). Positions are world pixels (the 960 × 540 world); the rules are in ../dining-run.ts and the pictures in
// ../dining-art.ts.

import type { Words } from './kurragomma';

export type Pt = [number, number];
export type PlaceId = 'mamma' | 'pappa' | 'carl' | 'nallen';
export type Ware = 'plate' | 'glass' | 'cutlery';

export const FLOOR = 452;
/** The table top (an ellipse, seen from a little above), and the candlestick in its middle. */
export const TABLE = { x: 480, y: 318, rx: 330, ry: 104 };
export const CANDLES = { x: 480, y: 318, count: 5 };

export interface Place {
  id: PlaceId;
  name: Words;
  /** The middle of the placemat, and how big things are there (smaller further away). */
  at: Pt;
  scale: number;
}
/** Mamma and Pappa on the far side, Carl-Otto at the left end, Nallen at the right end. */
export const PLACES: Place[] = [
  { id: 'mamma', name: { sv: 'Mamma', en: 'Mamma' }, at: [372, 272], scale: 0.8 },
  { id: 'pappa', name: { sv: 'Pappa', en: 'Pappa' }, at: [588, 272], scale: 0.8 },
  { id: 'carl', name: { sv: 'Carl-Otto', en: 'Carl-Otto' }, at: [226, 334], scale: 0.95 },
  { id: 'nallen', name: { sv: 'Nallen', en: 'Teddy' }, at: [734, 334], scale: 0.95 },
];
export const WARES: Ware[] = ['plate', 'glass', 'cutlery'];

/** Where each ware goes on a place, relative to the mat's middle (times the place's scale). */
export const OFFSET: Record<Ware, Pt> = { plate: [0, 0], glass: [44, -30], cutlery: [0, 2] };

/** The serving trolley in front of the table: the stacks the wares come from, and where the food is put. */
export const TROLLEY = { x: 300, y: 470, w: 360 };
export const SOURCE: Record<Ware, Pt> = { plate: [372, 470], glass: [480, 470], cutlery: [588, 470] };
export const FOOD_AT: Pt = [480, 470];

export const NAMES: Record<Ware, Words> = {
  plate: { sv: 'Tallrik', en: 'Plate' }, glass: { sv: 'Glas', en: 'Glass' }, cutlery: { sv: 'Bestick', en: 'Knife and fork' },
};
export const COUNT: Words[] = [
  { sv: 'En!', en: 'One!' }, { sv: 'Två!', en: 'Two!' }, { sv: 'Tre!', en: 'Three!' }, { sv: 'Fyra – och en till Nallen!', en: 'Four – and one for Teddy!' },
];

export const LINES = {
  start: { sv: 'Nu dukar vi! Mamma, pappa, jag – och Nallen.', en: 'Let’s set the table! Mamma, Pappa, me – and Teddy.' },
  wrong: { sv: 'Den ska stå på en plats. Titta, där!', en: 'That goes at a place. Look, there!' },
  set: { sv: 'Fint dukat! Nu tänder vi ljusen.', en: 'Nicely set! Now let’s light the candles.' },
  candles: { sv: 'Så mysigt! Nu kommer maten.', en: 'How cosy! Here comes the food.' },
  pancakes: { sv: 'Pannkakorna jag bakade!', en: 'The pancakes I made!' },
  meatballs: { sv: 'Köttbullar och potatis!', en: 'Meatballs and potatoes!' },
  eat: { sv: 'Smaklig måltid!', en: 'Enjoy your meal!' },
  thanks: { sv: 'Tack för maten!', en: 'Thank you for the food!' },
} satisfies Record<string, Words>;

/** Timings in seconds, distances in world pixels. */
export const TUNING = { hop: 0.5, reach: 70, grab: 48, tap: 14, serve: 0.8, eat: 3.6, hintAfter: 10 };
