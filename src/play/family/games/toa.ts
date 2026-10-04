// Carl-Ottos spel 3, Hemma: Fånig i spegeln, in the little toilet (after the family's photo: coral-pink walls, a back
// wall of dark weathered planks with a crate shelf, a pierced brass lantern and two paper fans, the mirror with its light
// bar over the small white basin, and framed pictures and posters up the side wall). Positions are world pixels (the
// 960 × 540 world); the rules are in ../silly-run.ts and the pictures in ../silly-art.ts.

import type { Eyes, Mouth } from '../mirror-face';
import type { Words } from './kurragomma';

export type Slot = 'head' | 'eyes' | 'nose' | 'lip';
export type ItemId = 'crown' | 'pirate' | 'party' | 'bow' | 'glasses' | 'sunglasses' | 'stars' | 'clown' | 'moustache';

export interface Item { id: ItemId; slot: Slot; name: Words }
export const ITEMS: Item[] = [
  { id: 'crown', slot: 'head', name: { sv: 'Krona', en: 'Crown' } },
  { id: 'pirate', slot: 'head', name: { sv: 'Pirathatt', en: 'Pirate hat' } },
  { id: 'party', slot: 'head', name: { sv: 'Partyhatt', en: 'Party hat' } },
  { id: 'bow', slot: 'head', name: { sv: 'Rosett', en: 'Bow' } },
  { id: 'glasses', slot: 'eyes', name: { sv: 'Glasögon', en: 'Glasses' } },
  { id: 'sunglasses', slot: 'eyes', name: { sv: 'Solglasögon', en: 'Sunglasses' } },
  { id: 'stars', slot: 'eyes', name: { sv: 'Stjärnglasögon', en: 'Star glasses' } },
  { id: 'clown', slot: 'nose', name: { sv: 'Clownnäsa', en: 'Clown nose' } },
  { id: 'moustache', slot: 'lip', name: { sv: 'Mustasch', en: 'Moustache' } },
];

/** Silly faces, one after another. */
export const FACES: Array<{ eyes: Eyes; mouth: Mouth; name: Words }> = [
  { eyes: 'open', mouth: 'smile', name: { sv: 'Glad', en: 'Happy' } },
  { eyes: 'cross', mouth: 'tongue', name: { sv: 'Bläää!', en: 'Bleh!' } },
  { eyes: 'wide', mouth: 'o', name: { sv: 'Oj!', en: 'Oh!' } },
  { eyes: 'wink', mouth: 'grin', name: { sv: 'Blink!', en: 'Wink!' } },
  { eyes: 'shut', mouth: 'grin', name: { sv: 'Hihi!', en: 'Hee hee!' } },
];

/** The mirror's glass, the face in it, and the tray of things along the bottom. */
export const MIRROR = { x: 250, y: 70, w: 460, h: 330 };
export const FACE = { x: 480, y: 262, k: 1.15 };
export const TRAY = { y: 470, x0: 72, step: 102 };

export const LINES = {
  start: { sv: 'Spegel, spegel… Gör mig fånig!', en: 'Mirror, mirror… Make me silly!' },
  photo: { sv: 'Klick! Bilden hänger nu på väggen.', en: 'Click! The picture is up on the wall now.' },
} satisfies Record<string, Words>;
