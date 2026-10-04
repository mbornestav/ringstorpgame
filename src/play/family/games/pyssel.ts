// Carl-Ottos spel 3, Hemma: Pysselhörnan, the craft table in the hall (after the family's photo: drawings, a pot of
// crayons, a sheet of star stickers). Everything about the brushes, the papers, the stickers, the colouring pages and the
// tracing pages, in one file. Paper units: the sheet is PAPER.w × PAPER.h, with (0, 0) at its top left. The rules are in
// ../craft-run.ts, the picture is drawn by ../craft-paint.ts and the table and its controls by ../craft-art.ts.

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

/** What is in the hand. The brushes draw lines; the bucket fills; stickers and the sponge are tools of their own. */
export type Brush = 'crayon' | 'rainbow' | 'glitter' | 'stamp' | 'neon' | 'eraser';
export type Tool = Brush | 'bucket' | 'sticker' | 'sponge';
export const BRUSHES: Array<{ id: Brush | 'bucket'; name: Words }> = [
  { id: 'crayon', name: { sv: 'Krita', en: 'Crayon' } },
  { id: 'rainbow', name: { sv: 'Regnbågspensel', en: 'Rainbow brush' } },
  { id: 'glitter', name: { sv: 'Glitterpensel', en: 'Glitter brush' } },
  { id: 'stamp', name: { sv: 'Stämpel', en: 'Stamp' } },
  { id: 'neon', name: { sv: 'Neonpensel', en: 'Neon brush' } },
  { id: 'eraser', name: { sv: 'Sudd', en: 'Eraser' } },
  { id: 'bucket', name: { sv: 'Hink', en: 'Bucket' } },
];

export type StampId = 'heart' | 'paw' | 'star' | 'flower' | 'feet' | 'fish';
export const STAMPS: Array<{ id: StampId; name: Words }> = [
  { id: 'heart', name: { sv: 'Hjärtan', en: 'Hearts' } }, { id: 'paw', name: { sv: 'Tassar', en: 'Paws' } },
  { id: 'star', name: { sv: 'Stjärnor', en: 'Stars' } }, { id: 'flower', name: { sv: 'Blommor', en: 'Flowers' } },
  { id: 'feet', name: { sv: 'Fotspår', en: 'Footprints' } }, { id: 'fish', name: { sv: 'Fiskar', en: 'Fish' } },
];

/** Mirror drawing: off, mirrored left and right, a four-way and an eight-way kaleidoscope. */
export const SYMMETRY = [1, 2, 4, 8] as const;
export type Sym = typeof SYMMETRY[number];

export type Pattern = 'none' | 'stripes' | 'dots' | 'stars' | 'hearts';
export const PATTERNS: Array<{ id: Pattern; name: Words }> = [
  { id: 'none', name: { sv: 'Slät', en: 'Plain' } }, { id: 'stripes', name: { sv: 'Ränder', en: 'Stripes' } },
  { id: 'dots', name: { sv: 'Prickar', en: 'Dots' } }, { id: 'stars', name: { sv: 'Stjärnor', en: 'Stars' } },
  { id: 'hearts', name: { sv: 'Hjärtan', en: 'Hearts' } },
];

export type PaperId = 'white' | 'yellow' | 'blue' | 'pink' | 'green' | 'black' | 'scratch';
export const PAPERS: Array<{ id: PaperId; colour: string; name: Words }> = [
  { id: 'white', colour: PAPER_WHITE, name: { sv: 'Vitt papper', en: 'White paper' } },
  { id: 'yellow', colour: '#fff3c4', name: { sv: 'Gult papper', en: 'Yellow paper' } },
  { id: 'blue', colour: '#dbeefa', name: { sv: 'Blått papper', en: 'Blue paper' } },
  { id: 'pink', colour: '#fbe0ea', name: { sv: 'Rosa papper', en: 'Pink paper' } },
  { id: 'green', colour: '#e2f3d6', name: { sv: 'Grönt papper', en: 'Green paper' } },
  { id: 'black', colour: '#1d1d26', name: { sv: 'Svart papper', en: 'Black paper' } },
  { id: 'scratch', colour: '#1d1d26', name: { sv: 'Skrapapper', en: 'Scratch paper' } },
];
export const paperOf = (id: PaperId) => PAPERS.find(p => p.id === id)!;

export type ShapeSticker = 'star' | 'heart' | 'apple' | 'flower' | 'sun' | 'fox' | 'moon' | 'butterfly';
export type ThingSticker = 'bike' | 'engine' | 'dino' | 'pancakes' | 'house' | 'rainbow' | 'balloon' | 'ball';
export type FamilySticker = 'carl' | 'mamma' | 'pappa' | 'nallen' | 'harry' | 'aylan' | 'frej' | 'chloe' | 'emilio';
export type StickerId = ShapeSticker | ThingSticker | FamilySticker;
export type StickerPage = 'family' | 'things' | 'shapes';

export const STICKERS: Array<{ id: StickerId; page: StickerPage; name: Words }> = [
  { id: 'carl', page: 'family', name: { sv: 'Carl-Otto', en: 'Carl-Otto' } },
  { id: 'mamma', page: 'family', name: { sv: 'Mamma', en: 'Mamma' } },
  { id: 'pappa', page: 'family', name: { sv: 'Pappa', en: 'Pappa' } },
  { id: 'nallen', page: 'family', name: { sv: 'Nallen', en: 'Teddy' } },
  { id: 'harry', page: 'family', name: { sv: 'Harry', en: 'Harry' } },
  { id: 'aylan', page: 'family', name: { sv: 'Aylan', en: 'Aylan' } },
  { id: 'frej', page: 'family', name: { sv: 'Frej', en: 'Frej' } },
  { id: 'chloe', page: 'family', name: { sv: 'Chloe', en: 'Chloe' } },
  { id: 'emilio', page: 'family', name: { sv: 'Emilio', en: 'Emilio' } },
  { id: 'bike', page: 'things', name: { sv: 'Cykel', en: 'Bike' } },
  { id: 'engine', page: 'things', name: { sv: 'Brandbil', en: 'Fire engine' } },
  { id: 'dino', page: 'things', name: { sv: 'Dinosaurie', en: 'Dinosaur' } },
  { id: 'pancakes', page: 'things', name: { sv: 'Pannkakor', en: 'Pancakes' } },
  { id: 'house', page: 'things', name: { sv: 'Hus', en: 'House' } },
  { id: 'rainbow', page: 'things', name: { sv: 'Regnbåge', en: 'Rainbow' } },
  { id: 'balloon', page: 'things', name: { sv: 'Ballong', en: 'Balloon' } },
  { id: 'ball', page: 'things', name: { sv: 'Boll', en: 'Ball' } },
  { id: 'star', page: 'shapes', name: { sv: 'Stjärna', en: 'Star' } },
  { id: 'heart', page: 'shapes', name: { sv: 'Hjärta', en: 'Heart' } },
  { id: 'apple', page: 'shapes', name: { sv: 'Äpple', en: 'Apple' } },
  { id: 'flower', page: 'shapes', name: { sv: 'Blomma', en: 'Flower' } },
  { id: 'sun', page: 'shapes', name: { sv: 'Sol', en: 'Sun' } },
  { id: 'fox', page: 'shapes', name: { sv: 'Räv', en: 'Fox' } },
  { id: 'moon', page: 'shapes', name: { sv: 'Måne', en: 'Moon' } },
  { id: 'butterfly', page: 'shapes', name: { sv: 'Fjäril', en: 'Butterfly' } },
];
export const STICKER_PAGES: StickerPage[] = ['family', 'things', 'shapes'];
/** A sticker's radius on the paper: small, middle and big. */
export const STICKER_SIZES = [20, 30, 46] as const;
/** The old single size, for the radius of a sticker at size 1. */
export const STICKER_R = STICKER_SIZES[1];

/** A part of a colouring page: an ellipse (centre and radii), a rectangle, or a polygon. */
export type Shape = { e: [number, number, number, number] } | { r: [number, number, number, number] } | { p: Pt[] };
export type PageId = 'house' | 'bike' | 'fox' | 'teddy' | 'station' | 'dino' | 'pancakes' | 'sofa' | 'rocket' | 'hut';
/** A colouring page: its parts, back to front. A tap colours the frontmost part under it. */
export interface Page { id: PageId; name: Words; regions: Shape[] }

const mirror = (pts: Pt[], about: number): Pt[] => pts.map(([x, y]) => [about * 2 - x, y]);
const starShape = (x: number, y: number, r: number): Shape => ({ p: Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r; return [x + Math.cos(a) * k, y + Math.sin(a) * k] as Pt; }) });

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

/** The new pages from Carl-Otto's own world, added after the first four. */
PAGES.push(
  {
    id: 'station', name: { sv: 'Brandstationen', en: 'The fire station' }, regions: [
      { r: [0, 0, 580, 300] }, { r: [0, 290, 580, 130] }, { e: [500, 60, 34, 34] },
      { r: [70, 120, 300, 190] }, { p: [[50, 130], [220, 46], [390, 130]] }, { e: [220, 96, 18, 13] },
      { r: [130, 190, 180, 120] }, { r: [86, 146, 36, 34] }, { r: [318, 146, 36, 34] },
      { r: [392, 240, 160, 60] }, { r: [492, 204, 60, 40] }, { r: [502, 212, 40, 18] }, { r: [402, 226, 86, 12] },
      { e: [424, 306, 20, 20] }, { e: [522, 306, 20, 20] },
    ],
  },
  {
    id: 'dino', name: { sv: 'Dinosaurien', en: 'The dinosaur' }, regions: [
      { r: [0, 0, 580, 420] }, { r: [0, 340, 580, 80] }, { e: [510, 66, 40, 40] }, { e: [140, 70, 64, 26] },
      { p: [[40, 270], [190, 226], [210, 290], [60, 292]] },
      { r: [196, 280, 44, 84] }, { r: [306, 280, 44, 84] },
      { e: [270, 248, 124, 72] }, { e: [272, 276, 80, 30] },
      { p: [[336, 218], [398, 106], [440, 118], [390, 256]] }, { e: [442, 104, 50, 32] }, { e: [456, 94, 7, 7] },
      { p: [[176, 196], [198, 160], [222, 192]] }, { p: [[226, 182], [252, 142], [280, 180]] }, { p: [[290, 182], [316, 146], [342, 192]] },
    ],
  },
  {
    id: 'pancakes', name: { sv: 'Pannkakorna', en: 'The pancakes' }, regions: [
      { r: [0, 0, 580, 420] }, { r: [0, 320, 580, 100] }, { e: [290, 326, 210, 42] },
      { e: [290, 302, 150, 26] }, { e: [290, 280, 150, 26] }, { e: [290, 258, 150, 26] }, { e: [290, 236, 150, 26] },
      { e: [244, 250, 22, 10] }, { e: [290, 212, 62, 28] }, { e: [290, 190, 18, 16] }, { p: [[278, 178], [290, 164], [302, 178]] },
      { r: [466, 196, 64, 116] }, { r: [470, 226, 56, 82] }, { r: [56, 250, 14, 70] },
    ],
  },
  {
    id: 'sofa', name: { sv: 'Filmkvällen', en: 'Movie night' }, regions: [
      { r: [0, 0, 580, 300] }, { r: [0, 300, 580, 120] }, { e: [290, 384, 230, 30] },
      { r: [200, 36, 180, 112] }, { r: [212, 48, 156, 88] },
      { r: [90, 180, 400, 90] }, { r: [80, 250, 420, 62] }, { r: [56, 200, 52, 112] }, { r: [472, 200, 52, 112] },
      { e: [168, 230, 40, 32] },
      { e: [330, 250, 38, 40] }, { e: [306, 178, 11, 11] }, { e: [354, 178, 11, 11] }, { e: [330, 202, 30, 28] }, { e: [330, 212, 12, 9] },
      { p: [[436, 340], [524, 340], [508, 382], [452, 382]] }, { e: [480, 334, 42, 16] },
    ],
  },
  {
    id: 'rocket', name: { sv: 'Raketen', en: 'The rocket' }, regions: [
      { r: [0, 0, 580, 420] }, { e: [470, 330, 150, 26] }, { e: [470, 330, 88, 88] }, { e: [92, 80, 40, 40] },
      starShape(200, 60, 22), starShape(520, 92, 18), starShape(110, 320, 20),
      { p: [[244, 332], [270, 404], [296, 332]] },
      { p: [[230, 262], [186, 344], [230, 334]] }, { p: [[310, 262], [354, 344], [310, 334]] },
      { p: [[230, 334], [230, 170], [270, 86], [310, 170], [310, 334]] },
      { r: [230, 282, 80, 18] }, { e: [270, 192, 21, 21] },
    ],
  },
  {
    id: 'hut', name: { sv: 'Lekstugan', en: 'The play hut' }, regions: [
      { r: [0, 0, 580, 290] }, { r: [0, 280, 580, 140] }, { e: [520, 60, 36, 36] },
      { r: [60, 170, 26, 130] }, { e: [73, 150, 62, 60] },
      { r: [180, 150, 220, 160] }, { p: [[156, 160], [290, 66], [424, 160]] }, { r: [262, 220, 56, 90] },
      { r: [200, 180, 40, 36] }, { r: [340, 180, 40, 36] },
      { r: [440, 300, 124, 52] }, { e: [502, 302, 52, 13] },
      { e: [150, 336, 13, 13] }, { e: [420, 384, 13, 13] }, { e: [110, 384, 13, 13] },
    ],
  },
);

export const pageOf = (id: PageId): Page => PAGES.find(p => p.id === id)!;

// ---------------------------------------------------------------- tracing pages

/** A letter or number drawn as strokes in a unit box (x right, y down, 0–1). */
const GLYPHS: Record<string, Pt[][]> = (() => {
  const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 16): Pt[] =>
    Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt; });
  return {
    C: [arc(0.55, 0.5, 0.45, 0.5, -0.75, -0.75 - Math.PI * 1.55, 20).reverse()],
    A: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.6], [0.78, 0.6]]],
    R: [[[0.05, 1], [0.05, 0], [0.6, 0], [0.88, 0.12], [0.88, 0.38], [0.6, 0.5], [0.05, 0.5]], [[0.45, 0.5], [0.92, 1]]],
    L: [[[0.1, 0], [0.1, 1], [0.85, 1]]],
    '-': [[[0.15, 0.55], [0.85, 0.55]]],
    O: [arc(0.5, 0.5, 0.45, 0.5, -Math.PI / 2, Math.PI * 1.5, 24)],
    T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
    '1': [[[0.25, 0.25], [0.6, 0], [0.6, 1]]],
    '2': [[[0.1, 0.25], [0.3, 0.04], [0.6, 0], [0.86, 0.14], [0.86, 0.38], [0.1, 1], [0.92, 1]]],
    '3': [[[0.12, 0.1], [0.48, 0], [0.82, 0.12], [0.82, 0.38], [0.45, 0.5], [0.86, 0.62], [0.86, 0.88], [0.5, 1], [0.12, 0.9]]],
    '4': [[[0.7, 1], [0.7, 0], [0.05, 0.68], [0.95, 0.68]]],
    '5': [[[0.85, 0], [0.2, 0], [0.15, 0.45], [0.5, 0.38], [0.86, 0.55], [0.86, 0.86], [0.5, 1], [0.12, 0.9]]],
  };
})();

export type TraceId = 'name' | 'numbers';
export interface Trace { id: TraceId; name: Words; letters: Array<{ char: string; box: [number, number, number, number]; strokes: Pt[][] }> }

function traceRows(rows: Array<{ text: string; y: number; w: number; h: number; gap: number }>): Trace['letters'] {
  return rows.flatMap(row => {
    const total = row.text.length * row.w + (row.text.length - 1) * row.gap, x0 = (PAPER.w - total) / 2;
    return [...row.text].map((char, i) => {
      const box: [number, number, number, number] = [x0 + i * (row.w + row.gap), row.y, row.w, row.h];
      return { char, box, strokes: GLYPHS[char].map(s => s.map(([u, v]) => [box[0] + u * box[2], box[1] + v * box[3]] as Pt)) };
    });
  });
}

export const TRACES: Trace[] = [
  { id: 'name', name: { sv: 'Skriv ditt namn', en: 'Write your name' }, letters: traceRows([{ text: 'CARL-', y: 40, w: 84, h: 140, gap: 22 }, { text: 'OTTO', y: 240, w: 84, h: 140, gap: 22 }]) },
  { id: 'numbers', name: { sv: 'Siffror 1–5', en: 'Numbers 1–5' }, letters: traceRows([{ text: '12345', y: 130, w: 80, h: 150, gap: 26 }]) },
];
export const traceOf = (id: TraceId): Trace => TRACES.find(t => t.id === id)!;

/** Points along a letter's strokes, every `step` paper units: what tracing has to cover. */
export function guidePoints(strokes: Pt[][], step = 10): Pt[] {
  const out: Pt[] = [];
  for (const s of strokes) for (let i = 1; i < s.length; i++) {
    const [ax, ay] = s[i - 1], [bx, by] = s[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  return out;
}

/** Tuning: how near a line must pass to cover a guide point, and how much of a letter must be covered. */
export const TRACE = { reach: 20, share: 0.8 };
/** The sponge: how far it must be rubbed over the paper to wipe it clean. */
export const SPONGE_WORK = 1400;
