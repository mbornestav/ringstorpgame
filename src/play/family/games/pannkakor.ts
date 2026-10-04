// Carl-Ottos spel 3, Hemma: Pannkakor, in the kitchen (after the family's photo: the black worktop on white cabinets, the
// window with its blind and the pots of herbs on the sill, the clock, the pendant lamp). Everything about the ingredients,
// the pan and the toppings, in one file. Positions are world pixels (the 960 × 540 world); the rules are in
// ../pancake-run.ts and the pictures in ../pancake-art.ts.

import type { Words } from './kurragomma';

export type Ingredient = 'egg' | 'milk' | 'flour';
export type Topping = 'jam' | 'cream' | 'blueberry' | 'strawberry' | 'sugar';
export type Doneness = 'pale' | 'golden' | 'brown';

/** The worktop's front edge: things stand on it. Low on the screen, so everything on it is big enough for small fingers. */
export const COUNTER = 392;
/** Where things stand on the worktop (their middle). Carl-Otto stands behind the worktop at the left end. */
export const AT = { egg: 180, milk: 284, flour: 364, bowl: 540, pan: 748, plate: 904 } as const;
/** How much bigger than their drawings the things on the worktop are. */
export const ITEM_SCALE = 1.3;
/** The bowl's mouth, and the area that counts as stirring in it (clear of the plants on the sill above). */
export const BOWL = { x: AT.bowl, y: COUNTER - 76, rx: 124, ry: 32 };
export const WHISK_AREA = { x: AT.bowl - 150, y: COUNTER - 118, w: 300, h: 150 };
/** The pan's middle, and the area a tap on it covers (the "pour / flip / to the plate" bubble over it too). */
export const PAN = { x: AT.pan, y: COUNTER - 24, rx: 100 };
export const PAN_AREA = { x: AT.pan - 130, y: COUNTER - 230, w: 250, h: 262 };
/** While the toppings go on, the plate stands in the middle; the top pancake's face is this ellipse. */
export const TOP = { x: 480, y: COUNTER - 70, rx: 180, ry: 58 };
/** Where the topping bowls stand, left to right, while the toppings go on. */
export const TOPPING_AT: Record<Topping, number> = { jam: 152, cream: 236, blueberry: 742, strawberry: 826, sugar: 910 };

/** How many pancakes the batter makes. */
export const PANCAKES = 5;
export const EGGS = 3;

export const NAMES: Record<Ingredient | Topping, Words> = {
  egg: { sv: 'Ägg', en: 'Egg' }, milk: { sv: 'Mjölk', en: 'Milk' }, flour: { sv: 'Mjöl', en: 'Flour' },
  jam: { sv: 'Sylt', en: 'Jam' }, cream: { sv: 'Grädde', en: 'Cream' }, blueberry: { sv: 'Blåbär', en: 'Blueberries' },
  strawberry: { sv: 'Jordgubbar', en: 'Strawberries' }, sugar: { sv: 'Socker', en: 'Sugar' },
};

/** What Carl-Otto says. */
export const LINES = {
  start: { sv: 'Vi bakar pannkakor! Ägg, mjölk och mjöl i skålen.', en: 'Let’s make pancakes! Eggs, milk and flour in the bowl.' },
  eggs: [{ sv: 'Knäck! Ett!', en: 'Crack! One!' }, { sv: 'Knäck! Två!', en: 'Crack! Two!' }, { sv: 'Knäck! Tre!', en: 'Crack! Three!' }],
  milk: { sv: 'Glugg, glugg, glugg!', en: 'Glug, glug, glug!' },
  flour: { sv: 'Puff! ATJOO!', en: 'Poof! ATCHOO!' },
  whisk: { sv: 'Nu vispar vi! Rör runt i skålen.', en: 'Now we whisk! Stir round the bowl.' },
  smooth: { sv: 'Slät och fin smet!', en: 'Nice smooth batter!' },
  pour: { sv: 'Tryck på pannan!', en: 'Tap the pan!' },
  pale: { sv: 'Lite blek – gott ändå!', en: 'A bit pale – yummy anyway!' },
  golden: { sv: 'Gyllenbrun! Perfekt!', en: 'Golden brown! Perfect!' },
  brown: { sv: 'Lite brynt – gott ändå!', en: 'A bit brown – yummy anyway!' },
  count: [{ sv: 'En!', en: 'One!' }, { sv: 'Två!', en: 'Two!' }, { sv: 'Tre!', en: 'Three!' }, { sv: 'Fyra!', en: 'Four!' }, { sv: 'Fem!', en: 'Five!' }],
  toppings: { sv: 'Nu sylt och grädde! Tryck på pannkakorna.', en: 'Now jam and cream! Tap the pancakes.' },
  plant: { sv: 'Drick, lilla blomma!', en: 'Drink up, little plant!' },
} satisfies Record<string, Words | Words[]>;

/** The pots of herbs on the windowsill: x in world pixels, and the band a tap on their leaves covers (clear of the bowl). */
export const PLANTS = [372, 428, 486, 548, 606];
export const PLANT_BAND = { y: 188, h: 64 };

/** Timings in seconds, amounts as fractions. */
export const TUNING = {
  /** An ingredient on its way into the bowl. */
  into: 0.8,
  /** How much stirring (world pixels of finger or mouse moving in the bowl) makes the batter smooth. */
  whiskWork: 2400,
  /** A tap in the bowl, or a key, stirs this much. */
  stirTap: 0.07,
  /** Batter running into the pan. */
  pour: 0.9,
  /** First side: bubbles show at this age; flipped before that it is pale, after `brown` brown. */
  bubbles: 2.6,
  brown: 8,
  /** The pancake in the air when flipped. */
  flight: 0.7,
  /** Second side: done after this, and slides onto the plate by itself if not tapped. */
  side2: 2,
  autoPlate: 4,
  /** Sliding onto the plate. */
  slide: 0.6,
  /** With nothing done for this long, the next thing to do sparkles. */
  hintAfter: 10,
  /** Toppings: the most there can be, and how far apart a dragged line of them is. */
  maxToppings: 90,
  toppingStep: 26,
};
