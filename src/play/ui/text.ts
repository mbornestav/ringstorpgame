import { isRetro } from '../../side/pixel';

const ARROWS: Record<string, string> = { '←': '◀', '→': '▶', '↑': '▲', '↓': '▼' };
/** The pixel font has no ← → and a poor ↑ ↓: retro text uses solid triangles for the arrow keys instead. */
export function keyGlyphs(value: string): string {
  return isRetro() ? value.replace(/[←→↑↓]/g, ch => ARROWS[ch]) : value;
}

/** Localised strings carry two bits of markup for the old DOM: `&nbsp;` in button labels and `<kbd>` around key names. */
export function plain(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

const LEADS = new Set(['▶', '↻', '✚']);

/** Peels a leading icon glyph off a button label, so the icon can be drawn as a vector instead of relying on a font. */
export function splitLead(value: string): { icon: '▶' | '↻' | '✚' | null; label: string } {
  const label = plain(value);
  const first = [...label][0];
  if (first && LEADS.has(first)) return { icon: first as '▶' | '↻' | '✚', label: label.slice(first.length).trim() };
  return { icon: null, label };
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}
