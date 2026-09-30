import { INK, box, limb, line, mix, oval, rgrad, stroke, type C, type Pt } from './art';
import type { KidLook } from './games/kurragomma';

// Carl-Otto's friends (and Carl-Otto on foot), in the same storybook style as the ride: outlined, shaded from the upper
// right, big round heads. One jointed figure takes every pose; the hiding places draw parts of it (a head, a pair of feet,
// a waving hand) where only a part shows. Units are the 960 × 540 world; (x, y) is between the feet on the ground.

export type Pose =
  | { kind: 'stand' }
  | { kind: 'walk'; phase: number }
  | { kind: 'run'; phase: number }
  | { kind: 'cheer'; t: number }
  | { kind: 'pop'; t: number }
  /** Hands over the eyes: counting at the wall, or "if I can't see you, you can't see me". */
  | { kind: 'eyes' }
  /** Bent right over, bottom up: under the slide. */
  | { kind: 'crouch' }
  /** Sitting with the legs hanging, swinging: up in the tree. */
  | { kind: 'sit'; t: number }
  | { kind: 'point'; t: number };

export type Face = { eyes?: 'open' | 'shut' | 'wide'; mouth?: 'smile' | 'open' | 'grin' };

/** Carl-Otto on foot: a blond boy in his yellow SpongeBob t-shirt (the blue helmet is for the bike). */
export const CARL_OTTO: KidLook = {
  skin: '#f0c197', hair: '#e8c870', style: 'short', top: '#f5d23a', bottom: '#4a6fa5', shoes: '#efebdc', tee: true, print: 'sponge',
};
/** The preschool teacher, drawn as a taller grown-up. */
export const TEACHER_LOOK: KidLook = { skin: '#f1c7a1', hair: '#8a5a36', style: 'bun', top: '#5b8fb9', bottom: '#3f4f5a', shoes: '#4a3a30', extra: 'glasses', extraColour: '#6b3b2c' };

type Look = KidLook & { helmet?: boolean };
const SIZE = { hip: 44, torso: 34, thigh: 22, shin: 22, upper: 15, fore: 14, head: 19 };
const add = (p: Pt, angle: number, length: number): Pt => [p[0] + Math.sin(angle) * length, p[1] + Math.cos(angle) * length];

interface Rig { lean: number; legs: [[number, number], [number, number]]; arms: [[number, number], [number, number]]; lift: number; bob: number }

function rig(pose: Pose): Rig {
  const s = (t: number) => Math.sin(t);
  switch (pose.kind) {
    case 'walk': { const p = pose.phase; return { lean: 0.05, legs: [[s(p) * 0.5, Math.max(0, -s(p)) * 0.6], [-s(p) * 0.5, Math.max(0, s(p)) * 0.6]], arms: [[-s(p) * 0.5, -0.4], [s(p) * 0.5, -0.4]], lift: 0, bob: Math.abs(s(p)) * 2 }; }
    case 'run': { const p = pose.phase; return { lean: 0.2, legs: [[s(p) * 0.9, Math.max(0, -s(p)) * 1.2 + 0.2], [-s(p) * 0.9, Math.max(0, s(p)) * 1.2 + 0.2]], arms: [[-s(p) * 0.9, -1.3], [s(p) * 0.9, -1.3]], lift: Math.abs(s(p)) * 4, bob: 0 }; }
    case 'cheer': { const j = Math.abs(s(pose.t * 7)), w = s(pose.t * 14) * 0.15; return { lean: -0.05, legs: [[0.15, 0.1 + j * 0.3], [-0.15, 0.1 + j * 0.3]], arms: [[Math.PI - 1.05 + w, -0.25], [Math.PI + 1.0 - w, 0.25]], lift: j * 14, bob: 0 }; }
    case 'pop': { const j = Math.max(0, s(Math.min(1, pose.t / 0.5) * Math.PI)); return { lean: -0.05, legs: [[0.35, 0.5 * j], [-0.35, 0.5 * j]], arms: [[Math.PI - 0.9, 0.3], [Math.PI + 0.9, -0.3]], lift: j * 26, bob: 0 }; }
    case 'eyes': return { lean: 0, legs: [[0.06, 0], [-0.06, 0]], arms: [[Math.PI - 0.35, 2.05], [Math.PI - 0.15, 2.2]], lift: 0, bob: 0 };
    case 'crouch': return { lean: 2.25, legs: [[0.22, 0.05], [0.02, 0.08]], arms: [[0.25, 0.1], [0.05, 0.1]], lift: -2, bob: 0 };
    case 'sit': { const w = s(pose.t * 3) * 0.35; return { lean: -0.05, legs: [[1.5, -1.5 + w], [1.4, -1.35 - w]], arms: [[0.4, 0.2], [0.5, 0.1]], lift: 0, bob: 0 }; }
    case 'point': { const w = s(pose.t * 5) * 0.12; return { lean: 0, legs: [[0.08, 0], [-0.08, 0]], arms: [[Math.PI * 0.62 + w, 0.05], [0.2, -0.3]], lift: 0, bob: 0 }; }
    default: return { lean: 0, legs: [[0.06, 0], [-0.06, 0]], arms: [[0.18, -0.25], [-0.12, -0.2]], lift: 0, bob: 0 };
  }
}

/** A whole child (or, with `scale` about 1.5, a grown-up). Faces right when `facing` is 1. */
export function kid(c: C, x: number, y: number, look: Look, pose: Pose, facing: 1 | -1 = 1, face: Face = {}, scale = 1): void {
  const r = rig(pose), z = SIZE, k = scale * (look.size ?? 1);
  c.save(); c.translate(x, y); c.scale(facing * k, k);
  const hip: Pt = [0, -z.hip - r.lift + r.bob * 0.5];
  const shoulder = add(hip, Math.PI - r.lean, z.torso);
  const legs = r.legs.map(([a, b]) => { const knee = add(hip, a, z.thigh); return [knee, add(knee, a + b, z.shin)] as [Pt, Pt]; });
  const arms = r.arms.map(([a, b]) => { const elbow = add(shoulder, a, z.upper); return [elbow, add(elbow, a + b, z.fore)] as [Pt, Pt]; });
  const far = shadeOf(look.bottom, 0.78), farTop = shadeOf(look.top, 0.78);

  // Far limbs in shade, then the body, then the near limbs.
  const leg = (i: 0 | 1, colour: string) => {
    const [knee, foot] = legs[i];
    limb(c, [hip, knee, foot], 9.5, colour);
    shoe(c, foot[0], foot[1], i ? shadeOf(look.shoes, 0.8) : look.shoes);
  };
  const arm = (i: 0 | 1, colour: string) => {
    const [elbow, hand] = arms[i];
    limb(c, [shoulder, elbow, hand], 7.5, colour);
    // A t-shirt stops above the elbow: bare arm below the sleeve.
    if (look.tee) {
      const sleeve: Pt = [shoulder[0] + (elbow[0] - shoulder[0]) * 0.55, shoulder[1] + (elbow[1] - shoulder[1]) * 0.55];
      line(c, i ? shadeOf(look.skin, 0.88) : look.skin, 5.8, [sleeve, elbow, hand]);
    }
    oval(c, INK, hand[0], hand[1], 4.6, 4.4); oval(c, i ? shadeOf(look.skin, 0.85) : look.skin, hand[0], hand[1], 3.4, 3.2);
  };
  if (pose.kind !== 'eyes' && pose.kind !== 'point') arm(1, farTop);
  leg(1, far); leg(0, look.bottom);
  torso(c, hip, shoulder, look);
  // The head follows the spine, a little more upright, except bent right over where it hangs down with the body.
  const head = add(shoulder, Math.PI - (r.lean > 1.5 ? r.lean : r.lean * 0.6), z.head);
  paintHead(c, head[0], head[1], look, pose.kind === 'eyes' ? { eyes: 'shut', mouth: 'grin', ...face } : face);
  if (pose.kind === 'eyes' || pose.kind === 'point') arm(1, farTop);
  arm(0, look.top);
  c.restore();
}

const shadeOf = (colour: string, k: number) => mix('#000000', colour, k);

function shoe(c: C, x: number, y: number, colour: string): void {
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(-4.5, -3.5); c.quadraticCurveTo(0, -6, 4, -3); c.quadraticCurveTo(9, -2, 9, 1.5); c.lineTo(-5.5, 1.5); c.closePath();
  c.fillStyle = colour; c.fill(); stroke(c, INK, 1.6);
  box(c, '#5d6765', -5.5, 1.2, 15, 1.8, 0.8);
  c.restore();
}

function torso(c: C, hip: Pt, shoulder: Pt, look: Look): void {
  const w = 12, dx = shoulder[0] - hip[0], dy = shoulder[1] - hip[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const shape = () => {
    c.beginPath();
    c.moveTo(hip[0] - nx * w, hip[1] - ny * w + 3);
    c.quadraticCurveTo(hip[0] - nx * (w + 2) + dx * 0.5, hip[1] - ny * (w + 2) + dy * 0.5, shoulder[0] - nx * (w - 1), shoulder[1] - ny * (w - 1));
    c.quadraticCurveTo(shoulder[0] + dx / len * 5, shoulder[1] + dy / len * 5, shoulder[0] + nx * (w - 1), shoulder[1] + ny * (w - 1));
    c.quadraticCurveTo(hip[0] + nx * (w + 2) + dx * 0.5, hip[1] + ny * (w + 2) + dy * 0.5, hip[0] + nx * w, hip[1] + ny * w + 3);
    c.closePath();
  };
  shape(); c.fillStyle = rgrad(c, shoulder[0], (hip[1] + shoulder[1]) / 2, 30, [[0, mix(look.top, '#ffffff', 0.18)], [0.6, look.top], [1, shadeOf(look.top, 0.75)]], shoulder[0] + 6, shoulder[1] + 4); c.fill();
  if (look.stripes) {
    c.save(); shape(); c.clip();
    for (let k = 0.2; k < 1; k += 0.22) line(c, look.stripes, 3.2, [[hip[0] + dx * k - nx * 20, hip[1] + dy * k - ny * 20], [hip[0] + dx * k + nx * 20, hip[1] + dy * k + ny * 20]]);
    c.restore();
  }
  if (look.print) {
    const mx = hip[0] + dx * 0.55 + 2, my = hip[1] + dy * 0.55;
    c.save(); shape(); c.clip(); shirtPrint(c, look.print, mx, my); c.restore();
  }
  shape(); stroke(c, INK, 1.9);
}

/** A small picture on the front of a shirt, about 14 px across. */
function shirtPrint(c: C, print: NonNullable<KidLook['print']>, x: number, y: number): void {
  c.save(); c.translate(x, y);
  if (print === 'sponge') {
    // A cheerful yellow sponge: square, holey, big eyes, two front teeth.
    box(c, INK, -7.5, -8, 15, 16, 2); box(c, '#fff06a', -6.5, -7, 13, 14, 1.5);
    for (const [hx, hy] of [[-4, 4], [4, 3], [-3, -5], [5, -5]] as const) oval(c, '#c9b83a', hx, hy, 1, 1);
    for (const ex of [-2.4, 2.4]) { oval(c, '#ffffff', ex, -2, 2.3, 2.5); oval(c, '#3a8fd0', ex, -2, 1.1, 1.2); oval(c, INK, ex, -2, 0.5, 0.5); }
    c.beginPath(); c.arc(0, 1.8, 3.4, 0.2, Math.PI - 0.2); stroke(c, INK, 0.9);
    box(c, '#ffffff', -1.4, 4.2, 1.3, 1.5); box(c, '#ffffff', 0.2, 4.2, 1.3, 1.5);
    box(c, '#8a5a2a', -6.5, 5.5, 13, 1.5);
  } else if (print === 'hedgehog') {
    // A blue hedgehog head with swept-back spikes, a white eye and a peach muzzle.
    c.beginPath(); c.moveTo(-8, -2); c.lineTo(-3, -8); c.lineTo(-1, -5); c.lineTo(3, -9); c.lineTo(4, -4); c.lineTo(8, -3);
    c.quadraticCurveTo(8, 6, 1, 7); c.quadraticCurveTo(-5, 7, -7, 3); c.lineTo(-10, 4); c.closePath();
    c.fillStyle = '#2f62d9'; c.fill(); stroke(c, INK, 1);
    oval(c, '#ffffff', 3, -1, 2.8, 2.4); oval(c, '#3fae52', 3.8, -1, 1.1, 1.3); oval(c, INK, 4, -1, 0.5, 0.6);
    oval(c, '#f4c79c', 4, 4, 3.2, 2); oval(c, INK, 6.6, 3.2, 0.8, 0.7);
  } else if (print === 'star') {
    c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
    c.fillStyle = '#fff3a0'; c.fill(); stroke(c, INK, 0.9);
  } else {
    // A little green dinosaur.
    c.beginPath(); c.moveTo(-8, 5); c.quadraticCurveTo(-6, -2, 0, -2); c.lineTo(3, -7); c.quadraticCurveTo(8, -8, 7, -4); c.lineTo(4, -3); c.quadraticCurveTo(6, 3, 3, 5); c.closePath();
    c.fillStyle = '#5fb04a'; c.fill(); stroke(c, INK, 0.9); oval(c, INK, 5.5, -5.8, 0.6, 0.6);
  }
  c.restore();
}

/**
 * A child's head centred on (x, y), turned to the right: the same face as Carl-Otto's on his bike, with this look's
 * hair, extras and expression.
 */
export function paintHead(c: C, x: number, y: number, look: Look, face: Face = {}): void {
  c.save(); c.translate(x, y);
  const hairBack = look.helmet ? null : look.hair;
  if (hairBack && (look.style === 'long' || look.style === 'pigtails')) {
    if (look.style === 'long') { c.beginPath(); c.moveTo(-13, -8); c.quadraticCurveTo(-20, 12, -12, 24); c.lineTo(2, 20); c.quadraticCurveTo(-4, 6, -4, -6); c.closePath(); c.fillStyle = hairBack; c.fill(); stroke(c, INK, 1.4); }
    else for (const [px, py] of [[-15, 4], [4, -18]] as const) { oval(c, INK, px, py, 7.6, 6.6); oval(c, hairBack, px, py, 6.2, 5.2); }
  }
  const faceShape = () => {
    c.beginPath(); c.moveTo(-14, -2); c.bezierCurveTo(-15, -14, -2, -19, 8, -16);
    c.bezierCurveTo(14, -13, 16, -8, 15.5, -4); c.quadraticCurveTo(19.5, -1, 16, 2.5);
    c.bezierCurveTo(16, 10, 9, 15, 1, 14.5); c.bezierCurveTo(-8, 14, -14, 8, -14, -2); c.closePath();
  };
  faceShape(); c.fillStyle = rgrad(c, 2, 0, 20, [[0, mix(look.skin, '#fff4e4', 0.3)], [0.6, look.skin], [1, shadeOf(look.skin, 0.82)]], 9, -4); c.fill();
  faceShape(); stroke(c, INK, 1.8);
  // Ear, cheek, eyes and mouth.
  oval(c, shadeOf(look.skin, 0.92), -4, 1, 3.6, 4.6); line(c, shadeOf(look.skin, 0.7), 1, [[-5, -1], [-3, 1], [-4.6, 3]]);
  const eyes = face.eyes ?? 'open';
  if (eyes === 'shut') line(c, INK, 1.5, [[7.5, -2], [9.5, -3.4], [11.8, -2]]);
  else if (eyes === 'wide') { oval(c, '#ffffff', 9.8, -2.5, 2.8, 3.3); stroke(c, INK, 0.9); oval(c, INK, 10.3, -2.2, 1.4, 1.8); }
  else { oval(c, INK, 9.5, -2, 1.7, 2.2); oval(c, '#ffffff', 10.1, -2.9, 0.65, 0.65); }
  oval(c, 'rgba(236, 120, 110, 0.35)', 9, 4.5, 3.6, 2.4);
  const mouth = face.mouth ?? 'smile';
  if (mouth === 'open') { oval(c, '#7a2e2a', 12.4, 8.6, 2.6, 3.2); oval(c, '#e2867a', 12.4, 10, 1.6, 1.2); }
  else if (mouth === 'grin') { c.beginPath(); c.moveTo(8.5, 7.5); c.quadraticCurveTo(12, 12, 15.2, 7); c.closePath(); c.fillStyle = '#7a2e2a'; c.fill(); stroke(c, '#5a2420', 0.8); box(c, '#ffffff', 9.6, 7.4, 4.6, 1.3, 0.5); }
  else line(c, '#a05a48', 1.3, [[9, 8], [11.5, 9], [14, 7.6]]);
  if (look.extra === 'freckles') for (const [fx, fy] of [[6, 3], [8, 5.4], [10.6, 3.6], [12.4, 5.6]] as const) oval(c, shadeOf(look.skin, 0.72), fx, fy, 0.6, 0.6);

  if (look.helmet) helmet(c);
  else hairFront(c, look);
  if (look.extra === 'glasses') {
    c.beginPath(); c.arc(10, -2, 4.2, 0, Math.PI * 2); stroke(c, look.extraColour ?? INK, 1.5);
    line(c, look.extraColour ?? INK, 1.3, [[5.8, -2.6], [-3, -3]]);
    oval(c, 'rgba(255, 255, 255, 0.35)', 11.4, -3.4, 1.2, 0.8);
  }
  if (look.extra === 'cap') {
    const cap = look.extraColour ?? '#d63c34';
    c.beginPath(); c.moveTo(-14, -8); c.bezierCurveTo(-14, -20, 2, -24, 12, -17); c.lineTo(12, -11); c.quadraticCurveTo(0, -14, -14, -8); c.closePath();
    c.fillStyle = cap; c.fill(); stroke(c, INK, 1.6);
    c.beginPath(); c.moveTo(10, -13); c.quadraticCurveTo(20, -14, 25, -10); c.quadraticCurveTo(18, -8, 10, -10); c.closePath(); c.fillStyle = shadeOf(cap, 0.8); c.fill(); stroke(c, INK, 1.4);
    oval(c, '#ffffff', -1, -21, 2, 1.6);
  }
  if (look.extra === 'bow') {
    const bow = look.extraColour ?? '#f06d9a', bx = look.style === 'bun' ? -2 : -8, by = look.style === 'bun' ? -26 : -14;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + s * 7, by - 4); c.lineTo(bx + s * 7, by + 4); c.closePath(); c.fillStyle = bow; c.fill(); stroke(c, INK, 1.2); }
    oval(c, shadeOf(bow, 0.8), bx, by, 2.2, 2.2);
  }
  c.restore();
}

function hairFront(c: C, look: KidLook): void {
  const h = look.hair, dark = shadeOf(h, 0.72);
  if (look.style === 'curly') {
    for (const [px, py, r] of [[-12, -8, 6], [-8, -15, 6.5], [0, -18, 6.5], [8, -16, 6], [13, -11, 4.6], [-14, -1, 5]] as const) { oval(c, INK, px, py, r + 1.3, r + 1.3); }
    for (const [px, py, r] of [[-12, -8, 6], [-8, -15, 6.5], [0, -18, 6.5], [8, -16, 6], [13, -11, 4.6], [-14, -1, 5]] as const) { oval(c, h, px, py, r, r); oval(c, mix(h, '#ffffff', 0.18), px + 1.5, py - 2, r * 0.35, r * 0.3); }
    return;
  }
  // A cap of hair over the crown with a fringe, the same shape for every style; buns and pigtails add to it.
  c.beginPath(); c.moveTo(-14.5, 0); c.bezierCurveTo(-17, -14, -4, -22, 6, -19);
  c.bezierCurveTo(13, -17, 17, -11, 15.5, -7); c.quadraticCurveTo(10, -10, 6, -8); c.quadraticCurveTo(0, -12, -6, -5); c.lineTo(-8, 1); c.closePath();
  c.fillStyle = h; c.fill(); stroke(c, INK, 1.6);
  line(c, mix(h, '#ffffff', 0.3), 1.6, [[-8, -14], [0, -17.5], [7, -16]]);
  line(c, dark, 1, [[-2, -9], [2, -13]]);
  if (look.style === 'bun') { oval(c, INK, -1, -23, 7.4, 6.4); oval(c, h, -1, -23, 6, 5); oval(c, mix(h, '#ffffff', 0.2), 1, -25, 2, 1.4); }
}

function helmet(c: C): void {
  const shape = () => {
    c.beginPath(); c.moveTo(-17, -3); c.bezierCurveTo(-19, -18, -6, -27, 6, -26);
    c.bezierCurveTo(18, -25, 24, -16, 23, -8); c.lineTo(20, -6.5); c.quadraticCurveTo(4, -11, -17, -3); c.closePath();
  };
  // A little blond hair at the back and over the brow.
  c.beginPath(); c.moveTo(-14, -6); c.quadraticCurveTo(-17, 3, -12, 8); c.quadraticCurveTo(-10, 2, -7, 1); c.quadraticCurveTo(-9, -4, -7, -8); c.closePath();
  c.fillStyle = '#e1b95c'; c.fill(); stroke(c, '#8f6a2b', 1);
  shape(); c.fillStyle = rgrad(c, 2, -12, 26, [[0, '#6cc8f0'], [0.55, '#2d97d0'], [1, '#1b6a9c']], 10, -22); c.fill();
  c.save(); shape(); c.clip();
  for (const [vx, vy, rot] of [[-6, -18, -0.5], [3, -21, -0.1], [12, -19, 0.35]] as const) {
    c.save(); c.translate(vx, vy); c.rotate(rot); box(c, '#174e72', -2, -6, 4, 11, 2); c.restore();
  }
  c.restore();
  shape(); stroke(c, INK, 1.8);
  c.beginPath(); c.moveTo(-12, -16); c.quadraticCurveTo(-4, -24, 8, -24); stroke(c, 'rgba(255, 255, 255, 0.6)', 2);
  line(c, 'rgba(37, 51, 49, 0.8)', 1.1, [[2, -9], [-3, 11], [-10, -5]]);
}

/** Two feet sticking out sideways (from a bush), toes wiggling. */
export function feet(c: C, x: number, y: number, look: KidLook, t: number, facing: 1 | -1 = 1): void {
  c.save(); c.translate(x, y); c.scale(facing, 1);
  for (const [dy, k] of [[-7, 0.8], [0, 1]] as const) {
    const wig = Math.sin(t * 9 + dy) * 0.25;
    limb(c, [[-14, dy], [2, dy]], 8.5, k < 1 ? shadeOf(look.bottom, 0.8) : look.bottom);
    c.save(); c.translate(6, dy); c.rotate(-Math.PI / 2 + wig);
    c.beginPath(); c.moveTo(-4.5, -3.5); c.quadraticCurveTo(0, -6, 4, -3); c.quadraticCurveTo(9, -2, 9, 1.5); c.lineTo(-5.5, 1.5); c.closePath();
    c.fillStyle = k < 1 ? shadeOf(look.shoes, 0.8) : look.shoes; c.fill(); stroke(c, INK, 1.5);
    c.restore();
  }
  c.restore();
}

/** An arm waving up out of something (the cardboard box's flap). */
export function wavingArm(c: C, x: number, y: number, look: KidLook, t: number): void {
  const a = Math.sin(t * 8) * 0.45;
  const elbow: Pt = [x + Math.sin(a) * 12, y - Math.cos(a) * 12], hand: Pt = [elbow[0] + Math.sin(a * 1.6) * 12, elbow[1] - Math.cos(a * 1.6) * 12];
  limb(c, [[x, y + 6], elbow, hand], 7.5, look.top);
  oval(c, INK, hand[0], hand[1], 5, 4.8); oval(c, look.skin, hand[0], hand[1], 3.8, 3.6);
}
