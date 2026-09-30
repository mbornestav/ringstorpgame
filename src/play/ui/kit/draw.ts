import type Phaser from 'phaser';
import { isRetro } from '../../../side/pixel';
import { COLOR, RADIUS } from '../../theme';

type G = Phaser.GameObjects.Graphics;

export interface BoxStyle {
  fill?: number;
  fillAlpha?: number;
  border?: number;
  borderAlpha?: number;
  borderWidth?: number;
  radius?: number;
  /** Draws a soft drop shadow beneath, `shadow` pixels deep. */
  shadow?: number;
}

/** A rounded box with an optional soft shadow (several faint, growing layers, since Graphics has no blur). */
export function box(g: G, x: number, y: number, w: number, h: number, s: BoxStyle = {}): void {
  const r = s.radius ?? RADIUS.panel;
  if (isRetro()) { retroBox(g, x, y, w, h, r, s); return; }
  if (s.shadow) {
    for (let i = 4; i >= 1; i--) {
      const grow = (s.shadow * i) / 4;
      g.fillStyle(COLOR.black, 0.07);
      g.fillRoundedRect(x - grow * 0.6, y - grow * 0.2 + s.shadow * 0.45, w + grow * 1.2, h + grow * 1.2, r + grow * 0.6);
    }
  }
  g.fillStyle(s.fill ?? COLOR.panel, s.fillAlpha ?? 0.94);
  g.fillRoundedRect(x, y, w, h, r);
  if (s.border !== undefined) {
    g.lineStyle(s.borderWidth ?? 2, s.border, s.borderAlpha ?? 1);
    g.strokeRoundedRect(x, y, w, h, r);
  }
}

/** A heart centred on (x, y), `r` across from centre to edge. */
export function heart(g: G, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillCircle(x - r * 0.5, y - r * 0.28, r * 0.56);
  g.fillCircle(x + r * 0.5, y - r * 0.28, r * 0.56);
  g.fillTriangle(x - r * 1.03, y - r * 0.02, x + r * 1.03, y - r * 0.02, x, y + r * 0.98);
}

/** The small symbols the old interface set in glyph fonts, drawn so they never depend on the font having them. */
export type Glyph = 'play' | 'again' | 'plus' | 'check' | 'star' | 'ask' | 'arrow-up' | 'dot';

export function glyph(g: G, kind: Glyph, x: number, y: number, size: number, color: number, alpha = 1): void {
  const s = size / 2;
  g.fillStyle(color, alpha);
  g.lineStyle(Math.max(2, size * 0.16), color, alpha);
  switch (kind) {
    case 'play': g.fillTriangle(x - s * 0.7, y - s, x - s * 0.7, y + s, x + s, y); break;
    case 'plus': g.fillRect(x - s * 0.22, y - s, s * 0.44, s * 2); g.fillRect(x - s, y - s * 0.22, s * 2, s * 0.44); break;
    case 'dot': g.fillCircle(x, y, s * 0.6); break;
    case 'star': {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? s * 0.45 : s * 1.05;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fillPath(); break;
    }
    case 'check':
      g.beginPath(); g.moveTo(x - s * 0.85, y + s * 0.05); g.lineTo(x - s * 0.25, y + s * 0.65); g.lineTo(x + s * 0.9, y - s * 0.6); g.strokePath(); break;
    case 'again':
      g.beginPath(); g.arc(x, y, s * 0.8, -0.2, 4.6, false); g.strokePath();
      g.fillTriangle(x + s * 0.55, y - s * 1.05, x + s * 1.15, y - s * 0.15, x + s * 0.05, y - s * 0.25);
      break;
    case 'ask':
      g.beginPath(); g.arc(x, y - s * 0.3, s * 0.62, 3.3, 7.4, false); g.lineTo(x, y + s * 0.3); g.strokePath();
      g.fillCircle(x, y + s * 0.85, s * 0.16); break;
    case 'arrow-up':
      g.fillTriangle(x - s, y + s * 0.5, x + s, y + s * 0.5, x, y - s * 0.7); break;
  }
}

/**
 * The retro window: a hard drop shadow, a one-pixel dark outline, the fill, a one-pixel coloured border set in by a pixel,
 * and a light bevel along the top edge, like a 16-bit console menu. Line widths are multiples of 3 UI px (one logical pixel),
 * so the UI camera's block filter keeps every line.
 */
function retroBox(g: G, x: number, y: number, w: number, h: number, r: number, s: BoxStyle): void {
  const P = 3;
  if (s.shadow) { g.fillStyle(COLOR.black, 0.5); g.fillRoundedRect(x + P * 2, y + P * 2, w, h, r); }
  g.fillStyle(s.fill ?? COLOR.panel, s.fillAlpha ?? 0.94);
  g.fillRoundedRect(x, y, w, h, r);
  if (s.border === undefined) return;
  g.lineStyle(P, COLOR.black, 0.85);
  g.strokeRoundedRect(x - P / 2, y - P / 2, w + P, h + P, r + P / 2);
  // Chips and key caps are too small for the inset border: one coloured edge is enough.
  if (h < 44) { g.lineStyle(P, s.border, s.borderAlpha ?? 1); g.strokeRoundedRect(x + P / 2, y + P / 2, w - P, h - P, Math.max(0, r - P)); return; }
  const inset = Math.max(P, Math.round((s.borderWidth ?? 2) / P) * P);
  g.lineStyle(inset, s.border, s.borderAlpha ?? 1);
  g.strokeRoundedRect(x + P + inset / 2, y + P + inset / 2, w - P * 2 - inset, h - P * 2 - inset, Math.max(0, r - P));
  g.fillStyle(0xffffff, 0.1);
  g.fillRect(x + P * 2 + inset, y + P * 2 + inset, w - P * 4 - inset * 2, P);
}
