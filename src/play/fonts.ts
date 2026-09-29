import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/share-tech-mono/latin-400.css';

/** Barlow Condensed for signage and numerals, IBM Plex Sans for menus and dialogue, Share Tech Mono for the handset's LCD. */
export const FONT = {
  display: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  body: '"IBM Plex Sans", system-ui, "Segoe UI", sans-serif',
  mono: '"Share Tech Mono", "Cascadia Mono", Consolas, monospace',
} as const;

const FACES = [
  '500 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '700 20px "Barlow Condensed"',
  '400 16px "IBM Plex Sans"', '500 16px "IBM Plex Sans"', '600 16px "IBM Plex Sans"',
  '400 16px "Share Tech Mono"',
];
// Å Ä Ö and the digits must be present, or canvas text measured before the font arrives would be the wrong width.
const SAMPLE = 'ÅÄÖåäö0123456789 ABCabc';

/**
 * Resolves once the bundled faces are ready, or after `timeoutMs`, whichever is first. Baked text (signs, plates) is measured
 * when it is drawn and never redrawn, so this must finish before anything is baked. A failure only means fallback fonts.
 */
export async function loadFonts(timeoutMs = 3000): Promise<boolean> {
  try {
    const loaded = Promise.all(FACES.map(face => document.fonts.load(face, SAMPLE))).then(() => true);
    const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), timeoutMs));
    return await Promise.race([loaded, timeout]);
  } catch {
    return false;
  }
}
