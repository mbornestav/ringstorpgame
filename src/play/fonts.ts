import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/share-tech-mono/latin-400.css';
import '@fontsource/tiny5/latin-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import pressStart from '@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2?url';

/**
 * Barlow Condensed for signage and numerals, IBM Plex Sans for menus and dialogue, Share Tech Mono for the handset's LCD.
 * The retro interface uses two pixel fonts instead: Tiny5 for all running text and numbers, and Press Start 2P for the big
 * titles. Both are drawn on a 1-logical-pixel grid (see `fontPx` in theme.ts).
 */
export const FONT = {
  display: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  body: '"IBM Plex Sans", system-ui, "Segoe UI", sans-serif',
  mono: '"Share Tech Mono", "Cascadia Mono", Consolas, monospace',
  pixel: 'RetroSymbols, Tiny5, "Cascadia Mono", monospace',
  pixelTitle: '"Press Start 2P", Tiny5, monospace',
} as const;

const FACES = [
  '500 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '700 20px "Barlow Condensed"',
  '400 16px "IBM Plex Sans"', '500 16px "IBM Plex Sans"', '600 16px "IBM Plex Sans"',
  '400 16px "Share Tech Mono"', '400 24px Tiny5', '400 24px "Press Start 2P"', '400 24px RetroSymbols',
];
// Å Ä Ö and the digits must be present, or canvas text measured before the font arrives would be the wrong width.
const SAMPLE = 'ÅÄÖåäö0123456789 ABCabc©';

/**
 * Resolves once the bundled faces are ready, or after `timeoutMs`, whichever is first. Baked text (signs, plates) is measured
 * when it is drawn and never redrawn, so this must finish before anything is baked. A failure only means fallback fonts.
 */
let symbolsAdded = false;

export async function loadFonts(timeoutMs = 3000): Promise<boolean> {
  try {
    // Tiny5's © is an unreadable blob at this size: take that one character from Press Start 2P.
    if (!symbolsAdded) {
      symbolsAdded = true;
      (document.fonts as unknown as { add(face: FontFace): void }).add(new FontFace('RetroSymbols', `url(${pressStart})`, { unicodeRange: 'U+00A9' }));
    }
    const loaded = Promise.all(FACES.map(face => document.fonts.load(face, SAMPLE))).then(() => true);
    const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), timeoutMs));
    return await Promise.race([loaded, timeout]);
  } catch {
    return false;
  }
}
