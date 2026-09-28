import { rect, seg, shade } from './pixel';

// Side-view fighters as jointed puppets: a pose is a handful of joint angles, drawn with chunky
// outlined pixel limbs, so every move animates from the same few parts.

export interface Look {
  skin: string;
  hair: string;
  jacket: string;
  arms: string;
  trousers: string;
  shoes: string;
  /** Standing height in pixels. */
  height: number;
  /** Torso depth and limb thickness in pixels. */
  build: number;
  limb: number;
  cap?: string;
  bald?: boolean;
  shades?: boolean;
  chain?: boolean;
  stripe?: string;
}

/** Angles in radians. Limbs are measured from hanging straight down, positive towards the facing side. */
export interface Pose {
  lean: number;
  head: number;
  /** Front and back leg: thigh angle and knee bend (negative folds the shin back). */
  legs: [[number, number], [number, number]];
  /** Front and back arm: shoulder angle and elbow bend (positive folds the forearm up). */
  arms: [[number, number], [number, number]];
  /** Whole-body rotation: 0 upright, -π/2 flat on the back. */
  rot: number;
}

export const LOOKS = {
  player: { skin: '#e0ae8a', hair: '#263d45', jacket: '#298f9d', arms: '#edbd59', trousers: '#26343f', shoes: '#f1ede2', height: 44, build: 9, limb: 4, cap: '#1d3038' },
  runner: { skin: '#d9a985', hair: '#3a2f2c', jacket: '#985c57', arms: '#7e4a46', trousers: '#2c2f3a', shoes: '#e9e4d8', height: 43, build: 9, limb: 4, stripe: '#e9e4d8' },
  bruiser: { skin: '#c9967a', hair: '#2a2420', jacket: '#7b586f', arms: '#644659', trousers: '#262a33', shoes: '#191b1f', height: 47, build: 12, limb: 5, bald: true },
  boss: { skin: '#d2a07e', hair: '#1b1b1f', jacket: '#a34254', arms: '#86343f', trousers: '#1f2129', shoes: '#191b1f', height: 54, build: 14, limb: 6, shades: true, chain: true },
} satisfies Record<string, Look>;

const OUTLINE = '#141820';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const POSES = {
  idle: (t: number): Pose => ({ lean: 0.06 + Math.sin(t * 3) * 0.02, head: 0, legs: [[0.22, -0.25], [-0.2, -0.12]], arms: [[0.55, 1.9], [0.3, 1.8]], rot: 0 }),
  loiter: (t: number): Pose => ({ lean: -0.02, head: Math.sin(t * 0.7) * 0.08, legs: [[0.08, -0.05], [-0.08, -0.05]], arms: [[0.1, 0.4 + Math.sin(t * 2) * 0.05], [-0.1, 0.3]], rot: 0 }),
  walk: (phase: number): Pose => {
    const s = Math.sin(phase), c = Math.cos(phase);
    return {
      lean: 0.08, head: 0,
      legs: [[0.5 * s, -0.15 - 0.8 * Math.max(0, c)], [-0.5 * s, -0.15 - 0.8 * Math.max(0, -c)]],
      arms: [[0.5 + 0.12 * s, 1.8], [0.3 - 0.15 * s, 1.7]], rot: 0,
    };
  },
  /** Progress t from 0 to 1 through a punch of the combo. */
  punch: (combo: number, t: number): Pose => {
    const e = t < 0.3 ? t / 0.3 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
    const stance: Pose['legs'] = [[0.38, -0.12], [-0.38, -0.1]];
    if (combo === 1) return { lean: 0.1 + 0.1 * e, head: 0, legs: stance, arms: [[lerp(0.55, 1.57, e), lerp(1.9, 0.05, e)], [0.3, 1.8]], rot: 0 };
    if (combo === 2) return { lean: 0.12 + 0.18 * e, head: 0, legs: stance, arms: [[lerp(0.55, 0.2, e), 2], [lerp(0.3, 1.57, e), lerp(1.8, 0.05, e)]], rot: 0 };
    return { lean: lerp(0.15, -0.08, e), head: -0.1 * e, legs: [[0.3, lerp(-0.4, -0.05, e)], [-0.35, lerp(-0.3, 0, e)]], arms: [[lerp(0.3, 2.7, e), lerp(1.6, 0.35, e)], [0.2, 1.9]], rot: 0 };
  },
  jump: (): Pose => ({ lean: 0.12, head: 0, legs: [[1.0, -1.7], [0.3, -1.4]], arms: [[1.2, 1.2], [0.9, 1.0]], rot: 0 }),
  kick: (): Pose => ({ lean: -0.28, head: 0.1, legs: [[1.5, -0.04], [0.2, -1.8]], arms: [[-0.5, 0.7], [1.9, 0.5]], rot: 0 }),
  dodge: (): Pose => ({ lean: 0.62, head: 0.2, legs: [[0.95, -1.35], [-0.85, -0.35]], arms: [[0.9, 1.9], [0.45, 1.9]], rot: 0 }),
  hurt: (): Pose => ({ lean: -0.38, head: -0.3, legs: [[0.3, -0.12], [-0.12, -0.1]], arms: [[-0.6, 0.4], [-0.9, 0.25]], rot: 0 }),
  /** Falling back and lying still; fall runs from 0 to 1. */
  down: (fall: number): Pose => ({ lean: -0.2, head: -0.2, legs: [[0.35, -0.3], [0.1, -0.1]], arms: [[-0.5 - fall, 0.4], [-0.8 - fall * 0.8, 0.2]], rot: -Math.PI / 2 * Math.min(1, fall) }),
  /** Getting up from a crouch; t runs from 0 to 1. */
  rise: (t: number): Pose => ({ lean: lerp(0.55, 0.06, t), head: 0, legs: [[lerp(1.25, 0.22, t), lerp(-2.3, -0.25, t)], [lerp(0.1, -0.2, t), lerp(-2.0, -0.12, t)]], arms: [[lerp(1.0, 0.55, t), lerp(0.6, 1.9, t)], [lerp(0.7, 0.3, t), lerp(0.8, 1.8, t)]], rot: 0 }),
  windup: (t: number): Pose => ({ lean: -0.14 - 0.04 * Math.sin(t * 30), head: 0, legs: [[0.4, -0.2], [-0.42, -0.1]], arms: [[0.9, 0.9], [-0.55, 2.3]], rot: 0 }),
  strike: (): Pose => ({ lean: 0.32, head: 0.05, legs: [[0.45, -0.15], [-0.45, -0.05]], arms: [[0.3, 1.9], [1.6, 0.08]], rot: 0 }),
  cheer: (t: number): Pose => ({ lean: -0.05, head: -0.15, legs: [[0.15, -0.1], [-0.15, -0.1]], arms: [[3.0 + Math.sin(t * 8) * 0.12, 0.2], [0.4, 1.6]], rot: 0 }),
};

type Pt = [number, number];
const dir = (a: number): Pt => [Math.sin(a), Math.cos(a)];

/**
 * Draws a fighter with the feet at (x, ground) and the body raised z pixels, facing left or right.
 * A tint replaces every colour, for the white hit flash and the dodge's afterimages.
 */
export function drawFighter(
  c: CanvasRenderingContext2D, x: number, ground: number, z: number, facing: 1 | -1, look: Look, pose: Pose,
  opts: { tint?: string; parcel?: boolean; satchel?: boolean } = {},
): void {
  const s = look.height / 40;
  const thigh = 9 * s, shin = 9 * s, torso = 13 * s, upper = 7 * s, fore = 7 * s, headH = Math.round(8 * s), headW = Math.round(7 * s + (look.build > 9 ? 1 : 0));
  // Joints relative to the hip, with y growing downwards.
  const add = (p: Pt, a: number, len: number): Pt => { const d = dir(a); return [p[0] + d[0] * len, p[1] + d[1] * len]; };
  const hip: Pt = [0, 0];
  const legs = pose.legs.map(([a, b]) => { const knee = add(hip, a, thigh); return [knee, add(knee, a + b, shin)] as [Pt, Pt]; });
  const shoulder: Pt = [Math.sin(pose.lean) * torso, -Math.cos(pose.lean) * torso];
  const arms = pose.arms.map(([a, b]) => { const elbow = add(shoulder, a, upper); return [elbow, add(elbow, a + b, fore)] as [Pt, Pt]; });
  const headAngle = pose.lean + pose.head;
  const head: Pt = [shoulder[0] + Math.sin(headAngle) * (headH / 2 + 1), shoulder[1] - Math.cos(headAngle) * (headH / 2 + 1)];
  // Rotate the whole body for falls, then rest the lowest point on the ground.
  const cr = Math.cos(pose.rot), sr = Math.sin(pose.rot);
  const turn = (p: Pt): Pt => [p[0] * cr - p[1] * sr, p[0] * sr + p[1] * cr];
  const all = [hip, shoulder, head, ...legs.flat(), ...arms.flat()].map(turn);
  const lying = Math.abs(pose.rot) > 0.3;
  const low = Math.max(...all.map(p => p[1])) + (lying ? look.build / 2 : 1);
  const ox = x, oy = ground - z - low;
  const at = (p: Pt): Pt => { const q = turn(p); return [ox + q[0] * facing, oy + q[1]]; };

  const tint = opts.tint;
  const col = (colour: string) => tint ?? colour;
  const limb = (a: Pt, b: Pt, w: number, fill: string, outline = true) => {
    const p = at(a), q = at(b);
    if (outline) seg(c, p[0], p[1], q[0], q[1], w + 2, tint ? tint : OUTLINE);
    seg(c, p[0], p[1], q[0], q[1], w, col(fill));
  };
  const back = (colour: string) => shade(colour, 0.78);
  const L = look.limb, A = Math.max(3, L - 1);

  // Back arm and leg, then the torso, head, and the near-side limbs.
  const [bElbow, bHand] = arms[1], [fElbow, fHand] = arms[0];
  const [bKnee, bFoot] = legs[1], [fKnee, fFoot] = legs[0];
  limb(shoulder, bElbow, A, back(look.arms));
  limb(bElbow, bHand, A, back(look.arms));
  limb(bHand, bHand, A, back(look.skin));
  limb(hip, bKnee, L, back(look.trousers));
  limb(bKnee, bFoot, L, back(look.trousers));
  shoe(c, at(bFoot), facing, pose.rot, col(back(look.shoes)), L, !tint);
  if (opts.satchel) {
    const p = at([-look.build / 2 - 1, -torso * 0.3]);
    rect(c, p[0] - 4, p[1] - 3, 8, 7, tint ? tint : OUTLINE);
    rect(c, p[0] - 3, p[1] - 2, 6, 5, col('#e0a93f'));
  }
  limb(hip, shoulder, look.build, look.jacket);
  if (!tint) {
    // Light from the right: a lit edge on the side facing the sun.
    const p = at([look.build / 2 - 1, 0]), q = at([shoulder[0] + look.build / 2 - 1, shoulder[1]]);
    if (!lying) seg(c, p[0], p[1] - 1, q[0], q[1] + 1, 1, facing > 0 ? shade(look.jacket, 1.18) : shade(look.jacket, 0.82));
    const belt = at([0, -1]);
    rect(c, belt[0] - look.build / 2, belt[1] - 1, look.build, 2, shade(look.trousers, 0.8));
    if (look.chain) for (let k = 0; k < 5; k++) { const q2 = at([look.build * 0.3 - k * 0.8, -torso * 0.72 + k * 1.4]); rect(c, q2[0], q2[1], 1, 1, '#e5c35a'); }
    if (look.stripe) { const a1 = at([-look.build / 2 + 1, -torso + 2]), a2 = at([-look.build / 2 + 1, -2]); seg(c, a1[0], a1[1], a2[0], a2[1], 1, look.stripe); }
  }
  if (opts.parcel) {
    // The package rides on the courier's back, strapped on so both fists are free.
    const p = at([-look.build / 2 - 4, -torso * 0.55]);
    rect(c, p[0] - 5, p[1] - 5, 11, 11, tint ? tint : OUTLINE);
    rect(c, p[0] - 4, p[1] - 4, 9, 9, col('#b97c3e'));
    rect(c, p[0] - 4, p[1] - 4, 9, 3, col('#dfad59'));
    rect(c, p[0], p[1] - 4, 2, 9, col('#fff0b0'));
  }
  drawHead(c, at(head), facing, headW, headH, look, pose.rot, tint);
  limb(hip, fKnee, L, look.trousers);
  limb(fKnee, fFoot, L, look.trousers);
  if (look.stripe && !tint) { const p = at(hip), q = at(fKnee); seg(c, p[0], p[1], q[0], q[1], 1, look.stripe); }
  shoe(c, at(fFoot), facing, pose.rot, col(look.shoes), L, !tint);
  limb(shoulder, fElbow, A, look.arms);
  limb(fElbow, fHand, A, look.arms);
  const h = at(fHand);
  rect(c, h[0] - 2, h[1] - 2, 4, 4, tint ? tint : OUTLINE);
  rect(c, h[0] - 1, h[1] - 1, 3, 3, col(look.skin));
}

function shoe(c: CanvasRenderingContext2D, p: Pt, facing: 1 | -1, rot: number, colour: string, w: number, outline: boolean): void {
  const lying = Math.abs(rot) > 0.3;
  const x = Math.round(p[0]), y = Math.round(p[1]);
  if (lying) {
    if (outline) rect(c, x - 2, y - 3, 3, 6, OUTLINE);
    rect(c, x - 1, y - 2, 2, 4, colour);
    return;
  }
  const len = w + 2;
  const x0 = facing > 0 ? x - 2 : x - len + 2;
  if (outline) rect(c, x0 - 1, y - 2, len + 2, 4, OUTLINE);
  rect(c, x0, y - 1, len, 2, colour);
}

function drawHead(c: CanvasRenderingContext2D, p: Pt, facing: 1 | -1, w: number, h: number, look: Look, rot: number, tint?: string): void {
  const x = Math.round(p[0] - w / 2), y = Math.round(p[1] - h / 2);
  rect(c, x - 1, y - 1, w + 2, h + 2, tint ?? OUTLINE);
  if (tint) { rect(c, x, y, w, h, tint); return; }
  rect(c, x, y, w, h, look.skin);
  const lying = Math.abs(rot) > 0.3;
  // Details on the face side; lying down, the face turns up.
  const front = (dx: number) => facing > 0 ? x + w - 1 - dx : x + dx;
  if (lying) {
    const up = rot < 0 ? -1 : 1;
    rect(c, facing > 0 ? x : x + w - 3, y, 3, h, look.bald ? shade(look.skin, 0.85) : look.hair);
    rect(c, x + Math.floor(w / 2), y + (up < 0 ? 1 : h - 2), 1, 1, '#1a1a1e');
    return;
  }
  if (look.cap) {
    rect(c, x - 1, y - 1, w + 2, 3, look.cap);
    rect(c, facing > 0 ? x + w - 1 : x - 3, y + 1, 4, 1, look.cap);
  } else if (look.bald) {
    rect(c, x, y, w, 1, shade(look.skin, 1.1));
    rect(c, facing > 0 ? x : x + w - 2, y + 1, 2, 3, shade(look.skin, 0.82));
  } else {
    rect(c, x, y, w, 2, look.hair);
    rect(c, facing > 0 ? x : x + w - 3, y, 3, h - 3, look.hair);
  }
  if (look.shades) rect(c, front(3), y + 3, 4, 2, '#101014');
  else rect(c, front(1), y + 3, 1, 1, '#1a1a1e');
  rect(c, facing > 0 ? x + w : x - 1, y + 4, 1, 1, look.skin);
  rect(c, front(1), y + h - 2, 2, 1, shade(look.skin, 0.72));
  rect(c, facing > 0 ? x + 1 : x + w - 3, y + 3, 2, 3, shade(look.skin, 0.85));
}
