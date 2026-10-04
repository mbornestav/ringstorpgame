// Carl-Ottos spel 3, Hemma: Pysselhörnan, the craft table in the hall (after the family's photo: drawings, a pot of
// crayons, a sheet of star stickers). Everything about the crayons, the stickers and the colouring pages, in one file. Paper
// units: the sheet is PAPER.w × PAPER.h, with (0, 0) at its top left. The rules are in ../craft-run.ts and the pictures in
// ../craft-art.ts.

import type { Words } from './kurragomma';

export type Pt = [number, number];

/** The sheet of paper on the table, in world pixels (the 960 × 540 world). */
export const PAPER = { x: 40, y: 96, w: 580, h: 420 };
export const PAPER_WHITE = '#fbfaf6';

export interface Crayon { colour: string; name: Words }
/** Ten chunky crayons; the number keys 1–9 and 0 pick them, in this order. */
export const CRAYONS: Crayon[] = [
  { colour: '#e2432f', name: { sv: 'Röd', en: 'Red' } },
  { colour: '#f08a2c', name: { sv: 'Orange', en: 'Orange' } },
  { colour: '#f2c230', name: { sv: 'Gul', en: 'Yellow' } },
  { colour: '#62b046', name: { sv: 'Grön', en: 'Green' } },
  { colour: '#6fbde8', name: { sv: 'Ljusblå', en: 'Light blue' } },
  { colour: '#3157b8', name: { sv: 'Blå', en: 'Blue' } },
  { colour: '#f07fb0', name: { sv: 'Rosa', en: 'Pink' } },
  { colour: '#8a56b8', name: { sv: 'Lila', en: 'Purple' } },
  { colour: '#8f5a36', name: { sv: 'Brun', en: 'Brown' } },
  { colour: '#2b3936', name: { sv: 'Svart', en: 'Black' } },
];

/** Line widths in paper units: thin, medium and thick. */
export const SIZES = [5, 11, 22] as const;

export type StickerId = 'star' | 'heart' | 'apple' | 'flower' | 'sun' | 'fox';
export const STICKERS: Array<{ id: StickerId; name: Words }> = [
  { id: 'star', name: { sv: 'Stjärna', en: 'Star' } },
  { id: 'heart', name: { sv: 'Hjärta', en: 'Heart' } },
  { id: 'apple', name: { sv: 'Äpple', en: 'Apple' } },
  { id: 'flower', name: { sv: 'Blomma', en: 'Flower' } },
  { id: 'sun', name: { sv: 'Sol', en: 'Sun' } },
  { id: 'fox', name: { sv: 'Räv', en: 'Fox' } },
];
/** A sticker's radius on the paper. */
export const STICKER_R = 26;

/** A part of a colouring page: an ellipse (centre and radii), a rectangle, or a polygon. */
export type Shape = { e: [number, number, number, number] } | { r: [number, number, number, number] } | { p: Pt[] };
export type PageId = 'house' | 'bike' | 'fox' | 'teddy';
/** A colouring page: its parts, back to front. A tap colours the frontmost part under it. */
export interface Page { id: PageId; name: Words; regions: Shape[] }

const mirror = (pts: Pt[], about: number): Pt[] => pts.map(([x, y]) => [about * 2 - x, y]);

export const PAGES: Page[] = [
  {
    id: 'house', name: { sv: 'Huset', en: 'The house' }, regions: [
      { r: [0, 0, 580, 300] }, { r: [0, 290, 580, 130] },
      { e: [500, 70, 42, 42] }, { e: [140, 74, 50, 24] }, { e: [186, 60, 40, 26] },
      { r: [338, 92, 28, 60] },
      { r: [170, 170, 220, 160] }, { p: [[146, 178], [280, 78], [414, 178]] },
      { r: [255, 248, 50, 82] }, { r: [194, 200, 46, 40] }, { r: [320, 200, 46, 40] },
      { p: [[255, 330], [305, 330], [336, 420], [224, 420]] },
      { r: [462, 232, 24, 96] }, { e: [474, 200, 56, 60] },
      { e: [70, 350, 15, 15] }, { e: [118, 372, 15, 15] }, { e: [530, 372, 15, 15] },
    ],
  },
  {
    id: 'bike', name: { sv: 'Cykeln', en: 'The bike' }, regions: [
      { r: [0, 0, 580, 320] }, { r: [0, 312, 580, 108] }, { e: [80, 70, 40, 40] },
      { e: [160, 262, 82, 82] }, { e: [160, 262, 58, 58] }, { e: [160, 262, 13, 13] },
      { e: [424, 262, 82, 82] }, { e: [424, 262, 58, 58] }, { e: [424, 262, 13, 13] },
      { p: [[156, 252], [252, 148], [272, 160], [170, 270]] },
      { p: [[158, 250], [290, 250], [290, 272], [160, 274]] },
      { p: [[248, 148], [272, 146], [300, 262], [278, 270]] },
      { p: [[256, 146], [404, 150], [404, 168], [262, 164]] },
      { p: [[280, 256], [394, 152], [412, 166], [298, 272]] },
      { p: [[396, 140], [414, 136], [432, 262], [414, 268]] },
      { e: [250, 136, 34, 11] },
      { p: [[388, 122], [440, 106], [448, 120], [396, 138]] },
      { r: [440, 130, 64, 42] }, { e: [290, 262, 18, 18] },
    ],
  },
  {
    id: 'fox', name: { sv: 'Räven', en: 'The fox' }, regions: [
      { r: [0, 0, 580, 420] }, { r: [0, 344, 580, 76] },
      { r: [92, 288, 24, 64] }, { e: [104, 290, 44, 26] },
      { e: [410, 300, 110, 44] }, { e: [500, 292, 36, 30] },
      { e: [280, 284, 92, 80] }, { e: [280, 306, 46, 52] },
      { p: [[204, 150], [218, 52], [268, 124]] }, { p: mirror([[204, 150], [218, 52], [268, 124]], 280) },
      { p: [[222, 128], [226, 80], [252, 116]] }, { p: mirror([[222, 128], [226, 80], [252, 116]], 280) },
      { e: [280, 174, 86, 70] },
      { p: [[196, 192], [280, 176], [280, 240], [228, 234]] }, { p: mirror([[196, 192], [280, 176], [280, 240], [228, 234]], 280) },
      { e: [280, 204, 13, 10] }, { e: [248, 162, 8, 11] }, { e: [312, 162, 8, 11] },
      { e: [238, 356, 30, 15] }, { e: [322, 356, 30, 15] },
    ],
  },
  {
    id: 'teddy', name: { sv: 'Nallen', en: 'Teddy' }, regions: [
      { r: [0, 0, 580, 420] },
      { e: [222, 92, 34, 34] }, { e: [358, 92, 34, 34] }, { e: [222, 92, 17, 17] }, { e: [358, 92, 17, 17] },
      { e: [234, 342, 42, 58] }, { e: [346, 342, 42, 58] },
      { e: [290, 268, 88, 96] },
      { e: [192, 250, 32, 62] }, { e: [388, 250, 32, 62] },
      { e: [290, 286, 52, 56] },
      { e: [290, 152, 82, 72] }, { e: [290, 180, 36, 27] }, { e: [290, 168, 13, 10] }, { e: [260, 136, 7, 10] }, { e: [320, 136, 7, 10] },
      { p: [[258, 216], [290, 230], [258, 244]] }, { p: [[322, 216], [290, 230], [322, 244]] },
      { e: [234, 380, 24, 18] }, { e: [346, 380, 24, 18] },
    ],
  },
];

export const pageOf = (id: PageId): Page => PAGES.find(p => p.id === id)!;
