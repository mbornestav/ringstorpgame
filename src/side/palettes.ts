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

/** Filmkväll's living room, after the photo: the grey-green floral wallpaper, the dark wooden floor, the white shelves and
 * table, the grey sofa and the black chair, straw and wicker, the books' spines, and the TV's picture and green backlight. */
const HOME: string[] = [
  // Wall, ceiling and skirting.
  '#8e917f', '#9a9c8d', '#a6a899', '#b4b6a7', '#c6c8b9', '#b5a983', '#cbc7bc', '#e7e5dd', '#f5f4ef',
  // The floor, and the room dimmed for the film.
  '#2a2522', '#38332f', '#45403b', '#5c544c', '#20223a', '#3a3b52', '#5a5a6a',
  // White furniture, the grey fabrics, the TV and the bench, the leather and chrome.
  '#fbfaf6', '#d9d7cf', '#b8bab6', '#8c8e8a', '#6b7076', '#4d5257', '#2c3236', '#1c1e21', '#3a3a40', '#c9ced0',
  // Straw, wicker and seagrass.
  '#ecd9a6', '#d3b97f', '#b4975c', '#8f6a3a', '#e2d4ad',
  // Book spines, the red box, the cushion and the teddy, the popcorn.
  '#a33a2f', '#d6372c', '#2e4f7a', '#3d6a9e', '#2f5a45', '#5c8a5a', '#6b4a6e', '#e6b8b0', '#d9a441', '#b07a4a', '#e2b98a', '#fbf3dc',
  // The TV picture and its backlight, the geranium, the dining room.
  '#6fbde8', '#cdeefb', '#a9d36a', '#62b046', '#2350b8', '#4f82e6', '#d6f05a', '#4c7a2e', '#7e6f78',
  // Accents: ink, lamp light, Carl-Otto's skin, hair, light-blue top and trousers.
  '#2b3936', '#ffe9b0', '#f0c197', '#c98f6a', '#e8c870', '#cfe2ec', '#9fb6c4', '#8798ab',
];

/** Pysselhörnan's craft table: teak, white paper, the ten crayons with a darker and a lighter step each (so lines and fills
 * stay true to the crayon, and their soft edges have somewhere to go), the sticker sheet and the stickers. */
const CRAFT: string[] = [
  // Ink, the paper and its shadow, greys.
  '#2b3936', '#ffffff', '#fbfaf6', '#e7e5dd', '#d9d7cf', '#b8bab6', '#8c8e8a', '#6b7076',
  // The teak table.
  '#4a3322', '#5e4029', '#74502f', '#8a6239', '#a07647', '#b88d5a', '#c9a476',
  // The crayons: red, orange, yellow, green, light blue, blue, pink, purple, brown.
  '#e2432f', '#f08a2c', '#f2c230', '#62b046', '#6fbde8', '#3157b8', '#f07fb0', '#8a56b8', '#8f5a36',
  '#a8301f', '#b8641c', '#c09620', '#3f7f2c', '#3f8fc0', '#203c80', '#c0507f', '#5f3a82', '#5e3a22',
  '#f28b7c', '#f6b878', '#f8de80', '#a6d68c', '#b4e0f4', '#8aa2e0', '#f8b6d2', '#c2a0dc', '#c49a76',
  // The sticker sheet, the tape, the highlight on a chosen sticker.
  '#cdeefb', '#f0ecd6', '#fff3b0',
];

/** Pannkakor's kitchen: the grey-green wall and white tiles, the window's sky, fence and bushes, terracotta pots and herbs,
 * the black worktop and white cabinets, eggs, milk and flour, batter and pancakes from pale to brown, the toppings. */
const KITCHEN: string[] = [
  '#2b3936', '#ffffff', '#f3f2ec', '#e4e2da', '#d6d6cc', '#b8bab6', '#8c8e8a',
  '#9ca393', '#a7ae9f', '#b9bfb1', '#cfe4ea', '#e8eedf', '#a2a59c', '#5c8a4a', '#73a35a', '#3f7f2c', '#62b046',
  '#b5653d', '#9a5232', '#26282b', '#3a3d41', '#141517', '#5e4029', '#8f6a3a', '#d3b97f', '#b4975c',
  '#fbf0dc', '#e2c49c', '#cfc8b8', '#bdb5a3', '#3d6ab0', '#e8ecf2', '#d7dde6', '#e9dfc8', '#c8432f', '#d9a441',
  '#f6e7b4', '#f3dc8e', '#f1d996', '#e0a64c', '#b8763a', '#8a5220', '#f2b81e', '#c99a40',
  '#c8243a', '#7a1424', '#3a4a8f', '#7a8ccf', '#e2432f', '#f8de80', '#f2c230', '#fff3b0', '#6fbde8',
  '#f0c197', '#c98f6a', '#e8c870', '#cfe2ec', '#8798ab', '#ffe9b0', '#3c3a37',
];

/** Godnatt: Carl-Otto's room. The pale wallpaper and its animals (fox, squirrel, hedgehog, rabbit, badger), the oak
 * floor, the grey-green bed and pink duvet, the paper lamp's warm light, the grey curtain, dusk and night in the window,
 * the dollhouse and fire station, the toys and the toy piano's rainbow keys, and the night's blues and stars. */
const BEDROOM: string[] = [
  '#2b3936', '#ffffff', '#f3f2ec', '#efebe0', '#e6e2d6', '#d9d7cf', '#b8bab6', '#8c8e8a', '#6b7076',
  '#a9b3a0', '#8f9a86', '#b9b08f', '#cdb07a', '#dcc28c', '#b4975c', '#8c6a40',
  '#d9733a', '#c0603a', '#f0d8b8', '#7a6656', '#e9d6b8', '#a8957f', '#7d8086', '#2b2b2e', '#e6b8b0',
  '#8fa092', '#6c7d6f', '#e6aea6', '#c98078', '#f3e6dc', '#fff2d0', '#f6d8a8', '#e8b47a', '#c9c0b0',
  '#7a7f86', '#61666d', '#f2c9a0', '#c8d8e8', '#141a33', '#262b48', '#a05a46', '#ffd98a', '#5c8a4a', '#1f3328',
  '#efe5dc', '#e6c8c0', '#b98f84', '#d6372c', '#a8301f', '#c8302a', '#1c1e21', '#2c3236',
  '#f2c230', '#3157b8', '#62b046', '#f08a2c', '#e2432f', '#f07fb0', '#8a56b8', '#3fa4c0',
  '#f0c197', '#e8c870', '#cfe2ec', '#fff3b0',
];

/** God morgon: the big bedroom. The dark floral wallpaper and the blue wall, birch and the floral duvet, the beige curtains,
 * the morning window and the garden shed, the brass star lamp and its bulbs lit and unlit, Mamma, Pappa and Carl-Otto. */
const MORNING: string[] = [
  '#2b3936', '#ffffff', '#f3f2ec', '#d9d7cf', '#b8bab6', '#8c8e8a', '#6b7076', '#4d5257', '#3a3a3a',
  '#3a4650', '#46535e', '#b9b496', '#c9c2a0', '#6f86a0', '#7d93a8', '#5a6b7e', '#1a2236',
  '#c4a873', '#d6bb86', '#b4975c', '#e2cfa4', '#d8d2c4', '#cfc8b8', '#ddd6c6',
  '#f3e8cc', '#e2d2ae', '#d6372c', '#e6a0a8', '#f2c230', '#5c8a5a',
  '#e2d8c0', '#c9bc9c', '#d8ccb0', '#e2d6bc',
  '#b8d4ea', '#f4e3c0', '#e8eedf', '#fff3c4', '#6f9a54', '#8a5a3a', '#3d3a38', '#cfe0ea', '#9a8a70', '#b5653d', '#62903c', '#4c7a2e', '#3f3a36',
  '#c9a85c', '#f2dc9a', '#fff2c0', '#e8e2d0', '#ffe9b0',
  '#f0c197', '#c98f6a', '#8a5a36', '#6b4a2e', '#e8c870', '#cfe2ec', '#8798ab', '#e6b8b0',
  '#b07a4a', '#e2b98a', '#e2432f', '#fff3b0',
];

/** How far (in 0–255 units) the ordered dither may push a channel: enough to shade ramps, low enough to keep flats flat. */
const SPREAD = { day: 10, night: 9, interior: 10, bike: 10, yard: 10, home: 10, craft: 7, kitchen: 9, bedroom: 9, morning: 9 } as const;

export type Lighting = keyof typeof SPREAD;
const cache = new Map<Lighting, Palette>();

export function paletteFor(lighting: Lighting): { palette: Palette; spread: number } {
  let palette = cache.get(lighting);
  if (!palette) cache.set(lighting, palette = new Palette({ day: DAY, night: NIGHT, interior: INTERIOR, bike: BIKE, yard: YARD, home: HOME, craft: CRAFT, kitchen: KITCHEN, bedroom: BEDROOM, morning: MORNING }[lighting]));
  return { palette, spread: SPREAD[lighting] };
}
