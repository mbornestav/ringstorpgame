import { setArtMode } from '../side/pixel';

// Chooses the art mode before any other module is evaluated: the theme, the HUD layout and the game config read it when
// they load. main.ts imports this first. The Phaser build draws the detailed art as retro pixel art; `?look=smooth` shows it
// as hi-res vector art and `?look=pixel` the original pixel art, both through the same pipeline (for comparison).
const look = new URLSearchParams(location.search).get('look');
setArtMode(look === 'pixel' || look === 'smooth' ? look : 'retro');

/** The retro build's CRT finish (src/play/crt.ts); `?crt=off` shows the bare pixels. */
export const CRT = look !== 'pixel' && look !== 'smooth' && new URLSearchParams(location.search).get('crt') !== 'off';
