// Carl-Ottos spel 3, Hemma: Tänder och tvål, in the bathroom (after the family's photo: white tiles with a grey patterned
// border, the white sink cabinet and the mirror cabinet over it with its shelf of bottles and the round shaving mirror,
// the shelf of toilet rolls and the little clock, the red-striped towel and the teal one, the washing machine and the
// shower, and the white-and-grey step stool). Seen as Carl-Otto sees it, standing at the sink; positions are world pixels
// (the 960 × 540 world). Rules in ../bath-run.ts, pictures in ../bath-art.ts.

import type { Words } from './kurragomma';

export type Pt = [number, number];

/** The mirror cabinet's glass, and Carl-Otto's face in it (middle and world pixels per face unit). */
export const MIRROR = { x: 286, y: 78, w: 388, h: 262 };
export const FACE = { x: 480, y: 224, k: 1.05 };
/** While brushing, the mirror shows him close up, so the mouth (and the bugs on his teeth) are big enough for fingers. */
export const CLOSE_FACE = { x: 480, y: 120, k: 2 };
/** The sink: the basin, the tap, the soap pump, the cup with the toothbrush, the toothpaste tube. */
export const BASIN = { x: 480, y: 412, rx: 150, ry: 28 };
export const TAP: Pt = [480, 372];
export const PUMP: Pt = [632, 362];
export const CUP: Pt = [344, 362];
export const TUBE: Pt = [270, 386];
/** The red-striped towel on the left, and the step stool in front. */
export const TOWEL = { x: 190, y: 300, w: 64, h: 160 };
export const STOOL: Pt = [480, 506];
/** Where the hands are, and the area that counts as rubbing them. */
export const HANDS = { x: 360, y: 380, w: 240, h: 110 };

export const LINES = {
  start: { sv: 'Jag når inte! Var är pallen?', en: 'I can’t reach! Where’s the stool?' },
  up: { sv: 'Upp på pallen! Först tvättar vi händerna.', en: 'Up on the stool! First we wash our hands.' },
  pump: { sv: 'Pump, pump! Gnugga händerna!', en: 'Pump, pump! Rub your hands!' },
  bubbly: { sv: 'Massor av bubblor! Skölj av.', en: 'Lots of bubbles! Rinse them off.' },
  rinsed: { sv: 'Rena! Torka på handduken.', en: 'Clean! Dry them on the towel.' },
  dried: { sv: 'Nu tänderna. Tandkräm på borsten!', en: 'Now our teeth. Toothpaste on the brush!' },
  brush: { sv: 'Sockerbusar! Borsta bort dem!', en: 'Sugar bugs! Brush them away!' },
  bye: [{ sv: 'Hejdå!', en: 'Bye!' }, { sv: 'Hihi!', en: 'Hee hee!' }, { sv: 'Vi ses!', en: 'See you!' }, { sv: 'Plask!', en: 'Splash!' }],
  spit: { sv: 'Alla borta! Skölj munnen.', en: 'All gone! Rinse your mouth.' },
  done: { sv: 'Blänk! Rena tänder och rena händer.', en: 'Sparkle! Clean teeth and clean hands.' },
} satisfies Record<string, Words | Words[]>;

/** Gubben Noak (Bellman's old tune, free to use), as the toy piano's keys 0–7, one note for each bit of brushing. */
export const TUNE = [0, 0, 0, 2, 1, 1, 1, 3, 2, 2, 1, 1, 0, 2, 2, 2, 2, 4, 3, 3, 3, 3, 5, 4, 4, 3, 3, 2];

/** Timings in seconds, work in world pixels of rubbing. */
export const TUNING = {
  rise: 0.6, pumps: 2, rubWork: 1500, rubTap: 0.12, rinse: 1.4,
  /** A bug within this many world pixels of the brush is scrubbed; this much brushing cleans one. */
  scrubReach: 60, bugWork: 300, scrubTap: 0.35,
  /** Brushing this far plays the next note of the tune. */
  noteEvery: 70,
  flee: 1.2, hintAfter: 9,
  /** Soap bubbles: at most this many, rising this fast. */
  bubbles: 24, bubbleRise: 40,
};
