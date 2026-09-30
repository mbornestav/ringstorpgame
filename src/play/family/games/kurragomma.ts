// Carl-Ottos spel 2, Kurragömma: everything that is about the people and the places, in one file. Swap in the real
// friends here: names, looks and lines. Positions are pixels across the preschool yard (the 960 × 540 illustrated world,
// where the yard is YARD pixels wide). The rules are in ../hide-run.ts and the pictures in ../yard-art.ts and ../kids.ts.

export type Words = { sv: string; en: string };

export type HairStyle = 'short' | 'long' | 'pigtails' | 'curly' | 'bun';
export interface KidLook {
  skin: string;
  hair: string;
  style: HairStyle;
  top: string;
  bottom: string;
  shoes: string;
  /** A little extra that makes them easy to tell apart. */
  extra?: 'glasses' | 'cap' | 'bow' | 'freckles';
  extraColour?: string;
  /** Stripes across the top, in this colour. */
  stripes?: string;
  /** A t-shirt (short sleeves) rather than a long-sleeved top. */
  tee?: boolean;
  /** A picture on the front of the shirt. */
  print?: 'sponge' | 'hedgehog' | 'star' | 'dino';
  /** 1 is the usual size; a little smaller or bigger than the others. */
  size?: number;
}

export interface Friend { id: string; name: string; look: KidLook; /** What they shout when they reach the door. */ cheer: Words }

export type PlaceKind = 'lamp' | 'sandpit' | 'playhouse' | 'slide' | 'tree' | 'bush' | 'box' | 'shed' | 'leaves';
export interface Place { kind: PlaceKind; x: number; /** What a friend says when found here. */ found: Words }

export type SurpriseKind = 'cat' | 'hedgehog' | 'cushion' | 'glasses' | 'sock' | 'snail';
export interface Surprise { kind: SurpriseKind; line: Words }

export const YARD = 2560;
/** Where found friends gather: the preschool's door. */
export const DOOR_X = 322;
/** Where Carl-Otto counts, with his face to the wall. */
export const COUNT_X = 150;
/** How close Carl-Otto must be to look somewhere. */
export const REACH = 80;

export const TEACHER = { name: 'Fröken Lena', hint: { sv: 'Varmt, varmt!', en: 'Warmer, warmer!' } };

export const FRIENDS: Friend[] = [
  { id: 'harry', name: 'Harry', look: { skin: '#f3cfae', hair: '#e6c46a', style: 'short', top: '#2f6fc9', bottom: '#3c4656', shoes: '#e2573f', tee: true, print: 'hedgehog' },
    cheer: { sv: 'Hittad och glad!', en: 'Found and happy!' } },
  { id: 'aylan', name: 'Aylan', look: { skin: '#e2ae83', hair: '#6b4428', style: 'short', top: '#f08a3a', bottom: '#4a6fa5', shoes: '#2d3437', tee: true, print: 'dino', size: 0.9 },
    cheer: { sv: 'Igen, igen!', en: 'Again, again!' } },
  { id: 'frej', name: 'Frej', look: { skin: '#f3cfae', hair: '#ecd27a', style: 'short', top: '#4f9b53', bottom: '#5b6770', shoes: '#f2f0e6', tee: true, print: 'star' },
    cheer: { sv: 'Du är bäst på att leta!', en: 'You’re the best seeker!' } },
  { id: 'chloe', name: 'Chloe', look: { skin: '#f6d6bd', hair: '#b85a32', style: 'long', top: '#f07fb0', bottom: '#5b4a8a', shoes: '#f2f0e6', extra: 'freckles' },
    cheer: { sv: 'Nästa gång gömmer jag mig bättre!', en: 'Next time I’ll hide better!' } },
  { id: 'emilio', name: 'Emilio', look: { skin: '#d9a37a', hair: '#1f1a18', style: 'curly', top: '#d63c34', bottom: '#2f3a44', shoes: '#f5c93a', tee: true },
    cheer: { sv: 'Hurra!', en: 'Hooray!' } },
];

export const PLACES: Place[] = [
  { kind: 'lamp', x: 720, found: { sv: 'Hur såg du mig?!', en: 'How did you see me?!' } },
  { kind: 'sandpit', x: 940, found: { sv: 'ATJOO! Sand i näsan!', en: 'ATCHOO! Sand up my nose!' } },
  { kind: 'playhouse', x: 1180, found: { sv: 'Jag är en docka… nej, det är jag!', en: 'I’m a doll… no, it’s me!' } },
  { kind: 'slide', x: 1430, found: { sv: 'Oj, rumpan var visst inte gömd!', en: 'Oops, my bottom wasn’t hidden!' } },
  { kind: 'tree', x: 1650, found: { sv: 'Jag är en ekorre!', en: 'I’m a squirrel!' } },
  { kind: 'bush', x: 1860, found: { sv: 'Mina tår skvallrade!', en: 'My toes gave me away!' } },
  { kind: 'box', x: 2060, found: { sv: 'Paket till Carl-Otto!', en: 'A parcel for Carl-Otto!' } },
  { kind: 'shed', x: 2250, found: { sv: 'Jag parkerade mig själv!', en: 'I parked myself!' } },
  { kind: 'leaves', x: 2440, found: { sv: 'Jag är ett löv!', en: 'I’m a leaf!' } },
];

export const SURPRISES: Surprise[] = [
  { kind: 'cat', line: { sv: 'Mjau! (Det var bara katten.)', en: 'Meow! (Just the cat.)' } },
  { kind: 'hedgehog', line: { sv: 'Nöff nöff! En igelkott!', en: 'Snuffle! A hedgehog!' } },
  { kind: 'cushion', line: { sv: 'PRRRT! En pruttkudde!', en: 'PFFFT! A whoopee cushion!' } },
  { kind: 'glasses', line: { sv: 'Frökens borttappade glasögon!', en: 'The teacher’s lost glasses!' } },
  { kind: 'sock', line: { sv: 'En strumpa?! Vems är den?', en: 'A sock?! Whose is it?' } },
  { kind: 'snail', line: { sv: 'En snigel. Den gömmer sig också.', en: 'A snail. It’s hiding too.' } },
];

/** Timings, in seconds. */
export const TUNING = {
  /** Each number of the count to ten. */
  countStep: 0.7,
  /** A hidden friend nearby giggles every so often, a random time between the two. */
  giggle: [6, 10] as [number, number],
  /** How far away a giggle can be heard, in pixels. */
  earshot: 700,
  /** With no find for this long, the teacher points out the nearest friend. */
  hintAfter: 25,
  /** How long a found friend's pop-out lasts before they run to the door. */
  popOut: 2.2,
  /** Carl-Otto's walking speed, pixels a second. */
  walk: 230,
};
