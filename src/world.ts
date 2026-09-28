import type { Rect, Vec2 } from './geometry';

export type PropKind = 'house' | 'block' | 'villa' | 'tower' | 'tree' | 'car' | 'lamp' | 'bench' | 'sign' | 'hedge';
export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  height?: number;
  variant?: number;
  label?: string;
  solid?: boolean;
}
export interface Parcel { x: number; y: number; name: string; recovered: boolean }

export const BOUNDS: Rect = { x: 0, y: 0, w: 116, h: 26 };
export const START: Vec2 = { x: 3.5, y: 12 };
export const DROPOFF: Vec2 = { x: 112, y: 12 };
export const PARCELS: Parcel[] = [
  { x: 28.5, y: 11.5, name: 'Ringstorpsvägen', recovered: false },
  { x: 63.5, y: 8.3, name: 'Vattentornsparken', recovered: false },
  { x: 96.5, y: 12, name: 'Tågaborg', recovered: false },
];

const props: Prop[] = [];
const add = (kind: PropKind, x: number, y: number, w: number, h: number, height = 0, variant = 0, solid = false, label?: string) =>
  props.push({ kind, x, y, w, h, height, variant, solid, label });

// Ringstorpsvägen: low cream row houses, gardens, and cars beside the broad road.
for (let x = 3; x < 34; x += 6) {
  add('house', x, 1.2, 4.5, 3.5, 26 + (x % 3) * 3, Math.floor(x / 6) % 3, true);
  add('house', x + 1.2, 19, 4.3, 3.6, 23, (Math.floor(x / 6) + 1) % 3, true);
  add('hedge', x + 0.6, 5.5, 3.8, 0.6, 5, 0, true);
  add('hedge', x + 1, 18, 3.8, 0.55, 5, 0, true);
}
add('block', 11, 0, 6.5, 5, 42, 0, true);
add('block', 25, 19, 6, 5, 37, 1, true);
add('sign', 5, 7, 0.2, 0.2, 15, 0, false, 'RINGSTORPSVÄGEN');
for (const [x, y, v] of [[8, 9, 0], [18, 14.6, 2], [23, 9.5, 1], [33, 14, 0]]) add('car', x, y, 2.2, 1.15, 8, v, true);

// The elevated green around the old water tower is the level's visual midpoint.
add('tower', 51, 2.2, 5, 5, 62, 0, true, 'VATTENTORNET');
add('sign', 43, 7, 0.2, 0.2, 15, 1, false, 'RINGSTORP');
add('bench', 48.5, 7.8, 1.1, 0.5, 3, 0, true);
add('bench', 59, 6.8, 1.1, 0.5, 3, 1, true);
add('car', 46, 14.5, 2.2, 1.15, 8, 1, true);
add('car', 67, 9.2, 2.2, 1.15, 8, 2, true);
for (const [x, y, v] of [[38, 3, 0], [42, 5, 1], [46, 2, 2], [59, 2, 0], [63, 4, 2], [68, 3, 1], [39, 20, 1], [48, 21, 0], [57, 20, 2], [66, 21, 1]])
  add('tree', x, y, 0.8, 0.8, 22 + v * 3, v, true);
add('hedge', 39, 18.2, 5, 0.6, 5, 0, true);
add('hedge', 61, 18.2, 5, 0.6, 5, 0, true);

// Tågaborg: taller brick fronts and villas, with a tighter residential street.
for (let x = 76; x < 112; x += 7) {
  add('villa', x, 1.5, 5, 4.2, 31 + (x % 2) * 4, Math.floor(x / 7) % 3, true);
  add('block', x + 0.3, 19, 5, 4.2, 36, Math.floor(x / 7) % 2, true);
  add('hedge', x + 0.5, 6.3, 4, 0.55, 5, 0, true);
}
add('sign', 78, 7.2, 0.2, 0.2, 15, 2, false, 'TÅGABORG');
add('sign', 108, 8, 0.2, 0.2, 15, 3, false, 'DROP-OFF');
for (const [x, y, v] of [[80, 14.6, 2], [90, 9.3, 0], [101, 14.3, 1]]) add('car', x, y, 2.2, 1.15, 8, v, true);
for (const [x, y, v] of [[74, 19, 1], [85, 6, 0], [98, 6, 2], [110, 19, 1]]) add('tree', x, y, 0.8, 0.8, 25, v, true);

for (let x = 7; x < 114; x += 12) {
  add('lamp', x, 7.2, 0.3, 0.3, 25, 0, false);
  add('lamp', x + 6, 17, 0.3, 0.3, 25, 1, false);
}

export const PROPS = props;
export const OBSTACLES: Rect[] = props.filter(p => p.solid).map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h }));

export function groundKind(x: number, y: number): 'road' | 'walk' | 'grass' | 'paver' {
  if (y >= 9 && y <= 15) return 'road';
  if (y >= 7 && y < 9 || y > 15 && y <= 18) return 'walk';
  if (x >= 36 && x < 73) return 'grass';
  if (x >= 73 && y < 7) return 'paver';
  return 'grass';
}
