import Phaser from 'phaser';
import { isRetro } from '../side/pixel';

export const LOGICAL_W = 480;
export const LOGICAL_H = 270;

/** Device pixels per logical pixel. `?scale=2|3|4` overrides; low-memory devices default to 2. */
function pickScale(): number {
  try {
    const asked = Number(new URLSearchParams(location.search).get('scale'));
    if ([2, 3, 4].includes(asked)) return asked;
    const memory = (navigator as { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory <= 2) return 2;
  } catch { /* not in a browser */ }
  return 3;
}
export const RENDER_SCALE = pickScale();

export const VIEW = {
  w: LOGICAL_W * RENDER_SCALE,
  h: LOGICAL_H * RENDER_SCALE,
  scale: RENDER_SCALE,
  /** Height of the UI chrome bars, in canvas pixels at scale 3 (multiply by scale/3). Gameplay clears them: feet stay in logical y 176-248. */
  insetTop: 16 * RENDER_SCALE,
  insetBottom: 21 * RENDER_SCALE,
} as const;

/** Keys the game owns. Phaser calls preventDefault on these (unmodified), so the page never scrolls or types. */
export const CAPTURED_KEYCODES: number[] = [
  87, 65, 83, 68, // W A S D
  37, 38, 39, 40, // arrows
  74, 75, 76, 73, 69, 77, 70, // J K L I E M F
  27, 32, 13, // Esc, Space, Enter
  ...Array.from({ length: 9 }, (_, i) => 48 + i), // 0-8
  ...Array.from({ length: 9 }, (_, i) => 96 + i), // numpad 0-8
];

export const BACKGROUND = '#0b1b24';

export function gameConfig(scenes: Phaser.Types.Scenes.SceneType[], callbacks?: Phaser.Types.Core.GameConfig['callbacks']): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL,
    parent: 'game',
    width: VIEW.w,
    height: VIEW.h,
    backgroundColor: BACKGROUND,
    pixelArt: false,
    // Retro: nearest-neighbour everywhere, which also lets the UI's block filter sample one exact pixel per block.
    antialias: !isRetro(),
    roundPixels: false,
    fps: { smoothStep: false },
    render: { preserveDrawingBuffer: import.meta.env.DEV, powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: { target: window, capture: CAPTURED_KEYCODES }, activePointers: 2 },
    scene: scenes,
    callbacks,
  };
}
