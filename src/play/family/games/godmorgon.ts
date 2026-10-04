// Carl-Ottos spel 3, Hemma: God morgon, in the big bedroom the morning after (after the family's photo: the dark floral
// wallpaper behind the bed, the blue walls, the birch bed under a duvet of red and pink flowers, the brass star lamp with
// its round bulbs, the beige curtains and the window onto the garden shed). Positions are world pixels (the 960 × 540
// world); the rules are in ../morning-run.ts and the pictures in ../morning-art.ts.

import type { KidLook, Words } from './kurragomma';

export type Pt = [number, number];
/** The three ways to wake Mamma and Pappa (in any order). */
export type Wake = 'curtains' | 'tickle' | 'teddy';

export const FLOOR = 452;
/** The bed: the headboard on the left, the mattress's top, and the foot on the right. */
export const BED = { x: 110, top: 344, w: 520, foot: 630 };
/** Pappa sleeps at the back, Mamma at the front; their heads on the pillows by the headboard. */
export const PAPPA_HEAD: Pt = [196, 312];
export const MAMMA_HEAD: Pt = [214, 340];
/** Pappa's foot, sticking out from under the duvet at the end of the bed. */
export const FOOT: Pt = [640, 352];
/** The window and its curtains, and the armchair where Nallen sits. */
export const WINDOW = { x: 676, y: 112, w: 196, h: 214 };
export const TEDDY_START: Pt = [904, 384];
/** The star lamp: its middle, and its eight bulbs (lit one by one by bouncing). */
export const LAMP = { x: 380, y: 152, arm: 70 };
export const BULBS = 8;
/** Where Carl-Otto stands while he wakes them, and where he bounces on the bed. */
export const STAND: Pt = [770, 528];
export const BOUNCE_X = 430;

/** Mamma and Pappa, drawn as grown-ups after their photos: Mamma's light-brown hair pulled back, her black top; Pappa's
 * messy brown hair, his stubble and moustache, his dark-green t-shirt. */
export const MAMMA: KidLook = { skin: '#f0c4a4', hair: '#9a7550', style: 'bun', top: '#2b2b2e', bottom: '#4d5257', shoes: '#f0c4a4', barefoot: true };
export const PAPPA: KidLook = { skin: '#eebd98', hair: '#7a5a3a', style: 'short', top: '#3a4a34', bottom: '#4d5257', shoes: '#eebd98', barefoot: true, tee: true, extra: 'stubble' };

export const LINES = {
  start: { sv: 'Psst! Mamma och pappa sover fortfarande. Väck dem!', en: 'Psst! Mamma and Pappa are still asleep. Wake them up!' },
  curtains: { sv: 'Mmm… fem minuter till…', en: 'Mmm… five more minutes…' },
  tickle: { sv: 'Hihi! Det kittlas!', en: 'Hee hee! That tickles!' },
  teddy: { sv: 'ATJOO! Nallen, är det du?', en: 'ATCHOO! Teddy, is that you?' },
  awake: { sv: 'God morgon, Carl-Otto!', en: 'Good morning, Carl-Otto!' },
  bounce: { sv: 'Okej, hoppa då! Tryck för att hoppa.', en: 'Okay, go on then, bounce! Tap to jump.' },
  count: [
    { sv: 'Ett!', en: 'One!' }, { sv: 'Två!', en: 'Two!' }, { sv: 'Tre!', en: 'Three!' }, { sv: 'Fyra!', en: 'Four!' },
    { sv: 'Fem!', en: 'Five!' }, { sv: 'Sex!', en: 'Six!' }, { sv: 'Sju!', en: 'Seven!' }, { sv: 'Åtta!', en: 'Eight!' },
  ],
  hug: { sv: 'Kram! Nu är det dags för förskolan.', en: 'Hug! Now it’s time for preschool.' },
} satisfies Record<string, Words | Words[]>;

/** Timings in seconds; speeds in world pixels a second. */
export const TUNING = {
  /** The curtains sliding open; Nallen hopping onto Mamma's nose; how many tickles wake Pappa. */
  curtains: 1,
  hop: 0.6,
  tickles: 3,
  /** Mamma and Pappa sitting up once all three have worked, and when the bouncing begins. */
  sitUp: 1.2,
  toBounce: 2.6,
  /** Bouncing: gravity, the little hop on its own, and a jump (a little higher with every bulb lit). */
  gravity: 1700,
  hopSpeed: 260,
  jump: 400,
  jumpGain: 14,
  /** A tap in the air is kept this long and used on landing. */
  buffer: 0.6,
  /** After the last bulb: the hug, and when the "off to preschool" panel shows. */
  hug: 2.4,
  /** With nothing done for this long, the next thing to do sparkles. */
  hintAfter: 9,
  /** A teddy dragged this close to Mamma's nose goes there; a press that moves less than this is a tap. */
  reach: 90,
  grab: 56,
  tap: 14,
};
