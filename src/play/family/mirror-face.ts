import { INK, TAU, line, mix, oval, rgrad, stroke, type C, type Pt } from './art';
import type { KidLook } from './games/kurragomma';

// Carl-Otto seen straight on, big, for the two bathroom mirrors (Tänder och tvål, Fånig i spegeln), after a photo of him:
// dark-blond straight hair, longer on top with a soft fringe straight across the forehead and short at the sides, ears
// that stick out a little, blue-grey eyes, rosy cheeks, an egg-shaped face. The rest of the collection draws him turned to
// the side (kids.ts); a mirror needs his whole face: two eyes, a nose, a mouth that can open wide for the toothbrush or
// stick its tongue out. Units: the face is about 100 from its middle to the chin; (x, y) is the middle, `k` world pixels
// per unit.

export type Eyes = 'open' | 'wide' | 'shut' | 'wink' | 'cross';
export type Mouth = 'smile' | 'grin' | 'o' | 'tongue' | 'brush';
export interface FaceLook { eyes?: Eyes; mouth?: Mouth; /** Toothpaste foam round the mouth, 0–1. */ foam?: number; /** Clean teeth that sparkle. */ sparkle?: boolean }

/** Where the eyes, nose and mouth are, in face units (for things worn on the face). */
export const FEATURES = { eyes: [[-32, -2], [32, -2]] as Pt[], nose: [0, 22] as Pt, mouth: [0, 56] as Pt, crown: [0, -112] as Pt };
/** The open mouth for brushing, and the eight teeth where sugar bugs sit (upper left, upper right, lower left, lower right). */
export const OPEN_MOUTH = { x: 0, y: 60, rx: 46, ry: 30 };
export const TOOTH_SPOTS: Pt[] = [[-30, 44], [-12, 42], [12, 42], [30, 44], [-28, 74], [-10, 77], [10, 77], [28, 74]];

/** His eyes, from the photo. */
const IRIS = '#7d93a6';
const shade = (hex: string, k: number) => mix(hex, '#000000', 1 - k);

/** The face's outline: round over the brow, narrower at the chin. */
function faceShape(c: C): void {
  c.beginPath(); c.moveTo(0, -104);
  c.bezierCurveTo(60, -104, 86, -62, 86, -8); c.bezierCurveTo(86, 50, 52, 104, 0, 106);
  c.bezierCurveTo(-52, 104, -86, 50, -86, -8); c.bezierCurveTo(-86, -62, -60, -104, 0, -104); c.closePath();
}

/** The hair: a full cap over the crown, short over the ears, and a soft fringe straight across the forehead. */
function hairShape(c: C): void {
  c.beginPath(); c.moveTo(-90, 4);
  c.bezierCurveTo(-104, -84, -52, -130, 0, -128); c.bezierCurveTo(52, -130, 104, -84, 90, 4);
  c.lineTo(82, 0); c.quadraticCurveTo(80, -24, 72, -36);
  // The fringe, from his left temple to his right, in soft tufts.
  const tufts = 8;
  for (let i = 1; i <= tufts; i++) {
    const x0 = 72 - (i - 1) * 144 / tufts, x1 = 72 - i * 144 / tufts, dip = -34 + Math.abs(i - 0.5 - tufts / 2) * 0.8;
    c.quadraticCurveTo((x0 + x1) / 2, dip, x1, -40);
  }
  c.quadraticCurveTo(-80, -24, -82, 0); c.closePath();
}

export function paintMirrorFace(c: C, x: number, y: number, k: number, look: KidLook, f: FaceLook = {}, t = 0): void {
  c.save(); c.translate(x, y); c.scale(k, k);
  const skin = look.skin, hair = mix(look.hair, '#8a6a3a', 0.3);
  // Shoulders in his top (striped, if it is), the collar of the shirt under it, the neck.
  const shoulders = () => { c.beginPath(); c.moveTo(-134, 210); c.quadraticCurveTo(-124, 112, -40, 106); c.lineTo(40, 106); c.quadraticCurveTo(124, 112, 134, 210); c.closePath(); };
  shoulders(); c.fillStyle = look.top; c.fill();
  if (look.stripes) { c.save(); shoulders(); c.clip(); for (let sy = 112; sy < 210; sy += 14) { c.fillStyle = look.stripes; c.fillRect(-140, sy, 280, 5); } c.restore(); }
  shoulders(); stroke(c, INK, 2);
  c.beginPath(); c.moveTo(-36, 84); c.lineTo(-32, 118); c.lineTo(32, 118); c.lineTo(36, 84); c.closePath(); c.fillStyle = skin; c.fill(); stroke(c, INK, 2);
  c.beginPath(); c.moveTo(-40, 106); c.quadraticCurveTo(0, 138, 40, 106); stroke(c, INK, 10); stroke(c, look.extraColour ?? shade(look.top, 0.75), 7);
  // The ears, sticking out a little.
  for (const s of [-1, 1]) {
    c.save(); c.translate(s * 86, 4); c.rotate(s * 0.18);
    oval(c, INK, s * 6, 0, 19, 27); oval(c, skin, s * 6, 0, 17, 25); oval(c, shade(skin, 0.86), s * 8, 2, 8, 14);
    c.restore();
  }
  // The face.
  faceShape(c); c.fillStyle = rgrad(c, 0, 0, 120, [[0, mix(skin, '#fff4e4', 0.3)], [0.65, skin], [1, shade(skin, 0.86)]], -20, -30); c.fill();
  faceShape(c); stroke(c, INK, 2);
  // The hair, with darker strands and a sheen.
  hairShape(c); c.fillStyle = rgrad(c, -10, -100, 130, [[0, mix(hair, '#ffffff', 0.18)], [0.6, hair], [1, shade(hair, 0.82)]]); c.fill();
  c.save(); hairShape(c); c.clip();
  for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * 12, -124); c.quadraticCurveTo(i * 14 + 4, -80, i * 12 + 2, -40); stroke(c, shade(hair, 0.8), 1.6); }
  c.beginPath(); c.ellipse(-12, -96, 50, 16, -0.15, Math.PI * 1.1, Math.PI * 1.9); stroke(c, mix(hair, '#ffffff', 0.4), 4);
  c.restore();
  hairShape(c); stroke(c, INK, 2);
  // Brows, eyes, nose, cheeks.
  const eyes = f.eyes ?? 'open', brow = shade(hair, 0.85);
  for (const [i, [ex, ey]] of FEATURES.eyes.entries()) {
    const lift = eyes === 'wide' ? 6 : 0;
    c.beginPath(); c.moveTo(ex - 15, ey - 18 - lift); c.quadraticCurveTo(ex, ey - 24 - lift, ex + 15, ey - 19 - lift); stroke(c, brow, 3.4);
    const shut = eyes === 'shut' || (eyes === 'wink' && i === 1);
    if (shut) { c.beginPath(); c.arc(ex, ey - 4, 11, 0.3, Math.PI - 0.3); stroke(c, INK, 3); continue; }
    const rx = eyes === 'wide' ? 15 : 13, ry = eyes === 'wide' ? 12 : 9, look = eyes === 'cross' ? -Math.sign(ex) * 5 : 0;
    oval(c, INK, ex, ey, rx + 1.6, ry + 1.6); oval(c, '#ffffff', ex, ey, rx, ry);
    c.save(); c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, TAU); c.clip();
    oval(c, IRIS, ex + look, ey + 1, 7.5, 7.5); oval(c, shade(IRIS, 0.7), ex + look, ey + 1, 7.5, 7.5); oval(c, IRIS, ex + look, ey + 1, 6, 6);
    oval(c, INK, ex + look, ey + 1, 3.4, 3.4); oval(c, '#ffffff', ex + look + 2.5, ey - 2, 2, 2);
    c.restore();
    c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); stroke(c, INK, 2.8);
  }
  // The nose: a soft shadow down one side and the nostrils.
  const [nx, ny] = FEATURES.nose;
  c.beginPath(); c.moveTo(nx + 6, ny - 22); c.quadraticCurveTo(nx + 12, ny, nx + 8, ny + 6); stroke(c, shade(skin, 0.8), 2.4);
  c.beginPath(); c.arc(nx - 6, ny + 6, 4, 0.2, Math.PI - 0.6); stroke(c, shade(skin, 0.7), 2);
  c.beginPath(); c.arc(nx + 6, ny + 6, 4, 0.6, Math.PI - 0.2); stroke(c, shade(skin, 0.7), 2);
  oval(c, 'rgba(255, 255, 255, 0.35)', nx + 2, ny - 2, 3, 2);
  for (const s of [-1, 1]) oval(c, 'rgba(232, 120, 106, 0.38)', s * 50, 30, 17, 11);
  // The mouth.
  const [mx, my] = FEATURES.mouth, mouth = f.mouth ?? 'smile';
  if (mouth === 'smile') {
    c.beginPath(); c.moveTo(mx - 20, my - 2); c.quadraticCurveTo(mx, my + 8, mx + 20, my - 2); stroke(c, '#a05a48', 3.4);
    oval(c, 'rgba(214, 120, 110, 0.55)', mx, my + 6, 12, 4);
  } else if (mouth === 'grin' || mouth === 'tongue') {
    c.beginPath(); c.moveTo(mx - 30, my - 6); c.quadraticCurveTo(mx, my + 32, mx + 30, my - 6); c.closePath(); c.fillStyle = '#7a2e2a'; c.fill(); stroke(c, INK, 2.4);
    c.beginPath(); c.moveTo(mx - 26, my - 4); c.lineTo(mx + 26, my - 4); c.lineTo(mx + 22, my + 4); c.lineTo(mx - 22, my + 4); c.closePath(); c.fillStyle = '#ffffff'; c.fill();
    if (mouth === 'tongue') { c.beginPath(); c.moveTo(mx - 14, my + 8); c.quadraticCurveTo(mx - 16, my + 40, mx, my + 40); c.quadraticCurveTo(mx + 16, my + 40, mx + 14, my + 8); c.closePath(); c.fillStyle = '#e2867a'; c.fill(); stroke(c, INK, 2); line(c, '#c86a60', 1.6, [[mx, my + 14], [mx, my + 30]]); }
    if (f.sparkle) for (let i = 0; i < 3; i++) { const sx = mx - 18 + i * 18, sy = my - 2, a = t * 6 + i, r = 5 + Math.abs(Math.sin(a)) * 6; line(c, '#ffffff', 2.4, [[sx - r, sy], [sx + r, sy]]); line(c, '#ffffff', 2.4, [[sx, sy - r], [sx, sy + r]]); }
  } else if (mouth === 'o') { oval(c, INK, mx, my, 14, 18); oval(c, '#7a2e2a', mx, my, 12, 16); }
  else {
    const m = OPEN_MOUTH;
    oval(c, INK, m.x, m.y, m.rx + 3, m.ry + 3); oval(c, '#7a2e2a', m.x, m.y, m.rx, m.ry);
    oval(c, '#e2867a', m.x, m.y + 16, m.rx * 0.6, m.ry * 0.35);
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

/** Carl-Otto in the bathroom, ready for bed, from the photo: his red-striped top with the navy shirt under it. */
export function bedtimeLook(look: KidLook): KidLook { return { ...look, top: '#9a2f3a', stripes: '#e3b07a', extraColour: '#3a4a6e' }; }
