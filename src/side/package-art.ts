import { isRetro } from './pixel';

/** Bold 5×7 marks for the retro badges: the 3×5 art font is too thin to read at badge size. */
const MARKS: Record<string, string[]> = {
  '?': ['.###.', '##.##', '...##', '..##.', '..##.', '.....', '..##.'],
  '!': ['.##', '.##', '.##', '.##', '.##', '...', '.##'],
};
function boldMark(c: CanvasRenderingContext2D, ch: string, cx: number, cy: number, colour: string, shadow?: string): void {
  const rows = MARKS[ch] ?? MARKS['?'], x0 = Math.round(cx - rows[0].length / 2), y0 = Math.round(cy - 3.5);
  const plot = (dx: number, dy: number, col: string) => {
    c.fillStyle = col;
    rows.forEach((row, r) => { for (let k = 0; k < row.length; k++) if (row[k] === '#') c.fillRect(x0 + k + dx, y0 + r + dy, 1, 1); });
  };
  if (shadow) plot(1, 1, shadow);
  plot(0, 0, colour);
}

// Smooth-mode art for the parcel and the pick-up markers: a taped cardboard box with a lit top and a soft shading, and the
// floating markers (the question mark over the parcel) as designed badges rather than a font glyph. Pixel mode never
// calls these.

const INK = '#1f2926';

/**
 * A cardboard parcel standing on (x, y), `w` by `h` logical pixels, seen slightly from above: a lit lid, a front face that
 * darkens towards the ground, brown tape over the top and down the front, and a shipping label. `lx` is the side the sun
 * is on (+1 right, -1 left) in the caller's coordinates. A tint flattens it to one colour.
 */
export function paintParcel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lx = 1, tint?: string): void {
  const lid = Math.max(1.6, h * 0.26), x0 = x - w / 2, top = y - h;
  const side = Math.min(2.4, w * 0.16);
  // The side face on the shadow side and the lid make it read as a box rather than a sticker.
  const sx = lx > 0 ? x0 : x0 + w;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x0, y); c.lineTo(x0 + w, y); c.lineTo(x0 + w, top + lid); c.lineTo(x0 + w - (lx > 0 ? side : 0), top); c.lineTo(x0 + (lx > 0 ? 0 : side), top); c.lineTo(x0, top + lid); c.closePath();
  c.fillStyle = tint ?? '#b9854a'; c.fill();
  c.strokeStyle = tint ?? INK; c.lineWidth = 0.55; c.stroke();
  if (tint) return;
  // Front face: warm at the top, darker near the ground.
  const face = c.createLinearGradient(0, top + lid, 0, y);
  face.addColorStop(0, '#c7914f'); face.addColorStop(1, '#94632f');
  c.fillStyle = face;
  c.fillRect(x0 + 0.3, top + lid, w - 0.6, h - lid - 0.3);
  // Shadow side band.
  const band = c.createLinearGradient(sx, 0, sx + lx * w * 0.5, 0);
  band.addColorStop(0, 'rgba(60, 34, 12, 0.35)'); band.addColorStop(1, 'rgba(60, 34, 12, 0)');
  c.fillStyle = band; c.fillRect(x0 + 0.3, top + 0.3, w - 0.6, h - 0.6);
  // Lid, catching the light.
  c.beginPath();
  c.moveTo(x0 + 0.3, top + lid); c.lineTo(x0 + (lx > 0 ? 0.3 : side), top + 0.35); c.lineTo(x0 + w - (lx > 0 ? side : 0.3), top + 0.35); c.lineTo(x0 + w - 0.3, top + lid); c.closePath();
  const lidFill = c.createLinearGradient(x0, 0, x0 + w, 0);
  lidFill.addColorStop(lx > 0 ? 0 : 1, '#d6a765'); lidFill.addColorStop(lx > 0 ? 1 : 0, '#f1cf8e');
  c.fillStyle = lidFill; c.fill();
  c.fillStyle = 'rgba(70, 40, 14, 0.4)'; c.fillRect(x0 + 0.3, top + lid - 0.2, w - 0.6, 0.45);
  // Tape over the lid and down the front.
  const tw = Math.max(1.2, w * 0.2);
  c.fillStyle = '#8a5a2b'; c.fillRect(x - tw / 2, top + 0.35, tw, h - 0.7);
  c.fillStyle = 'rgba(255, 236, 190, 0.35)'; c.fillRect(x - tw / 2 + (lx > 0 ? tw * 0.55 : 0.1), top + 0.35, tw * 0.35, h - 0.7);
  // A white shipping label with two printed lines.
  if (w >= 9) {
    const lw = w * 0.28, lh = (h - lid) * 0.42, lxp = lx > 0 ? x0 + w * 0.62 : x0 + w * 0.1, ly = top + lid + (h - lid) * 0.22;
    c.fillStyle = '#f3efe2'; c.fillRect(lxp, ly, lw, lh);
    c.fillStyle = '#7d8a90'; c.fillRect(lxp + lw * 0.15, ly + lh * 0.3, lw * 0.7, 0.35); c.fillRect(lxp + lw * 0.15, ly + lh * 0.62, lw * 0.5, 0.35);
  }
  // A crisp highlight along the lit top edge.
  c.strokeStyle = 'rgba(255, 244, 214, 0.75)'; c.lineWidth = 0.4;
  c.beginPath(); c.moveTo(x0 + (lx > 0 ? side : 0.6), top + 0.5); c.lineTo(x0 + w - (lx > 0 ? 0.6 : side), top + 0.5); c.stroke();
}

/**
 * A floating objective badge centred on (x, y): a round red token with a soft glow, a bevelled rim and a white question
 * mark, with a small pointer underneath towards what it marks.
 */
export function paintQuestionBadge(c: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const r = 7.2;
  c.save();
  const glow = c.createRadialGradient(x, y, r * 0.6, x, y, r * 2.1);
  glow.addColorStop(0, `rgba(255, 120, 90, ${0.3 + Math.sin(t * 4) * 0.08})`); glow.addColorStop(1, 'rgba(255, 120, 90, 0)');
  c.fillStyle = glow; c.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  // Pointer.
  c.beginPath(); c.moveTo(x - 2.6, y + r - 1.2); c.lineTo(x, y + r + 3.4); c.lineTo(x + 2.6, y + r - 1.2); c.closePath();
  c.fillStyle = '#9c2a26'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
  // Token.
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  const body = c.createLinearGradient(x, y - r, x, y + r);
  body.addColorStop(0, '#ff7a64'); body.addColorStop(0.55, '#e0413a'); body.addColorStop(1, '#a7262a');
  c.fillStyle = body; c.fill();
  c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  c.beginPath(); c.arc(x, y, r - 1.1, 0, Math.PI * 2); c.strokeStyle = 'rgba(255, 214, 196, 0.55)'; c.lineWidth = 0.6; c.stroke();
  // Gloss on the upper half.
  c.beginPath(); c.ellipse(x - 1.2, y - r * 0.45, r * 0.62, r * 0.32, -0.25, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255, 255, 255, 0.28)'; c.fill();
  // The question mark, with a dark drop shadow.
  if (isRetro()) { boldMark(c, '?', x, y, '#fffaf0', '#7a1c1c'); c.restore(); return; }
  c.font = `700 ${r * 1.55}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(80, 12, 12, 0.55)'; c.fillText('?', x + 0.4, y + 0.9);
  c.fillStyle = '#fffaf0'; c.fillText('?', x, y + 0.4);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.restore();
}

/** A heavy "!" or "?" alert over someone's head, as a small rounded badge with a pointer. */
export function paintAlert(c: CanvasRenderingContext2D, x: number, y: number, mark: string, colour: string): void {
  const w = 6.4, h = 8.2;
  c.save();
  c.beginPath(); c.roundRect(x - w / 2, y - h, w, h, 2.2);
  c.moveTo(x - 1.6, y - 0.2); c.lineTo(x, y + 2.4); c.lineTo(x + 1.6, y - 0.2);
  const body = c.createLinearGradient(0, y - h, 0, y);
  body.addColorStop(0, '#324049'); body.addColorStop(1, '#141c21');
  c.fillStyle = body; c.fill();
  c.strokeStyle = colour; c.lineWidth = 0.6; c.stroke();
  if (isRetro()) { boldMark(c, mark, x, y - h / 2, colour); c.restore(); return; }
  c.font = `700 ${h * 0.95}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = colour; c.fillText(mark, x, y - h / 2 + 0.4);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.restore();
}

/** A post with a soft metallic shading, from (x, top) down to the pavement at `bottom`. */
export function paintPost(c: CanvasRenderingContext2D, x: number, top: number, bottom: number, w = 2.2): void {
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#4d5856'); g.addColorStop(0.55, '#b9c1bd'); g.addColorStop(1, '#6f7a77');
  c.fillStyle = g; c.fillRect(x - w / 2, top, w, bottom - top);
  const foot = c.createRadialGradient(x, bottom, 0, x, bottom, 5);
  foot.addColorStop(0, 'rgba(14, 20, 24, 0.35)'); foot.addColorStop(1, 'rgba(14, 20, 24, 0)');
  c.save(); c.translate(x, bottom); c.scale(1, 0.35); c.translate(-x, -bottom); c.fillStyle = foot; c.fillRect(x - 5, bottom - 5, 10, 10); c.restore();
}

/** A sign panel: enamel with a thin bright border, a vertical sheen and a drop shadow. */
export function paintPanel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, face: string, border: string, radius = 1.6): void {
  c.save();
  c.fillStyle = 'rgba(10, 16, 20, 0.28)';
  c.beginPath(); c.roundRect(x + 0.9, y + 1.2, w, h, radius); c.fill();
  c.beginPath(); c.roundRect(x, y, w, h, radius);
  c.fillStyle = '#10181f'; c.fill();
  c.beginPath(); c.roundRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, Math.max(0.4, radius - 0.5));
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, mixHex(face, '#ffffff', 0.18)); g.addColorStop(0.5, face); g.addColorStop(1, mixHex(face, '#000000', 0.18));
  c.fillStyle = g; c.fill();
  c.strokeStyle = border; c.lineWidth = 0.5;
  c.beginPath(); c.roundRect(x + 1.4, y + 1.4, w - 2.8, h - 2.8, Math.max(0.3, radius - 1)); c.stroke();
  // A diagonal sheen across the enamel.
  c.beginPath(); c.roundRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, Math.max(0.4, radius - 0.5)); c.clip();
  c.fillStyle = 'rgba(255, 255, 255, 0.1)';
  c.beginPath(); c.moveTo(x + w * 0.55, y); c.lineTo(x + w * 0.75, y); c.lineTo(x + w * 0.6, y + h); c.lineTo(x + w * 0.4, y + h); c.closePath(); c.fill();
  c.restore();
}

function mixHex(a: string, b: string, t: number): string {
  const p = parseInt(a.slice(1, 7), 16), q = parseInt(b.slice(1, 7), 16);
  const ch = (s: number) => Math.round(((p >> s) & 255) + (((q >> s) & 255) - ((p >> s) & 255)) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** Marcus A's watching eyes: glossy eyeballs with lids, irises that follow (dx, dy), and a soft shadow. */
export function paintEyes(c: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, dim: boolean): void {
  for (const off of [-5.2, 5.2]) {
    const ex = x + off;
    c.fillStyle = 'rgba(10, 16, 22, 0.3)';
    c.beginPath(); c.ellipse(ex + 0.8, y + 1.2, 5.4, 6, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(ex, y, 5, 5.6, 0, 0, Math.PI * 2);
    const ball = c.createRadialGradient(ex + 1.4, y - 1.8, 0.5, ex, y, 6);
    ball.addColorStop(0, '#ffffff'); ball.addColorStop(0.6, dim ? '#d9d5cb' : '#f3f1ea'); ball.addColorStop(1, dim ? '#a8a49a' : '#c9c6bc');
    c.fillStyle = ball; c.fill();
    c.strokeStyle = '#10181f'; c.lineWidth = 0.9; c.stroke();
    const px = ex + dx * 2.2, py = y + dy * 2.2;
    c.beginPath(); c.arc(px, py, 2.5, 0, Math.PI * 2);
    const iris = c.createRadialGradient(px, py, 0.4, px, py, 2.5);
    iris.addColorStop(0, '#0d1216'); iris.addColorStop(0.45, '#2c4a5c'); iris.addColorStop(1, '#16242e');
    c.fillStyle = iris; c.fill();
    c.beginPath(); c.arc(px, py, 1, 0, Math.PI * 2); c.fillStyle = '#080b0e'; c.fill();
    c.beginPath(); c.arc(px + 0.8, py - 0.9, 0.55, 0, Math.PI * 2); c.fillStyle = 'rgba(255, 255, 255, 0.9)'; c.fill();
    // Upper lid shadow.
    c.save(); c.beginPath(); c.ellipse(ex, y, 5, 5.6, 0, 0, Math.PI * 2); c.clip();
    const lid = c.createLinearGradient(0, y - 5.6, 0, y - 1);
    lid.addColorStop(0, 'rgba(60, 50, 44, 0.45)'); lid.addColorStop(1, 'rgba(60, 50, 44, 0)');
    c.fillStyle = lid; c.fillRect(ex - 5, y - 5.6, 10, 5);
    c.restore();
  }
}

/** A five-pointed gold star with a bevel, a dark rim and a glow: home. */
export function paintStar(c: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.6 : 8.6;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  const glow = c.createRadialGradient(x, y, 2, x, y, 16);
  glow.addColorStop(0, `rgba(255, 214, 90, ${0.32 + Math.sin(t * 3) * 0.08})`); glow.addColorStop(1, 'rgba(255, 214, 90, 0)');
  c.fillStyle = glow; c.fillRect(x - 16, y - 16, 32, 32);
  const star = () => { c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); };
  star();
  const g = c.createLinearGradient(x - 6, y - 8, x + 6, y + 7);
  g.addColorStop(0, '#fff2a8'); g.addColorStop(0.45, '#f5c33b'); g.addColorStop(1, '#c47e18');
  c.fillStyle = g; c.fill();
  c.lineJoin = 'round'; c.strokeStyle = '#10181f'; c.lineWidth = 1.1; c.stroke();
  // Bevel: lines from the centre to each point.
  c.lineWidth = 0.35;
  for (let i = 0; i < 10; i += 2) {
    c.strokeStyle = i < 5 ? 'rgba(255, 250, 220, 0.7)' : 'rgba(120, 70, 10, 0.45)';
    c.beginPath(); c.moveTo(x, y); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
  }
}

/** A bouncing chevron on the pavement: step up here. */
export function paintHint(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.save();
  c.lineJoin = 'round';
  const arrow = (dy: number) => { c.beginPath(); c.moveTo(x - 6.5, y + 6.5 + dy); c.lineTo(x, y + dy); c.lineTo(x + 6.5, y + 6.5 + dy); c.lineTo(x + 4, y + 8 + dy); c.lineTo(x, y + 4 + dy); c.lineTo(x - 4, y + 8 + dy); c.closePath(); };
  c.fillStyle = 'rgba(10, 16, 20, 0.3)'; arrow(1.2); c.fill();
  arrow(0);
  const g = c.createLinearGradient(0, y, 0, y + 8);
  g.addColorStop(0, '#ffe7a6'); g.addColorStop(1, '#e0a93f');
  c.fillStyle = g; c.fill(); c.strokeStyle = '#10181f'; c.lineWidth = 0.8; c.stroke();
  c.restore();
}

/** Kurir Livs' first-aid marker: a green cross on a rounded dark badge. */
export function paintCrossBadge(c: CanvasRenderingContext2D, x: number, y: number, used: boolean): void {
  paintPanel(c, x - 7.5, y - 7.5, 15, 15, used ? '#314a42' : '#1a4a3e', used ? '#5a7468' : '#7fcf98', 3);
  const col = used ? '#72897a' : '#a9eab0';
  c.beginPath();
  c.roundRect(x - 4.6, y - 1.5, 9.2, 3, 0.8); c.roundRect(x - 1.5, y - 4.6, 3, 9.2, 0.8);
  c.fillStyle = col; c.fill();
  c.fillStyle = 'rgba(255, 255, 255, 0.35)'; c.fillRect(x - 1.1, y - 4.3, 2.2, 0.8);
}
