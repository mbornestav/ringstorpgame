import { Palette } from './retro';

// The retro build's palettes, one per kind of light. Each was seeded by median-cut from real 480x270 frames of the levels
// (scripts/extract-palette.mjs) and then tuned by hand, so they hold the game's own colours plus enough steps in the
// ramps (sky, brick, asphalt, skin, foliage) for the dither to read as shading.

const DAY: string[] = [
  '#282e36', '#3f3d3e', '#424a54', '#563d39', '#7b453e', '#405e3f', '#565a55', '#557549',
  '#795d4f', '#737e51', '#779656', '#4a5564', '#596668', '#3f5d82', '#42689e', '#716d66',
  '#777c7d', '#7d966a', '#809183', '#79939d', '#789bb3', '#87a7b7', '#975442', '#956658',
  '#a6604d', '#bb624e', '#9a7761', '#9c8c61', '#b28461', '#c88863', '#958479', '#b08073',
  '#b89483', '#99a189', '#97a5a4', '#aca38f', '#c3a184', '#9cb470', '#a0b48c', '#a5b4ab',
  '#bdb495', '#bbbdb0', '#d8ba91', '#dccbab', '#99b9c7', '#b4c7c6', '#c6cdc7', '#d6d2c4',
  '#e4dfcf',
  // Accents: ink, the red badge and ICA, hi-vis yellow, paper white, skin, sign blue, Statoil orange, bright leaf.
  '#1c2126', '#d64236', '#f2c94c', '#fbf8ee', '#e7b48c', '#2f6db0', '#e98a3a', '#5fa24a',
  // A sky ramp, so the sky bands instead of speckling.
  '#6fa6c6', '#86b5cf', '#9dc3d7', '#b3d0dd', '#c9dde3', '#dfe8e6', '#f1e9d6',
];
const NIGHT: string[] = [
  '#0a0c1c', '#111b20', '#0c122e', '#162031', '#1e1e2d', '#291e28', '#213232', '#363234',
  '#1e2742', '#253546', '#333343', '#3a4347', '#263356', '#3b4657', '#2d3b66', '#3d4867',
  '#364475', '#364690', '#494142', '#494c5c', '#54413b', '#524e59', '#5e4540', '#823134',
  '#535a51', '#556062', '#6e6547', '#6d6560', '#515872', '#696972', '#5d6583', '#59669b',
  '#7c7b63', '#7a7c80', '#7c8192', '#918868', '#91908e', '#a0977e', '#bbb68c', '#7881a6',
  '#9598a7', '#8791b9', '#9ca4c0', '#acacad', '#adb3ca', '#cacabe', '#bbc3d9', '#eeefe5',
  // Accents: ink, lamp light and its hot core, hi-vis yellow, tail-light red, beacon blue, skin, lit brick.
  '#1c2126', '#ffd98a', '#ffefc0', '#f2c94c', '#d64236', '#2f6db0', '#e7b48c', '#c98a5a',
];
const INTERIOR: string[] = [
  '#333231', '#3b414a', '#4d4c4c', '#6c4b44', '#525853', '#57655c', '#3f8d57', '#7e5e4c',
  '#7e7257', '#70915b', '#325083', '#5c646b', '#676b6e', '#717474', '#7d7b76', '#6f9273',
  '#818882', '#88867d', '#889092', '#918d81', '#919492', '#91a9b2', '#a17f57', '#bd7850',
  '#b58e60', '#b9956a', '#9f9788', '#d1b04c', '#cda16c', '#bba37e', '#dbb980', '#a29f97',
  '#b7ac96', '#a9aaa5', '#c3b9a5', '#b1c0c5', '#c2c8c6', '#d8cbb2', '#dad5c9', '#eee6cf',
  // Accents: ink, the red floor numbers, paper white, skin, blue.
  '#1c2126', '#d64236', '#fbf8ee', '#e7b48c', '#2f6db0',
];

/** How far (in 0–255 units) the ordered dither may push a channel: enough to shade ramps, low enough to keep flats flat. */
const SPREAD = { day: 10, night: 9, interior: 10 } as const;

export type Lighting = keyof typeof SPREAD;
const cache = new Map<Lighting, Palette>();

export function paletteFor(lighting: Lighting): { palette: Palette; spread: number } {
  let palette = cache.get(lighting);
  if (!palette) cache.set(lighting, palette = new Palette(lighting === 'night' ? NIGHT : lighting === 'interior' ? INTERIOR : DAY));
  return { palette, spread: SPREAD[lighting] };
}
