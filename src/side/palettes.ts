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
  // Accents: ink, the red badge and ICA, hi-vis yellow, paper white, skin, sign blue, Statoil's orange, bright leaf.
  '#1c2126', '#d64236', '#f2c94c', '#fbf8ee', '#e7b48c', '#2f6db0', '#f8a322', '#5fa24a',
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
  // Accents: ink, lamp light and its hot core, hi-vis yellow, tail-light red, beacon blue, skin, lit brick, and
  // Statoil's orange and blue.
  '#1c2126', '#ffd98a', '#ffefc0', '#f2c94c', '#d64236', '#2f6db0', '#e7b48c', '#c98a5a', '#f8a322', '#003d7c',
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

/** Carl-Otto's ride in Höganäs, from frames of the whole ride. */
const BIKE: string[] = [
  '#39413b', '#405e3f', '#5b4b34', '#586044', '#883b2c', '#815e40', '#5e7441', '#698846',
  '#86834f', '#88a253', '#2b6279', '#526b6f', '#4e8a7b', '#768171', '#7d9a79', '#957f6f',
  '#949779', '#98af70', '#3388b6', '#6194ae', '#63abc9', '#7daab3', '#7cbad1', '#95b2ae',
  '#96c6d2', '#af442e', '#b35042', '#d34e31', '#d65944', '#b98154', '#e0794e', '#ac9070',
  '#d38973', '#b0ac5f', '#b4ac75', '#dfbc44', '#dcb96c', '#b7aa82', '#b3c485', '#d3ad81',
  '#d7bd86', '#aeaa9a', '#b3c4a3', '#b2c8c1', '#dca59c', '#dabd99', '#dcc897', '#dacbb0',
  '#c3d7cb', '#ebdbb1', '#e8e5cf', '#b2d8de', '#cee0df', '#eff1ea',
  // Accents: ink, sunlight white, apple red, the blue helmet, skin, leaf green, the preschool's red, dandelion yellow.
  '#2b3936', '#fffbea', '#e2432f', '#2d97d0', '#f0c197', '#62853d', '#c04439', '#f2c230',
];

/** Kurragömma's preschool yard, from frames of a whole round: the play things and the children's clothes. */
const YARD: string[] = [
  '#393732', '#485137', '#435255', '#793129', '#714f30', '#735848', '#587239', '#60725b',
  '#648c4b', '#807a46', '#7e8261', '#82a055', '#9b3c2e', '#9d5343', '#9c7547', '#9c7c61',
  '#c74a3b', '#bd7451', '#de704e', '#a1a453', '#a0ad6a', '#d7a63f', '#cca163', '#e6c241',
  '#e7c861', '#426088', '#5a8092', '#3e7fbf', '#5ea5c6', '#91817f', '#959d82', '#949d97',
  '#87a8b1', '#9db58f', '#adbc8b', '#98bcbc', '#7fbcd5', '#a1ccd5', '#ca8f80', '#dc89a2',
  '#d2af83', '#cfb1a4', '#bac690', '#e1c590', '#b7c9bc', '#d2c9b9', '#e8d99a', '#d7d9bd',
  '#c2d8d1', '#e2e3cf', '#c9dfdd', '#eff0e9',
  // Accents: ink, sunlight white, skin (light and dark), the SpongeBob yellow, the Sonic blue, Chloe's pink, the slide blue,
  // grass green, apple red, dark hair.
  '#2b3936', '#fffbea', '#f3cfae', '#8d5a3b', '#f5d23a', '#2f62d9', '#f07fb0', '#6cc0ee', '#8aad55', '#e2432f', '#1f1a18',
];

/** How far (in 0–255 units) the ordered dither may push a channel: enough to shade ramps, low enough to keep flats flat. */
const SPREAD = { day: 10, night: 9, interior: 10, bike: 10, yard: 10 } as const;

export type Lighting = keyof typeof SPREAD;
const cache = new Map<Lighting, Palette>();

export function paletteFor(lighting: Lighting): { palette: Palette; spread: number } {
  let palette = cache.get(lighting);
  if (!palette) cache.set(lighting, palette = new Palette({ day: DAY, night: NIGHT, interior: INTERIOR, bike: BIKE, yard: YARD }[lighting]));
  return { palette, spread: SPREAD[lighting] };
}
