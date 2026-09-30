import type { Look, Pose } from './fighters';
import { mix, shade } from './pixel';
import { paintParcel } from './package-art';

// Fighters for the smooth build: the same jointed skeleton as the pixel puppets in fighters.ts (so reach, ground contact and
// falls match the simulation), drawn as shaded, outlined forms. The key light is the afternoon sun at the upper right of
// the screen whichever way a fighter faces: limbs and cloth get a lit side, a core shadow and a faint cool bounce on the
// far edge, and the front arm casts a soft shadow across the body.

type Pt = [number, number];
const INK = '#1c2522';
/** Warm key light and cool sky bounce. */
const SUN = '#fff0cf';
const SKY_RIM = 'rgba(178, 212, 236, 0.32)';
/** Direction towards the sun on screen (right and up). */
const LIGHT: Pt = [0.62, -0.78];

export interface FighterOptions { tint?: string; parcel?: boolean; satchel?: boolean; gun?: boolean }

/** Offsets a polyline sideways by `d`, towards the light (lx, ly), along the normal of each point. */
function offsetLine(points: Pt[], d: number, lx: number, ly: number): Pt[] {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-3) return p;
    let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
    return [p[0] + nx * d, p[1] + ny * d];
  });
}

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

  // The light in the body's own (mirrored and rotated) coordinates.
  const fx = LIGHT[0] * facing, fy = LIGHT[1];
  const lx = fx * cr + fy * sr, ly = -fx * sr + fy * cr;

  const path = (points: Pt[]) => { c.beginPath(); c.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]); };
  const line = (points: Pt[], colour: string | CanvasGradient, width: number) => {
    path(points); c.lineWidth = width; c.strokeStyle = colour; c.stroke();
  };
  /** A rounded limb: a dark core, the lit face offset towards the sun, a highlight, and a cool bounce on the far edge. */
  const form = (points: Pt[], colour: string, width: number) => {
    if (tint) { line(points, tint, width + 0.35); return; }
    line(points, shade(colour, 0.7), width + 0.35);
    line(offsetLine(points, width * 0.1, lx, ly), mix(shade(colour, 0.7), colour, 0.6), width * 0.86);
    line(offsetLine(points, width * 0.17, lx, ly), colour, width * 0.66);
    line(offsetLine(points, width * 0.28, lx, ly), mix(colour, SUN, 0.16), width * 0.3);
  };
  const oval = (px: number, py: number, rx: number, ry: number, fill: string | CanvasGradient, stroke = '', width = 0.45) => {
    c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const lit = (px: number, py: number, r: number, colour: string): CanvasGradient | string => {
    if (tint) return tint;
    const g = c.createRadialGradient(px + lx * r * 0.5, py + ly * r * 0.5, 0, px, py, r * 1.35);
    g.addColorStop(0, mix(colour, SUN, 0.35)); g.addColorStop(0.55, colour); g.addColorStop(1, shade(colour, 0.7));
    return g;
  };
  /** A gradient across the body along the light: shadow side, the colour, the lit side. */
  const across = (cx: number, cy: number, half: number, colour: string, k = 0.72): CanvasGradient => {
    const g = c.createLinearGradient(cx - lx * half, cy - ly * half, cx + lx * half, cy + ly * half);
    g.addColorStop(0, shade(colour, k)); g.addColorStop(0.45, colour); g.addColorStop(1, mix(colour, SUN, 0.22));
    return g;
  };

  c.save();
  c.translate(x, ground - z - low);
  c.scale(facing, 1);
  c.rotate(pose.rot);
  c.lineCap = 'round'; c.lineJoin = 'round';

  const W = look.limb + 0.45;
  const leg = (index: number) => {
    const [knee, foot] = legs[index], colour = index ? shade(look.trousers, 0.8) : look.trousers;
    // The trouser leg ends at the ankle, inside the shoe, so its outline never shows under the sole.
    const sl = Math.hypot(foot[0] - knee[0], foot[1] - knee[1]) || 1, cut = Math.min(2.6, sl * 0.4);
    const ankle: Pt = [foot[0] - (foot[0] - knee[0]) / sl * cut, foot[1] - (foot[1] - knee[1]) / sl * cut];
    line([hip, knee, ankle], ink, W + 1.55);
    form([hip, knee, ankle], colour, W);
    if (!tint) {
      if (look.stripe && index === 0) line(offsetLine([hip, knee, ankle], W * 0.05, lx, ly), look.stripe, 0.75);
    }
    shoe(foot, index);
  };
  const shoe = (foot: Pt, index: number) => {
    c.save(); c.translate(foot[0], foot[1]);
    if (lying) c.rotate(-pose.rot);
    const colour = index ? shade(look.shoes, 0.8) : look.shoes;
    c.beginPath(); c.moveTo(-2.7, -2); c.quadraticCurveTo(-1, -3, 1.2, -2); c.quadraticCurveTo(4.3, -1.4, 4.8, 0.7); c.lineTo(-2.8, 0.7); c.closePath();
    if (tint) c.fillStyle = tint;
    else {
      const g = c.createLinearGradient(0, -3, 0, 0.7);
      g.addColorStop(0, mix(colour, SUN, 0.25)); g.addColorStop(0.6, colour); g.addColorStop(1, shade(colour, 0.7));
      c.fillStyle = g;
    }
    c.fill(); c.strokeStyle = ink; c.lineWidth = 0.55; c.stroke();
    if (!tint) {
      // Sole, a toe cap glint and a lace line.
      const pale = rgbLuma(look.shoes) > 0.6;
      line([[-2.5, 0.35], [4.5, 0.35]], pale ? '#c9c4b8' : '#e6e1d4', 0.6);
      line([[-0.2, -2.3], [1.3, -1.8]], alphaOf(pale ? '#8d8a82' : '#e6e1d4', 0.6), 0.35);
      oval(3.1, -1.1, 0.8, 0.4, 'rgba(255, 250, 235, 0.45)');
    }
    c.restore();
  };
  const arm = (index: number) => {
    const [elbow, hand] = arms[index], colour = index ? shade(look.arms, 0.8) : look.arms;
    // The sleeve stops at the wrist, so its outline doesn't ring the fist.
    const fl = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) || 1, cut = Math.min(1.4, fl * 0.4);
    const wrist: Pt = [hand[0] - (hand[0] - elbow[0]) / fl * cut, hand[1] - (hand[1] - elbow[1]) / fl * cut];
    const pts: Pt[] = [shoulder, elbow, wrist];
    line(pts, ink, look.limb + 1.3);
    if (look.shortSleeves && !tint) {
      const sleeve: Pt = [shoulder[0] * 0.45 + elbow[0] * 0.55, shoulder[1] * 0.45 + elbow[1] * 0.55];
      form([sleeve, elbow, wrist], index ? shade(look.skin, 0.86) : look.skin, look.limb - 0.35);
      line([shoulder, sleeve], ink, look.limb + 1.45);
      form([shoulder, sleeve], colour, look.limb + 0.25);
      // The sleeve's hem.
      const d = Math.hypot(sleeve[0] - shoulder[0], sleeve[1] - shoulder[1]) || 1;
      const nx = -(sleeve[1] - shoulder[1]) / d * (look.limb + 0.3) / 2, ny = (sleeve[0] - shoulder[0]) / d * (look.limb + 0.3) / 2;
      line([[sleeve[0] - nx, sleeve[1] - ny], [sleeve[0] + nx, sleeve[1] + ny]], shade(colour, 0.6), 0.45);
    } else form(pts, colour, look.limb);
    // A fist: rounded, lit on the sun side, with a knuckle line.
    oval(hand[0], hand[1], 2.15, 2.0, lit(hand[0], hand[1], 1.9, index ? shade(look.skin, 0.9) : look.skin), ink, 0.5);
    if (!tint) {
      c.beginPath(); c.arc(hand[0], hand[1], 1.05, -1.2 + (lx > 0 ? 0 : Math.PI), 0.6 + (lx > 0 ? 0 : Math.PI));
      c.strokeStyle = shade(look.skin, 0.66); c.lineWidth = 0.3; c.stroke();
    }
  };

  leg(1); arm(1);
  const w = look.build / 2;
  if (opts.parcel) {
    // The package rides on the courier's back, strapped on so both fists are free.
    c.save(); c.translate(-w - 3.8, -torso + 13.5); c.rotate(-pose.lean * 0.3);
    paintParcel(c, 0, 0, 9, 12, lx >= 0 ? 1 : -1, tint);
    c.restore();
  }
  leg(0);

  // Torso: a curved jacket from hip to shoulder.
  const torsoPath = () => {
    c.beginPath(); c.moveTo(-w - 0.1, -0.3); c.bezierCurveTo(-w - 1, -5, shoulder[0] - w - 0.5, shoulder[1] + 3, shoulder[0] - w + 1, shoulder[1] - 0.1);
    c.quadraticCurveTo(shoulder[0], shoulder[1] - 1.9, shoulder[0] + w - 0.4, shoulder[1] - 0.1);
    c.bezierCurveTo(shoulder[0] + w + 1.2, shoulder[1] + 3, w + 0.9, -4, w + 0.1, -0.3); c.closePath();
  };
  const mid: Pt = [shoulder[0] / 2, shoulder[1] / 2];
  torsoPath();
  c.fillStyle = tint ?? across(mid[0], mid[1], w + 1.5, look.jacket, 0.66);
  c.fill(); c.strokeStyle = ink; c.lineWidth = 0.75; c.stroke();
  if (!tint) {
    c.save(); torsoPath(); c.clip();
    // Occlusion at the belt and under the collar, a sunlit shoulder.
    const waist = c.createLinearGradient(mid[0] * 0.3, 0, mid[0] * 0.5, mid[1] * 0.5);
    waist.addColorStop(0, 'rgba(12, 16, 22, 0.32)'); waist.addColorStop(1, 'rgba(12, 16, 22, 0)');
    c.fillStyle = waist; c.fillRect(-w - 3, shoulder[1] - 3, w * 2 + 6 + Math.abs(shoulder[0]), torso + 5);
    const sun = c.createRadialGradient(shoulder[0] + lx * w * 0.6, shoulder[1] + 2, 0, shoulder[0] + lx * w * 0.6, shoulder[1] + 2, w * 1.3);
    sun.addColorStop(0, alphaOf(mix(look.jacket, SUN, 0.55), 0.55)); sun.addColorStop(1, alphaOf(look.jacket, 0));
    c.fillStyle = sun; c.fillRect(-w - 3, shoulder[1] - 3, w * 2 + 6 + Math.abs(shoulder[0]), torso + 5);
    // Cloth folds: two soft creases from the armpit, and a lit ridge.
    const dark = alphaOf(shade(look.jacket, 0.45), 0.55);
    line([[shoulder[0] - w * 0.2, shoulder[1] + 3.2], [mid[0] - w * 0.1, mid[1] + 1.5], [-w * 0.35, -2.2]], dark, 0.45);
    line([[shoulder[0] + w * 0.35, shoulder[1] + 4.5], [mid[0] + w * 0.2, mid[1] + 2.4], [w * 0.1, -1.4]], dark, 0.35);
    line([[shoulder[0] + w * 0.05, shoulder[1] + 3.6], [mid[0] + w * 0.05, mid[1] + 2]], alphaOf(mix(look.jacket, SUN, 0.5), 0.5), 0.35);
    // The front arm's shadow across the body.
    const [elbow, hand] = arms[0];
    line([shoulder, elbow, hand].map(([px, py]) => [px - lx * 1.3, py - ly * 1.3] as Pt), 'rgba(10, 14, 20, 0.26)', look.limb + 1.6);
    if (look.vest) {
      // Two reflective bands across the vest.
      const band = (t: number, off: number): Pt => [shoulder[0] * t + off * Math.cos(pose.lean), shoulder[1] * t + off * Math.sin(pose.lean)];
      for (const t of [0.35, 0.62]) {
        line([band(t, -w - 1), band(t, w + 1)], '#9ea6ab', 1.55);
        line([band(t, -w - 1), band(t, w + 1)], '#eef3f5', 1.05);
      }
    }
    if (look.stripe) line([[shoulder[0] + 1, shoulder[1] + 3], [2, -1]], look.stripe, 0.85);
    // A key-light edge on the sun side and a faint sky rim on the other.
    torsoPath();
    const rim = c.createLinearGradient(mid[0] - lx * (w + 1), mid[1] - ly * (w + 1), mid[0] + lx * (w + 1), mid[1] + ly * (w + 1));
    rim.addColorStop(0, SKY_RIM); rim.addColorStop(0.3, 'rgba(0, 0, 0, 0)'); rim.addColorStop(0.72, 'rgba(0, 0, 0, 0)'); rim.addColorStop(1, alphaOf(SUN, 0.7));
    c.strokeStyle = rim; c.lineWidth = 1.5; c.stroke();
    c.restore();
    // Belt, collar and the shirt's front seam.
    line([[-w + 0.6, -0.7], [w - 0.4, -0.7]], shade(look.trousers, 0.62), 0.8);
    if (!look.shortSleeves && !look.vest) line([[shoulder[0] + 1, shoulder[1] + 1], [1, -1]], shade(look.jacket, 0.6), 0.45);
    line([[shoulder[0] - 1.6, shoulder[1] + 0.2], [shoulder[0] + 0.4, shoulder[1] + 1.4], [shoulder[0] + 2, shoulder[1] + 0.1]], shade(look.jacket, 0.5), 0.55);
    if (look.chain) {
      c.beginPath(); c.moveTo(shoulder[0] - 1.6, shoulder[1] + 0.8);
      c.quadraticCurveTo(shoulder[0] + 0.6, shoulder[1] + 6.2, shoulder[0] + w * 0.7, shoulder[1] + 1.4);
      c.strokeStyle = '#a07f2a'; c.lineWidth = 1.2; c.setLineDash([0.9, 0.7]); c.stroke();
      c.strokeStyle = '#f5dc86'; c.lineWidth = 0.6; c.stroke(); c.setLineDash([]);
    }
  }
  if (opts.satchel) {
    line([[shoulder[0] + 3, shoulder[1] + 0.6], [-w - 1, -2]], ink, 1.9);
    line([[shoulder[0] + 3, shoulder[1] + 0.6], [-w - 1, -2]], K('#7a5a3f'), 1.2);
    c.beginPath(); c.roundRect(-w - 4.4, -4.8, 6.2, 6.2, 1.2);
    c.fillStyle = tint ?? across(-w - 1.3, -1.7, 3.5, '#bb8e52', 0.7); c.fill();
    c.strokeStyle = ink; c.lineWidth = 0.5; c.stroke();
    if (!tint) {
      // The flap and its brass buckle.
      c.beginPath(); c.moveTo(-w - 4.4, -2.6); c.lineTo(-w + 1.8, -2.6); c.strokeStyle = shade('#bb8e52', 0.55); c.lineWidth = 0.4; c.stroke();
      oval(-w - 1.3, -2.2, 0.55, 0.5, '#e3c35a', shade('#bb8e52', 0.45), 0.25);
    }
  }

  // Head, on a short neck shaded under the jaw.
  const hx = shoulder[0] + Math.sin(pose.lean + pose.head) * 5, hy = shoulder[1] - 4.9;
  line([[shoulder[0], shoulder[1] + 0.2], [hx, hy + 3]], ink, 4.5);
  line([[shoulder[0], shoulder[1] + 0.2], [hx, hy + 3]], K(shade(look.skin, 0.8)), 3.7);
  c.save(); c.translate(hx, hy); c.rotate(pose.head * -0.5);
  const hr = pose.head * 0.5;
  paintHead(c, look, tint, lx * Math.cos(hr) - ly * Math.sin(hr), lx * Math.sin(hr) + ly * Math.cos(hr));
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
      line([[a[0] + dx, a[1] + dy - 0.9], [b[0] - dx, b[1] - dy - 0.9]], '#8a939b', 0.6);
      line([[hand[0] - dy * 0.4, hand[1] + dx * 0.4 + 1], [hand[0] - dy * 0.4, hand[1] + dx * 0.4 + 3.6]], '#23272b', 1.6);
    }
  }
  c.restore();
}

const rgbLuma = (hex: string): number => {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
};
const alphaOf = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * A side-facing head centred on (0, 0), about 8 units tall and facing right: jaw, ear, eye, hair, and the look's cap or
 * shades. The caller has already translated, flipped and rotated the context; (lx, ly) is the direction of the light in
 * those coordinates (by default the sun ahead and above).
 */
export function paintHead(c: CanvasRenderingContext2D, look: Look, tint?: string, lx = LIGHT[0], ly = LIGHT[1]): void {
  const K = (colour: string) => tint ?? colour;
  const ink = tint ?? INK;
  const line = (points: Pt[], colour: string, width: number) => {
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) c.lineTo(p[0], p[1]);
    c.lineWidth = width; c.strokeStyle = colour; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  };
  const oval = (x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
  const lightAcross = (colour: string, half: number, k: number): CanvasGradient => {
    const g = c.createLinearGradient(-lx * half, -ly * half, lx * half, ly * half);
    g.addColorStop(0, shade(colour, k)); g.addColorStop(0.5, colour); g.addColorStop(1, mix(colour, SUN, 0.28));
    return g;
  };
  const face = () => {
    c.beginPath(); c.moveTo(-3, -2.8); c.bezierCurveTo(-2.5, -5.4, 3, -5.4, 3.5, -2.4);
    c.lineTo(3.2, -0.6); c.lineTo(4.5, 0.25); c.quadraticCurveTo(4.8, 0.8, 3.6, 1.1);
    c.quadraticCurveTo(3.7, 3.7, 1, 4); c.quadraticCurveTo(-2.7, 3.4, -3.1, 0.6); c.closePath();
  };
  face();
  c.fillStyle = tint ?? lightAcross(look.skin, 4.5, 0.74);
  c.fill(); c.strokeStyle = ink; c.lineWidth = 0.5; c.stroke();
  if (!tint) {
    c.save(); face(); c.clip();
    // Occlusion under the jaw and a warm cheek.
    const jaw = c.createLinearGradient(0, 1.6, 0, 4.2);
    jaw.addColorStop(0, alphaOf(shade(look.skin, 0.6), 0)); jaw.addColorStop(1, alphaOf(shade(look.skin, 0.6), 0.5));
    c.fillStyle = jaw; c.fillRect(-4, 1.6, 9, 3);
    oval(2.2, 1.5, 1.1, 0.7, 'rgba(214, 110, 90, 0.18)');
    c.restore();
    // Ear, brow, eye with a glint, nose shadow and mouth.
    oval(-0.7, 0.65, 0.95, 1.3, shade(look.skin, 0.92)); line([[-0.8, 0.2], [-0.35, 0.35], [-0.55, 1.05]], shade(look.skin, 0.62), 0.32);
    line([[1.45, -0.85], [2.95, -0.7]], shade(look.hair, 0.8), 0.55);
    oval(2.45, 0.1, 0.36, 0.44, '#1d2422'); oval(2.55, -0.02, 0.12, 0.12, 'rgba(255, 255, 255, 0.85)');
    line([[4.2, 0.9], [3.5, 1.15]], shade(look.skin, 0.68), 0.3);
    line([[2.3, 2.4], [3.4, 2.2]], shade(look.skin, 0.55), 0.38);
  }
  if (!look.bald) {
    const hair = () => {
      c.beginPath(); c.moveTo(-3.1, 1); c.bezierCurveTo(-4.6, -2.3, -3, -5.8, 0.7, -5.2); c.bezierCurveTo(3.3, -5.4, 4.2, -3.8, 3.5, -2.5);
      c.quadraticCurveTo(1.6, -3.4, -0.4, -1.5); c.lineTo(-1.5, -0.2); c.lineTo(-1.8, 1.4); c.closePath();
    };
    hair();
    c.fillStyle = tint ?? lightAcross(look.hair, 4.2, 0.7); c.fill();
    if (!tint) {
      c.strokeStyle = shade(look.hair, 0.6); c.lineWidth = 0.4; c.stroke();
      // Strands and a sheen band where the light catches the crown.
      c.beginPath(); c.moveTo(-2.5, -3.3); c.quadraticCurveTo(0, -5, 2.8, -3.6);
      c.strokeStyle = look.fringe ?? mix(look.hair, '#e7d5ad', 0.22); c.lineWidth = 0.9; c.stroke();
      c.beginPath(); c.arc(0.2 + lx * 0.6, -1.4, 3.4, -Math.PI / 2 - 0.9 + lx * 0.6, -Math.PI / 2 + 0.3 + lx * 0.6);
      c.strokeStyle = alphaOf(mix(look.hair, SUN, 0.6), 0.45); c.lineWidth = 0.55; c.stroke();
      line([[-2.6, -1.8], [-2.1, 0.4]], alphaOf(shade(look.hair, 0.55), 0.7), 0.3);
    }
  } else if (!tint) {
    // A shine on the scalp.
    oval(0.6 + lx * 0.9, -4 - ly * 0.1, 1.3, 0.5, 'rgba(255, 244, 226, 0.4)');
  }
  if (look.cap) {
    c.beginPath(); c.roundRect(-3.8, -4.9, 7.3, 2.3, 1);
    c.fillStyle = tint ?? lightAcross(look.cap, 3.8, 0.7); c.fill(); c.lineWidth = 0.5; c.strokeStyle = ink; c.stroke();
    line([[0, -2.7], [4.7, -2.7]], ink, 1.7);
    line([[0, -2.7], [4.6, -2.7]], K(look.cap), 1.15);
    if (!tint) {
      line([[0.6, -3.1], [4.2, -3.1]], 'rgba(200, 220, 255, 0.35)', 0.3);
      if (look.badge) { oval(2.2, -3.8, 0.7, 0.7, '#a88a2e'); oval(2.1, -3.9, 0.45, 0.45, '#f1d673'); }
    }
  }
  if (look.shades && !tint) {
    c.beginPath(); c.roundRect(0.2, -0.6, 3.3, 1.5, 0.4); c.fillStyle = '#161c1d'; c.fill();
    line([[0.7, -0.3], [2.1, -0.3]], 'rgba(170, 205, 230, 0.6)', 0.35);
    line([[-1.4, -0.3], [1, 0]], '#20292a', 0.35);
  }
}
