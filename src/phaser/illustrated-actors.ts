import type { Look, Pose } from '../side/fighters';
import type { Prop } from '../side/gods-cast';
import { mix, shade } from '../side/pixel';

type Point = [number, number];
const INK = '#26312e';
function oval(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke = ''): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = .45; c.stroke(); }
}
function line(c: CanvasRenderingContext2D, points: Point[], colour: string, width: number): void {
  c.beginPath(); c.moveTo(...points[0]); for (const p of points.slice(1)) c.lineTo(...p);
  c.lineWidth = width; c.strokeStyle = colour; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, radius = 1): void {
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill();
  c.lineWidth = .45; c.strokeStyle = INK; c.stroke();
}

/** The existing joint poses, redrawn with curved silhouettes, cloth shading and human faces. */
export function drawIllustratedActor(c: CanvasRenderingContext2D, x: number, ground: number, facing: 1 | -1, look: Look, pose: Pose, parcel = false, satchel = false): void {
  const s = look.height / 40, thigh = 9 * s, shin = 9 * s, torso = 13 * s;
  const add = (p: Point, angle: number, length: number): Point => [p[0] + Math.sin(angle) * length, p[1] + Math.cos(angle) * length];
  const hip: Point = [0, 0], shoulder: Point = [Math.sin(pose.lean) * torso, -Math.cos(pose.lean) * torso];
  const legs = pose.legs.map(([a, b]) => { const knee = add(hip, a, thigh); return [knee, add(knee, a + b, shin)] as [Point, Point]; });
  const arms = pose.arms.map(([a, b]) => { const elbow = add(shoulder, a, 7 * s); return [elbow, add(elbow, a + b, 7 * s)] as [Point, Point]; });
  const low = Math.max(...legs.map(([, foot]) => foot[1])) + 1.2;
  c.save(); c.translate(x, ground); c.scale(facing * 1.18, 1.18); c.translate(0, -low);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const leg = (index: number) => {
    const [knee, foot] = legs[index], colour = index ? shade(look.trousers, .78) : look.trousers;
    line(c, [hip, knee, foot], INK, look.limb + 1.2);
    line(c, [hip, knee, foot], colour, look.limb + .3);
    line(c, [[knee[0] - .7, knee[1] + 1], [foot[0] - .7, foot[1] - 2]], mix(colour, '#e9e5d8', .16), .6);
    c.save(); c.translate(...foot);
    c.beginPath(); c.moveTo(-2.4, -1.7); c.quadraticCurveTo(-1, -2.6, 1, -1.7); c.quadraticCurveTo(4, -1.1, 4.5, .5); c.lineTo(-2.5, .5); c.closePath();
    c.fillStyle = index ? shade(look.shoes, .8) : look.shoes; c.fill(); c.strokeStyle = INK; c.lineWidth = .5; c.stroke();
    line(c, [[-2.2, .7], [4.1, .7]], mix(look.shoes, '#ebe9e0', .4), .65); c.restore();
  };
  const arm = (index: number) => {
    const [elbow, hand] = arms[index], colour = index ? shade(look.arms, .78) : look.arms;
    line(c, [shoulder, elbow, hand], INK, look.limb + .8);
    line(c, [shoulder, elbow, hand], colour, look.limb);
    if (look.shortSleeves) {
      const sleeve: Point = [shoulder[0] * .45 + elbow[0] * .55, shoulder[1] * .45 + elbow[1] * .55];
      line(c, [sleeve, elbow, hand], index ? shade(look.skin, .87) : look.skin, look.limb - .45);
      line(c, [shoulder, [sleeve[0] - .1, sleeve[1] - .1]], colour, look.limb + .3);
    }
    oval(c, hand[0], hand[1], 1.6, 1.7, look.skin, INK);
  };
  leg(1); arm(1);
  if (parcel) {
    box(c, -look.build / 2 - 8, -torso + 2, 8.5, 11.5, '#ae8150', 1.2);
    line(c, [[-look.build / 2 - 4, -torso + 2.5], [-look.build / 2 - 4, -torso + 13]], '#e4c38b', 1.9);
    line(c, [[-look.build / 2 - 7.5, -torso + 6], [-look.build / 2, -torso + 6]], '#795c40', .5);
  }
  leg(0);
  const w = look.build / 2;
  c.beginPath(); c.moveTo(-w, -.5); c.bezierCurveTo(-w - .8, -5, shoulder[0] - w - .3, shoulder[1] + 3, shoulder[0] - w + 1, shoulder[1]);
  c.quadraticCurveTo(shoulder[0], shoulder[1] - 1.7, shoulder[0] + w - .5, shoulder[1]);
  c.bezierCurveTo(shoulder[0] + w + 1, shoulder[1] + 3, w + .7, -4, w, -.5); c.closePath();
  const cloth = c.createLinearGradient(-w, 0, w + 3, 0); cloth.addColorStop(0, shade(look.jacket, .74)); cloth.addColorStop(.4, look.jacket); cloth.addColorStop(1, mix(look.jacket, '#f3e5c6', .16));
  c.fillStyle = cloth; c.fill(); c.strokeStyle = INK; c.lineWidth = .6; c.stroke();
  line(c, [[-w + 1, -.6], [w - .7, -.6]], shade(look.jacket, .66), .65);
  line(c, [[shoulder[0] - 1, shoulder[1] + 5], [0, -3], [w - 1, -2]], shade(look.jacket, .86), .45);
  if (!look.shortSleeves) line(c, [[shoulder[0] + 1, shoulder[1] + 1], [1, -1]], shade(look.jacket, .65), .5);
  if (look.stripe) line(c, [[shoulder[0] + 1, shoulder[1] + 3], [2, -1]], look.stripe, .8);
  if (satchel) {
    line(c, [[shoulder[0] + 3, shoulder[1] + .6], [-w - 1, -2]], '#806146', 1.2);
    box(c, -w - 4.2, -4.5, 5.8, 5.8, '#c29759'); line(c, [[-w - 3.8, -2.3], [-w + 1.2, -2.3]], '#8c683f', .4);
  }
  const hx = shoulder[0] + Math.sin(pose.lean + pose.head) * 5, hy = shoulder[1] - 4.9;
  line(c, [[shoulder[0], shoulder[1] + .2], [hx, hy + 3]], look.skin, 3.7);
  c.save(); c.translate(hx, hy); c.rotate(pose.head * -.5);
  // A side-facing head: subtle nose, jaw, ear and swept hair, rather than pixel blocks.
  c.beginPath(); c.moveTo(-3, -2.8); c.bezierCurveTo(-2.5, -5.4, 3, -5.4, 3.5, -2.4);
  c.lineTo(3.2, -.6); c.lineTo(4.5, .25); c.quadraticCurveTo(4.8, .8, 3.6, 1.1);
  c.quadraticCurveTo(3.7, 3.7, 1, 4); c.quadraticCurveTo(-2.7, 3.4, -3.1, .6); c.closePath();
  const face = c.createLinearGradient(-3, 0, 5, 0); face.addColorStop(0, shade(look.skin, .83)); face.addColorStop(.65, look.skin); face.addColorStop(1, mix(look.skin, '#fff0d8', .2));
  c.fillStyle = face; c.fill(); c.strokeStyle = INK; c.lineWidth = .4; c.stroke();
  oval(c, -.7, .65, .9, 1.25, look.skin); line(c, [[-.8, .3], [-.4, .4], [-.55, 1]], shade(look.skin, .72), .3);
  line(c, [[1.5, -.7], [2.8, -.55]], look.hair, .5); oval(c, 2.45, .05, .3, .38, '#28322e');
  line(c, [[2.3, 2.4], [3.4, 2.2]], shade(look.skin, .57), .35);
  if (!look.bald) {
    c.beginPath(); c.moveTo(-3.1, 1); c.bezierCurveTo(-4.6, -2.3, -3, -5.8, .7, -5.2); c.bezierCurveTo(3.3, -5.4, 4.2, -3.8, 3.5, -2.5);
    c.quadraticCurveTo(1.6, -3.4, -.4, -1.5); c.lineTo(-1.5, -.2); c.lineTo(-1.8, 1.4); c.closePath();
    c.fillStyle = look.hair; c.fill();
    c.beginPath(); c.moveTo(-2.5, -3.3); c.quadraticCurveTo(0, -5, 2.8, -3.6); c.strokeStyle = look.fringe ?? mix(look.hair, '#e7d5ad', .2); c.lineWidth = .9; c.stroke();
  }
  if (look.cap) { box(c, -3.8, -4.8, 7.2, 2.1, look.cap, 1); line(c, [[0, -2.7], [4.5, -2.7]], look.cap, 1.2); }
  if (look.shades) { box(c, .2, -.6, 3.3, 1.5, '#20292a', .4); line(c, [[-1.4, -.3], [1, 0]], '#20292a', .35); }
  c.restore(); arm(0);
  c.restore();
}

export function drawIllustratedProp(c: CanvasRenderingContext2D, prop: Prop, x: number, y: number, facing: 1 | -1, time: number): void {
  c.save(); c.translate(x, y); c.scale(facing, 1);
  switch (prop) {
    case 'box': box(c, 7, -29, 15, 4, '#e6dbbc'); line(c, [[8, -26], [21, -26]], '#ac7950', .7); break;
    case 'scooter':
      line(c, [[7, -3], [25, -3], [24, -23]], '#647a78', 1.4); line(c, [[20, -23], [27, -23]], INK, 1.4);
      oval(c, 8, -2, 2, 2, INK); oval(c, 25, -2, 2, 2, INK); break;
    case 'rollator':
      line(c, [[10, -1], [11, -25], [23, -25], [24, -1]], '#859d9a', 1.8);
      box(c, 12, -16, 10, 5, '#94745d'); line(c, [[11, -24], [9, -24]], INK, 2);
      oval(c, 10, -2, 2, 2, INK); oval(c, 24, -2, 2, 2, INK); break;
    case 'guitar':
      oval(c, 12, -15, 6, 7, '#b9874d', INK); oval(c, 12, -23, 4.5, 5, '#c6955a', INK);
      line(c, [[12, -24], [12, -41]], '#6c4b35', 2.4); oval(c, 12, -18, 2, 2, '#3c332b');
      line(c, [[11.7, -12], [11.7, -41]], '#e7d6b4', .35); break;
    case 'dog':
      line(c, [[4, -29], [19, -15]], '#705c48', .65);
      oval(c, 24, -10, 8, 4, '#977248', INK); oval(c, 31, -15, 4, 4.3, '#a47c51', INK);
      oval(c, 30, -14, 1.5, 3.3, '#6a5038'); oval(c, 34, -14, 2.8, 1.4, '#b39370'); oval(c, 36, -14.4, .8, .65, INK);
      line(c, [[19, -8], [19, -2], [21, -2]], '#896644', 1.7); line(c, [[28, -8], [28, -2], [30, -2]], '#896644', 1.7);
      line(c, [[17, -11], [13, -14 + Math.sin(time * 8)]], '#896644', 2); break;
  }
  c.restore();
}
