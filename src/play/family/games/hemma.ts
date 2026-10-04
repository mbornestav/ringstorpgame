// Carl-Ottos spel 3, Hemma: the house, after the robot vacuum's map of it, and what there is to do in each room. Map units
// are the pixels of that map (a phone screenshot, 726 × 947); house-art.ts scales them onto the 960 × 540 world. The
// activities are listed in the order of an evening at home, with the big bedroom the next morning; every room is open from
// the start, and the map only suggests the next one.

import type { Words } from './kurragomma';

export type RoomId = 'kitchen' | 'living' | 'dining' | 'wc' | 'hall' | 'bedroom' | 'big' | 'toilet' | 'garden';
export type ActivityId = 'hemkomst' | 'pyssel' | 'pannkakor' | 'duka' | 'filmkvall' | 'tander' | 'spegel' | 'godnatt' | 'godmorgon' | 'tradgard';
export type Rect = [x: number, y: number, w: number, h: number];
export type Floor = 'dark' | 'oak' | 'tiles' | 'grass';

export interface Room {
  id: RoomId;
  name: Words;
  /** The floor, as rectangles; the first is where a tap selects the room. */
  floor: Rect[];
  kind: Floor;
  /** Where Carl-Otto's head stands when the room is chosen, and where its name goes. */
  at: [number, number];
  label: [number, number];
}

export interface Activity {
  id: ActivityId;
  room: RoomId;
  title: Words;
  blurb: Words;
  /** The scene that plays it, or null while it is still being built. */
  scene: string | null;
  /** The next morning, after the evening. */
  morning?: true;
}

/** The map's own size, and the part of it the house (and the garden) covers. */
export const MAP = { w: 726, h: 947, x0: 30, y0: 225, x1: 722, y1: 885 };

export const ROOMS: Room[] = [
  { id: 'kitchen', name: { sv: 'Köket', en: 'Kitchen' }, floor: [[88, 232, 230, 103]], kind: 'dark', at: [214, 300], label: [100, 244] },
  { id: 'living', name: { sv: 'Vardagsrummet', en: 'Living room' }, floor: [[318, 225, 240, 230]], kind: 'dark', at: [528, 380], label: [330, 236] },
  { id: 'dining', name: { sv: 'Matsalen', en: 'Dining room' }, floor: [[558, 265, 164, 190]], kind: 'dark', at: [690, 300], label: [568, 432] },
  { id: 'wc', name: { sv: 'Badrummet', en: 'Bathroom' }, floor: [[55, 370, 123, 65]], kind: 'tiles', at: [150, 405], label: [62, 377] },
  // The entrance room and the corridor up to the kitchen.
  { id: 'hall', name: { sv: 'Hallen', en: 'Hall' }, floor: [[50, 455, 268, 165], [265, 335, 53, 120]], kind: 'dark', at: [130, 530], label: [92, 462] },
  { id: 'bedroom', name: { sv: 'Carl-Ottos rum', en: 'Carl-Otto’s room' }, floor: [[32, 622, 233, 108]], kind: 'oak', at: [214, 700], label: [40, 704] },
  { id: 'big', name: { sv: 'Stora sovrummet', en: 'Big bedroom' }, floor: [[45, 735, 220, 150]], kind: 'oak', at: [232, 840], label: [52, 742] },
  // The little toilet beside the bedrooms (the robot's own "Room" there).
  { id: 'toilet', name: { sv: 'Toa', en: 'WC' }, floor: [[265, 620, 53, 155]], kind: 'tiles', at: [291, 690], label: [270, 744] },
  { id: 'garden', name: { sv: 'Trädgården', en: 'Garden' }, floor: [[335, 480, 240, 400]], kind: 'grass', at: [520, 560], label: [372, 846] },
];

/** The big grey sofa in the living room, which the robot cannot get under (it is the blank in the middle of its map). */
export const BIG_SOFA: Rect = [332, 300, 168, 132];
/** Openings between rooms, drawn over the walls. */
export const DOORS: Rect[] = [
  [310, 244, 16, 76], [270, 326, 44, 16], [309, 438, 18, 14], [550, 392, 16, 40], [100, 428, 34, 34], [272, 612, 40, 16], [190, 612, 40, 16],
  [258, 650, 14, 36], [258, 790, 18, 36], [312, 520, 30, 44],
];
/** The front door: the entrance room's outer wall, where the robot saw out into the street. */
export const FRONT_DOOR: Rect = [40, 480, 14, 40];

export const ACTIVITIES: Activity[] = [
  { id: 'hemkomst', room: 'hall', title: { sv: 'Hemkomst', en: 'Home again' }, scene: 'Homecoming',
    blurb: { sv: 'Para ihop skorna och ställ dem på hyllan.', en: 'Match the shoes and put them on the rack.' } },
  { id: 'pyssel', room: 'hall', title: { sv: 'Pysselhörnan', en: 'The craft corner' }, scene: 'Craft',
    blurb: { sv: 'Rita, måla och klistra stjärnor.', en: 'Draw, colour in and stick on stars.' } },
  { id: 'pannkakor', room: 'kitchen', title: { sv: 'Pannkakor', en: 'Pancakes' }, scene: 'Pancake',
    blurb: { sv: 'Knäck äggen, vispa och vänd pannkakorna.', en: 'Crack the eggs, whisk and flip the pancakes.' } },
  { id: 'duka', room: 'dining', title: { sv: 'Duka bordet', en: 'Set the table' }, scene: 'Dining',
    blurb: { sv: 'Duka till mamma, pappa, Carl-Otto – och Nallen.', en: 'Set places for Mamma, Pappa, Carl-Otto – and Teddy.' } },
  { id: 'filmkvall', room: 'living', title: { sv: 'Filmkväll', en: 'Movie night' }, scene: 'Movie',
    blurb: { sv: 'Hitta det som behövs till filmkvällen och gör soffan mysig.', en: 'Find what movie night needs and make the sofa cosy.' } },
  { id: 'tander', room: 'wc', title: { sv: 'Tänder och tvål', en: 'Teeth and soap' }, scene: 'Bath',
    blurb: { sv: 'Tvätta händerna och borsta bort sockerbusarna.', en: 'Wash your hands and brush away the sugar bugs.' } },
  { id: 'spegel', room: 'toilet', title: { sv: 'Fånig i spegeln', en: 'Silly in the mirror' }, scene: 'Silly',
    blurb: { sv: 'Ge Carl-Otto glasögon, hatt och mustasch i spegeln.', en: 'Give Carl-Otto glasses, a hat and a moustache in the mirror.' } },
  { id: 'godnatt', room: 'bedroom', title: { sv: 'Godnatt', en: 'Goodnight' }, scene: 'Goodnight',
    blurb: { sv: 'Städa, spela piano och säg godnatt till djuren.', en: 'Tidy up, play the piano and say goodnight to the animals.' } },
  { id: 'godmorgon', room: 'big', title: { sv: 'God morgon', en: 'Good morning' }, scene: 'Morning', morning: true,
    blurb: { sv: 'Väck mamma och pappa och hoppa i sängen!', en: 'Wake up Mamma and Pappa and bounce on the bed!' } },
  { id: 'tradgard', room: 'garden', title: { sv: 'Trädgården', en: 'The garden' }, scene: null,
    blurb: { sv: 'Vattna blommorna och plocka äpplen.', en: 'Water the flowers and pick apples.' } },
];

export const roomOf = (id: RoomId): Room => ROOMS.find(r => r.id === id)!;
export const activitiesIn = (id: RoomId): Activity[] => ACTIVITIES.filter(a => a.room === id);
