import type { Look, Pose } from './fighters';
import { mix, shade } from './pixel';

// Fighters for the smooth build: the same jointed skeleton as the pixel puppets in fighters.ts (so reach, ground contact and
// falls match the simulation), drawn with curved cloth, outlined limbs and a side-on head instead of blocks.

type Pt = [number, number];
const INK = '#26312e';

export interface FighterOptions { tint?: string; parcel?: boolean; satchel?: boolean; gun?: boolean }

/** Draws with the feet at (x, ground) and the body raised z pixels, facing left or right. A tint replaces every colour. */
export function drawSmoothFighter(
  c: CanvasRenderingContext2D, x: number, ground: number, z: number, facing: 1 | -1, look: Look, pose: Pose, opts: FighterOptions = {},
): void {
  const tint = opts.tint;
  const K = (colour: string) => tint ?? colour;
  const ink = tint ?? INK;
  const s = look.height / 40, thigh = 9 * s, shin = 9 * s, torso = 13 * s, upper = 7 * s, fore = 7 * s, headH = Math.round(8 * s);
  const add = (p: Pt, angle: number, length: number): Pt => [p[0] + Math.sin(angle) * length, p[1] + Math.cos(angle) * length];
  const hip: Pt = [0, 0], shoulder: Pt = [Math.sin(pose.lean) * torso, -Math.cos(pose.lean) * torso];
  const legs = pose.legs.map(([a, b]) => { const knee = add(hip, a, thigh); return [knee, add(knee, a + b, shin)] as [Pt, Pt]; });
  const arms = pose.arms.map(([a, b]) => { const elbow = add(shoulder, a, upper); return [elbow, add(elbow, a + b, fore)] as [Pt, Pt]; });
  const headAngle = pose.lean + pose.head;
  const head: Pt = [shoulder[0] + Math.sin(headAngle) * (headH / 2 + 1), shoulder[1] - Math.cos(headAngle) * (headH / 2 + 1)];
  // Rest the lowest point of the rotated body on the ground, exactly as the pixel puppet does.
  const cr = Math.cos(pose.rot), sr = Math.sin(pose.rot);
  const turn = (p: Pt): Pt => [p[0] * cr - p[1] * sr, p[0] * sr + p[1] * cr];
  const lying = Math.abs(pose.rot) > 0.3;
  const low = Math.max(...[hip, shoulder, head, ...legs.flat(), ...arms.flat()].map(p => turn(p)[1])) + (lying ? look.build / 2 : 1);

  const line = (points: Pt[], colour: string, width: number) => {
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) c.lineTo(p[0], p[1]);
    c.lineWidth = width; c.strokeStyle = colour; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  };
  const oval = (px: number, py: number, rx: number, ry: number, fill: string, stroke = '') => {
    c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 0.45; c.stroke(); }
  };
  const box = (px: number, py: number, w: number, h: number, fill: string, radius = 1) => {
    c.beginPath(); c.roundRect(px, py, w, h, radius); c.fillStyle = fill; c.fill();
    c.lineWidth = 0.45; c.strokeStyle = ink; c.stroke();
  };

  c.save();
  c.translate(x, ground - z - low);
  c.scale(facing, 1);
  c.rotate(pose.rot);
  c.lineCap = 'round'; c.lineJoin = 'round';

  const leg = (index: number) => {
    const [knee, foot] = legs[index], colour = index ? shade(look.trousers, 0.78) : look.trousers;
    line([hip, knee, foot], ink, look.limb + 1.2);
    line([hip, knee, foot], K(colour), look.limb + 0.3);
    if (!tint) {
      line([[knee[0] - 0.7, knee[1] + 1], [foot[0] - 0.7, foot[1] - 2]], mix(colour, '#e9e5d8', 0.16), 0.6);
      if (look.stripe && index === 0) line([hip, knee], look.stripe, 0.7);
    }
    c.save(); c.translate(foot[0], foot[1]);
    if (lying) c.rotate(-pose.rot);
    c.beginPath(); c.moveTo(-2.4, -1.7); c.quadraticCurveTo(-1, -2.6, 1, -1.7); c.quadraticCurveTo(4, -1.1, 4.5, 0.5); c.lineTo(-2.5, 0.5); c.closePath();
    c.fillStyle = K(index ? shade(look.shoes, 0.8) : look.shoes); c.fill(); c.strokeStyle = ink; c.lineWidth = 0.5; c.stroke();
    if (!tint) line([[-2.2, 0.7], [4.1, 0.7]], mix(look.shoes, '#ebe9e0', 0.4), 0.65);
    c.restore();
  };
  const arm = (index: number) => {
    const [elbow, hand] = arms[index], colour = index ? shade(look.arms, 0.78) : look.arms;
    line([shoulder, elbow, hand], ink, look.limb + 0.8);
    line([shoulder, elbow, hand], K(colour), look.limb);
    if (look.shortSleeves && !tint) {
      const sleeve: Pt = [shoulder[0] * 0.45 + elbow[0] * 0.55, shoulder[1] * 0.45 + elbow[1] * 0.55];
      line([sleeve, elbow, hand], index ? shade(look.skin, 0.87) : look.skin, look.limb - 0.45);
      line([shoulder, [sleeve[0] - 0.1, sleeve[1] - 0.1]], colour, look.limb + 0.3);
    }
    oval(hand[0], hand[1], 1.6, 1.7, K(look.skin), ink);
  };

  leg(1); arm(1);
  const w = look.build / 2;
  if (opts.parcel) {
    // The package rides on the courier's back, strapped on so both fists are free.
    box(-w - 8, -torso + 2, 8.5, 11.5, K('#ae8150'), 1.2);
    if (!tint) {
      line([[-w - 4, -torso + 2.5], [-w - 4, -torso + 13]], '#e4c38b', 1.9);
      line([[-w - 7.5, -torso + 6], [-w, -torso + 6]], '#795c40', 0.5);
    }
  }
  leg(0);

  // Torso: a curved jacket from hip to shoulder, shaded darker at the back and lighter towards the sun.
  c.beginPath(); c.moveTo(-w, -0.5); c.bezierCurveTo(-w - 0.8, -5, shoulder[0] - w - 0.3, shoulder[1] + 3, shoulder[0] - w + 1, shoulder[1]);
  c.quadraticCurveTo(shoulder[0], shoulder[1] - 1.7, shoulder[0] + w - 0.5, shoulder[1]);
  c.bezierCurveTo(shoulder[0] + w + 1, shoulder[1] + 3, w + 0.7, -4, w, -0.5); c.closePath();
  if (tint) c.fillStyle = tint;
  else {
    const cloth = c.createLinearGradient(-w, 0, w + 3, 0);
    cloth.addColorStop(0, shade(look.jacket, 0.74)); cloth.addColorStop(0.4, look.jacket); cloth.addColorStop(1, mix(look.jacket, '#f3e5c6', 0.16));
    c.fillStyle = cloth;
  }
  c.fill(); c.strokeStyle = ink; c.lineWidth = 0.6; c.stroke();
  if (!tint) {
    line([[-w + 1, -0.6], [w - 0.7, -0.6]], shade(look.trousers, 0.8), 0.65);
    line([[shoulder[0] - 1, shoulder[1] + 5], [0, -3], [w - 1, -2]], shade(look.jacket, 0.86), 0.45);
    if (!look.shortSleeves) line([[shoulder[0] + 1, shoulder[1] + 1], [1, -1]], shade(look.jacket, 0.65), 0.5);
    if (look.stripe) line([[shoulder[0] + 1, shoulder[1] + 3], [2, -1]], look.stripe, 0.8);
    if (look.vest) {
      // Two reflective bands across the vest.
      const across = (t: number, off: number): Pt => [shoulder[0] * t + off * Math.cos(pose.lean), shoulder[1] * t + off * Math.sin(pose.lean)];
      for (const t of [0.35, 0.62]) line([across(t, -w + 0.8), across(t, w - 0.8)], '#d3d9dd', 1.2);
    }
    if (look.chain) {
      c.beginPath(); c.moveTo(shoulder[0] - 1.6, shoulder[1] + 0.8);
      c.quadraticCurveTo(shoulder[0] + 0.6, shoulder[1] + 6.2, shoulder[0] + w * 0.7, shoulder[1] + 1.4);
      c.strokeStyle = '#e5c35a'; c.lineWidth = 0.9; c.setLineDash([0.9, 0.7]); c.stroke(); c.setLineDash([]);
    }
  }
  if (opts.satchel) {
    line([[shoulder[0] + 3, shoulder[1] + 0.6], [-w - 1, -2]], K('#806146'), 1.2);
    box(-w - 4.2, -4.5, 5.8, 5.8, K('#c29759'));
    if (!tint) line([[-w - 3.8, -2.3], [-w + 1.2, -2.3]], '#8c683f', 0.4);
  }

  // Head, on a short neck.
  const hx = shoulder[0] + Math.sin(pose.lean + pose.head) * 5, hy = shoulder[1] - 4.9;
  line([[shoulder[0], shoulder[1] + 0.2], [hx, hy + 3]], K(look.skin), 3.7);
  c.save(); c.translate(hx, hy); c.rotate(pose.head * -0.5);
  paintHead(c, look, tint);
  c.restore();

  arm(0);
  if (opts.gun) {
    // D.D's pistol, pointing along the forearm.
    const [elbow, hand] = arms[0], len = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) || 1;
    const dx = (hand[0] - elbow[0]) / len, dy = (hand[1] - elbow[1]) / len;
    const a: Pt = [hand[0] + dx, hand[1] + dy], b: Pt = [hand[0] + dx * 7, hand[1] + dy * 7];
    line([a, b], ink, 3.6);
    line([a, b], K('#2b3036'), 2);
    if (!tint) {
      line([[a[0] + dx, a[1] + dy - 0.9], [b[0] - dx, b[1] - dy - 0.9]], '#727a82', 0.7);
      line([[hand[0] - dy * 0.4, hand[1] + dx * 0.4 + 1], [hand[0] - dy * 0.4, hand[1] + dx * 0.4 + 3.6]], '#23272b', 1.6);
    }
  }
  c.restore();
}

/**
 * A side-facing head centred on (0, 0), about 8 units tall and facing right: jaw, ear, eye, hair, and the look's cap or
 * shades. The caller has already translated, flipped and rotated the context.
 */
export function paintHead(c: CanvasRenderingContext2D, look: Look, tint?: string): void {
  const K = (colour: string) => tint ?? colour;
  const ink = tint ?? INK;
  const line = (points: Pt[], colour: string, width: number) => {
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) c.lineTo(p[0], p[1]);
    c.lineWidth = width; c.strokeStyle = colour; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  };
  const oval = (x: number, y: number, rx: number, ry: number, fill: string) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
  c.beginPath(); c.moveTo(-3, -2.8); c.bezierCurveTo(-2.5, -5.4, 3, -5.4, 3.5, -2.4);
  c.lineTo(3.2, -0.6); c.lineTo(4.5, 0.25); c.quadraticCurveTo(4.8, 0.8, 3.6, 1.1);
  c.quadraticCurveTo(3.7, 3.7, 1, 4); c.quadraticCurveTo(-2.7, 3.4, -3.1, 0.6); c.closePath();
  if (tint) c.fillStyle = tint;
  else {
    const face = c.createLinearGradient(-3, 0, 5, 0);
    face.addColorStop(0, shade(look.skin, 0.83)); face.addColorStop(0.65, look.skin); face.addColorStop(1, mix(look.skin, '#fff0d8', 0.2));
    c.fillStyle = face;
  }
  c.fill(); c.strokeStyle = ink; c.lineWidth = 0.4; c.stroke();
  if (!tint) {
    oval(-0.7, 0.65, 0.9, 1.25, look.skin); line([[-0.8, 0.3], [-0.4, 0.4], [-0.55, 1]], shade(look.skin, 0.72), 0.3);
    line([[1.5, -0.7], [2.8, -0.55]], look.hair, 0.5); oval(2.45, 0.05, 0.3, 0.38, '#28322e');
    line([[2.3, 2.4], [3.4, 2.2]], shade(look.skin, 0.57), 0.35);
  }
  if (!look.bald) {
    c.beginPath(); c.moveTo(-3.1, 1); c.bezierCurveTo(-4.6, -2.3, -3, -5.8, 0.7, -5.2); c.bezierCurveTo(3.3, -5.4, 4.2, -3.8, 3.5, -2.5);
    c.quadraticCurveTo(1.6, -3.4, -0.4, -1.5); c.lineTo(-1.5, -0.2); c.lineTo(-1.8, 1.4); c.closePath();
    c.fillStyle = K(look.hair); c.fill();
    if (!tint) {
      c.beginPath(); c.moveTo(-2.5, -3.3); c.quadraticCurveTo(0, -5, 2.8, -3.6);
      c.strokeStyle = look.fringe ?? mix(look.hair, '#e7d5ad', 0.2); c.lineWidth = 0.9; c.stroke();
    }
  }
  if (look.cap) {
    c.beginPath(); c.roundRect(-3.8, -4.8, 7.2, 2.1, 1); c.fillStyle = K(look.cap); c.fill(); c.lineWidth = 0.45; c.strokeStyle = ink; c.stroke();
    line([[0, -2.7], [4.5, -2.7]], K(look.cap), 1.2);
    if (look.badge && !tint) oval(2.2, -3.8, 0.6, 0.6, '#e3c35a');
  }
  if (look.shades && !tint) {
    c.beginPath(); c.roundRect(0.2, -0.6, 3.3, 1.5, 0.4); c.fillStyle = '#20292a'; c.fill();
    line([[-1.4, -0.3], [1, 0]], '#20292a', 0.35);
  }
}
