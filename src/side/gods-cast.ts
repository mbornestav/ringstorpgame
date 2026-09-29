import type { Look } from './fighters';

// The people Marcus can meet in Kurirgatan 28's lobby and on its floors. Each floor gets a
// random few from this cast; talking to them (E) gives one of their two lines.

export type Prop = 'dog' | 'rollator' | 'guitar' | 'box' | 'scooter';
export interface Archetype { id: string; look: Look; prop?: Prop }

export const CAST: readonly Archetype[] = [
  { id: 'grumpy', look: { skin: '#e2b797', hair: '#c9c9c4', jacket: '#7a5b3e', arms: '#7a5b3e', trousers: '#4b4f57', shoes: '#2b2622', height: 42, build: 10, limb: 4 } },
  { id: 'kid', prop: 'scooter', look: { skin: '#efc6a6', hair: '#6b4a2a', jacket: '#c43b32', arms: '#c43b32', trousers: '#33507a', shoes: '#f0ede0', height: 30, build: 8, limb: 3 } },
  { id: 'dogwalker', prop: 'dog', look: { skin: '#e6b892', hair: '#3a2a20', jacket: '#4d7a55', arms: '#4d7a55', trousers: '#2e3340', shoes: '#3b342e', height: 43, build: 9, limb: 4, fringe: '#5a4232' } },
  { id: 'pizza', prop: 'box', look: { skin: '#d9a985', hair: '#241d1b', jacket: '#2f5fb0', arms: '#2f5fb0', trousers: '#2a2c33', shoes: '#eeeae0', height: 43, build: 9, limb: 4, cap: '#c8352d' } },
  { id: 'rollator', prop: 'rollator', look: { skin: '#e8c3a6', hair: '#d8d8d4', jacket: '#8a5d8e', arms: '#8a5d8e', trousers: '#5a5560', shoes: '#39332f', height: 39, build: 9, limb: 4 } },
  { id: 'caretaker', look: { skin: '#d0a07f', hair: '#3b3026', jacket: '#b8a67c', arms: '#a89668', trousers: '#8d7e5b', shoes: '#2a2723', height: 45, build: 11, limb: 4, cap: '#3c4a3a' } },
  { id: 'nurse', look: { skin: '#e7bd99', hair: '#2b211d', jacket: '#3b9aa0', arms: '#3b9aa0', trousers: '#2f7c84', shoes: '#f0ede4', height: 43, build: 9, limb: 4, shortSleeves: true } },
  { id: 'gamer', look: { skin: '#ecc5a5', hair: '#1b1b20', jacket: '#2e2e3a', arms: '#2e2e3a', trousers: '#1f232c', shoes: '#c9c9c4', height: 44, build: 8, limb: 4, shades: true } },
  { id: 'musician', prop: 'guitar', look: { skin: '#e2b493', hair: '#2b1e18', fringe: '#5b4030', jacket: '#232327', arms: '#232327', trousers: '#3a3a44', shoes: '#151517', height: 45, build: 9, limb: 4 } },
  { id: 'suit', look: { skin: '#dfb08f', hair: '#4a3c30', jacket: '#5c6270', arms: '#5c6270', trousers: '#474c58', shoes: '#141416', height: 46, build: 10, limb: 4 } },
  { id: 'jogger', look: { skin: '#d8a683', hair: '#231d1b', jacket: '#9ad13a', arms: '#9ad13a', trousers: '#232730', shoes: '#f4f0e6', height: 44, build: 8, limb: 4, shortSleeves: true, stripe: '#f4f0e6' } },
  { id: 'baker', prop: 'box', look: { skin: '#eac3a0', hair: '#7a5a3a', fringe: '#a07d55', jacket: '#efe9dc', arms: '#efe9dc', trousers: '#3a4048', shoes: '#33302c', height: 42, build: 10, limb: 4 } },
] as const;

export const ARCHETYPE = new Map(CAST.map(a => [a.id, a]));
