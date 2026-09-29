import { FONT } from './fonts';

// The game's colours, from the original teal-and-gold interface (src/style.css), as numbers for Phaser shapes and as CSS
// strings for Text. Facade and scenery palettes stay in the art code; this is only what the interface is made of.

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export const COLOR = {
  ink: 0x0b1b24,
  night: 0x10212a,
  panel: 0x102733,
  panelHi: 0x16333e,
  teal: 0x1c3d47,
  line: 0x59706d,
  gold: 0xf3c878,
  goldDeep: 0xc9ab74,
  cream: 0xeadfca,
  paper: 0xf5e5c4,
  dim: 0x9ab1b0,
  red: 0xe97660,
  redDeep: 0xb0473a,
  green: 0x5b976f,
  greenHi: 0xa5e0a3,
  sky: 0x86d5c7,
  yellow: 0xf5c33b,
  black: 0x05090c,
} as const;

export const CSS = Object.fromEntries(Object.entries(COLOR).map(([name, value]) => [name, hex(value)])) as Record<keyof typeof COLOR, string>;

export const RADIUS = { panel: 14, button: 10, chip: 6 } as const;

/** Reference size the interface is authored in; the UI camera zooms it to whatever the canvas is. */
export const UI_W = 1440;
export const UI_H = 810;

export const MOTION = { fast: 140, base: 220, slow: 340 } as const;

export type TextKind = 'display' | 'title' | 'label' | 'body' | 'small' | 'mono' | 'key';

/** Text styles by role. Phaser 4's Text has no letter-spacing, so small caps labels rely on the display face being condensed. */
export function textStyle(kind: TextKind, color: string = CSS.cream): Phaser.Types.GameObjects.Text.TextStyle {
  const base = { color, resolution: 2 };
  switch (kind) {
    case 'title': return { ...base, fontFamily: FONT.display, fontStyle: '700', fontSize: '96px' };
    case 'display': return { ...base, fontFamily: FONT.display, fontStyle: '700', fontSize: '44px' };
    case 'label': return { ...base, fontFamily: FONT.display, fontStyle: '600', fontSize: '20px' };
    case 'body': return { ...base, fontFamily: FONT.body, fontStyle: '400', fontSize: '22px' };
    case 'small': return { ...base, fontFamily: FONT.body, fontStyle: '400', fontSize: '16px' };
    case 'mono': return { ...base, fontFamily: FONT.mono, fontStyle: '400', fontSize: '18px' };
    case 'key': return { ...base, fontFamily: FONT.display, fontStyle: '700', fontSize: '18px' };
  }
}
