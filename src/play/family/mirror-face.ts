import { INK, TAU, line, mix, oval, rgrad, stroke, type C, type Pt } from './art';
import type { KidLook } from './games/kurragomma';

// Carl-Otto seen straight on, big, for the two bathroom mirrors (Tänder och tvål, Fånig i spegeln). The rest of the
// collection draws him turned to the side (kids.ts); a mirror needs his whole face: two eyes, a nose, a mouth that can open
// wide for the toothbrush or stick its tongue out. Units: the face is 100 from its middle to the chin; (x, y) is the middle,
// `k` world pixels per unit.

export type Eyes = 'open' | 'wide' | 'shut' | 'wink' | 'cross';
export type Mouth = 'smile' | 'grin' | 'o' | 'tongue' | 'brush';
export interface FaceLook { eyes?: Eyes; mouth?: Mouth; /** Toothpaste foam round the mouth, 0–1. */ foam?: number; /** Clean teeth that sparkle. */ sparkle?: boolean }

/** Where the eyes, nose and mouth are, in face units (for things worn on the face). */
export const FEATURES = { eyes: [[-34, -6], [34, -6]] as Pt[], nose: [0, 22] as Pt, mouth: [0, 56] as Pt, crown: [0, -96] as Pt };
/** The open mouth for brushing, and the eight teeth where sugar bugs sit (upper left, upper right, lower left, lower right). */
export const OPEN_MOUTH = { x: 0, y: 58, rx: 48, ry: 30 };
export const TOOTH_SPOTS: Pt[] = [[-30, 44], [-12, 42], [12, 42], [30, 44], [-28, 72], [-10, 75], [10, 75], [28, 72]];

const shade = (hex: string, k: number) => mix(hex, '#000000', 1 - k);

export function paintMirrorFace(c: C, x: number, y: number, k: number, look: KidLook, f: FaceLook = {}, t = 0): void {
  c.save(); c.translate(x, y); c.scale(k, k);
  const skin = look.skin, hair = look.hair;
  // Neck and shoulders in his top, ears, the face.
  c.beginPath(); c.moveTo(-34, 86); c.lineTo(-30, 120); c.lineTo(30, 120); c.lineTo(34, 86); c.closePath(); c.fillStyle = skin; c.fill(); stroke(c, INK, 2);
  c.beginPath(); c.moveTo(-130, 200); c.quadraticCurveTo(-120, 112, -40, 108); c.lineTo(40, 108); c.quadraticCurveTo(120, 112, 130, 200); c.closePath(); c.fillStyle = look.top; c.fill(); stroke(c, INK, 2);
  c.beginPath(); c.moveTo(-34, 108); c.quadraticCurveTo(0, 130, 34, 108); stroke(c, shade(look.top, 0.8), 3);
  for (const s of [-1, 1]) { oval(c, INK, s * 92, 6, 15, 21); oval(c, skin, s * 92, 6, 13, 19); oval(c, shade(skin, 0.86), s * 92, 7, 6, 10); }
  oval(c, INK, 0, 0, 94, 102);
  oval(c, rgrad(c, 0, 0, 110, [[0, mix(skin, '#fff4e4', 0.3)], [0.65, skin], [1, shade(skin, 0.85)]], -20, -30), 0, 0, 92, 100);
  // Hair: a cap over the crown with a fringe.
  c.beginPath(); c.moveTo(-96, 6); c.bezierCurveTo(-104, -96, 104, -96, 96, 6);
  c.quadraticCurveTo(84, -30, 60, -40); c.lineTo(46, -28); c.lineTo(30, -44); c.lineTo(12, -30); c.lineTo(-6, -46); c.lineTo(-22, -30); c.lineTo(-40, -44); c.lineTo(-54, -30); c.quadraticCurveTo(-84, -30, -96, 6); c.closePath();
  c.fillStyle = hair; c.fill(); stroke(c, INK, 2);
  line(c, mix(hair, '#ffffff', 0.35), 3, [[-50, -70], [-10, -82], [34, -76]]);
  // Brows, eyes, nose, cheeks.
  const eyes = f.eyes ?? 'open';
  for (const [i, [ex, ey]] of FEATURES.eyes.entries()) {
    line(c, shade(hair, 0.75), 4, [[ex - 14, ey - 22 - (eyes === 'wide' ? 6 : 0)], [ex + 14, ey - 24 - (eyes === 'wide' ? 6 : 0)]]);
    const shut = eyes === 'shut' || (eyes === 'wink' && i === 1);
    if (shut) { c.beginPath(); c.arc(ex, ey - 2, 10, 0.25, Math.PI - 0.25); stroke(c, INK, 3.4); }
    else if (eyes === 'wide') { oval(c, INK, ex, ey, 15, 17); oval(c, '#ffffff', ex, ey, 13, 15); oval(c, INK, ex, ey + 2, 7, 8); oval(c, '#ffffff', ex + 3, ey - 2, 2.4, 2.4); }
    else if (eyes === 'cross') { oval(c, INK, ex, ey, 13, 14); oval(c, '#ffffff', ex, ey, 11, 12); oval(c, INK, ex - Math.sign(ex) * 6, ey + 2, 5, 6); }
    else { oval(c, INK, ex, ey, 8, 11); oval(c, '#ffffff', ex + 3, ey - 4, 2.6, 2.6); }
  }
  oval(c, shade(skin, 0.86), 0, FEATURES.nose[1], 10, 8); oval(c, 'rgba(255, 255, 255, 0.35)', 3, FEATURES.nose[1] - 3, 3, 2);
  for (const s of [-1, 1]) oval(c, 'rgba(236, 120, 110, 0.35)', s * 54, 30, 16, 10);
  // The mouth.
  const [mx, my] = FEATURES.mouth, mouth = f.mouth ?? 'smile';
  if (mouth === 'smile') { c.beginPath(); c.arc(mx, my - 18, 26, 0.35, Math.PI - 0.35); stroke(c, '#a05a48', 4); }
  else if (mouth === 'grin' || mouth === 'tongue') {
    c.beginPath(); c.moveTo(mx - 32, my - 6); c.quadraticCurveTo(mx, my + 34, mx + 32, my - 6); c.closePath(); c.fillStyle = '#7a2e2a'; c.fill(); stroke(c, INK, 2.4);
    c.beginPath(); c.moveTo(mx - 28, my - 4); c.lineTo(mx + 28, my - 4); c.lineTo(mx + 24, my + 4); c.lineTo(mx - 24, my + 4); c.closePath(); c.fillStyle = '#ffffff'; c.fill();
    if (mouth === 'tongue') { c.beginPath(); c.moveTo(mx - 14, my + 8); c.quadraticCurveTo(mx - 16, my + 40, mx, my + 40); c.quadraticCurveTo(mx + 16, my + 40, mx + 14, my + 8); c.closePath(); c.fillStyle = '#e2867a'; c.fill(); stroke(c, INK, 2); line(c, '#c86a60', 1.6, [[mx, my + 14], [mx, my + 30]]); }
    if (f.sparkle) for (let i = 0; i < 3; i++) { const sx = mx - 18 + i * 18, sy = my - 2, a = t * 6 + i, r = 5 + Math.abs(Math.sin(a)) * 6; line(c, '#ffffff', 2.4, [[sx - r, sy], [sx + r, sy]]); line(c, '#ffffff', 2.4, [[sx, sy - r], [sx, sy + r]]); }
  } else if (mouth === 'o') { oval(c, INK, mx, my, 15, 19); oval(c, '#7a2e2a', mx, my, 13, 17); }
  else {
    const m = OPEN_MOUTH;
    oval(c, INK, m.x, m.y, m.rx + 3, m.ry + 3); oval(c, '#7a2e2a', m.x, m.y, m.rx, m.ry);
    oval(c, '#e2867a', m.x, m.y + 16, m.rx * 0.6, m.ry * 0.35);
    // Upper and lower teeth.
    for (const [row, ty] of [[0, m.y - m.ry + 4], [1, m.y + m.ry - 18]] as const) for (let i = -2; i <= 2; i++) {
      const tx = m.x + i * 15, h = 14 - Math.abs(i) * 2;
      c.beginPath(); c.roundRect(tx - 7, row ? ty + (14 - h) : ty, 14, h, 3); c.fillStyle = '#fbfaf6'; c.fill(); stroke(c, '#c9c2b4', 1.2);
    }
  }
  // Toothpaste foam round the mouth.
  const foam = f.foam ?? 0;
  if (foam > 0) for (let i = 0; i < Math.round(10 * foam); i++) { const a = i / 10 * TAU + 0.3, r = 44 + (i % 3) * 6; oval(c, 'rgba(255, 255, 255, 0.92)', mx + Math.cos(a) * r, my + 4 + Math.sin(a) * r * 0.6, 7 + (i % 2) * 3, 6); }
  c.restore();
}

/** A point on the face (face units) in world pixels. */
export const onFace = (x: number, y: number, k: number, [fx, fy]: Pt): Pt => [x + fx * k, y + fy * k];
