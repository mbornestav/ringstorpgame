import { HEIGHT, WIDTH } from './layout';
import { disc, ellipse, mix, poly, rand, rect, shade, text, textWidth } from './pixel';
import { FLOOR_LIFT_X, LOBBY_EXIT_X, LOBBY_LIFT_X, TOP_FLOOR, type RoomView } from './interior-layout';
import type { Prop } from './gods-cast';

// The inside of Kurirgatan 28: entrance hall, the lift with its button panel, and one corridor per floor.

const WALL_TOP = 20, FLOOR_Y = 176;

/** Buttons on the lift panel, in the layout of the real one: the top floor alone, then pairs. */
export const PANEL_BUTTONS: Array<{ n: number; x: number; y: number }> = [
  { n: 8, x: 388, y: 92 },
  { n: 6, x: 388, y: 122 }, { n: 7, x: 430, y: 122 },
  { n: 4, x: 388, y: 152 }, { n: 5, x: 430, y: 152 },
  { n: 2, x: 388, y: 182 }, { n: 3, x: 430, y: 182 },
  { n: 0, x: 388, y: 212 }, { n: 1, x: 430, y: 212 },
];
export const BUTTON_R = 12;
export function panelHit(x: number, y: number): number | null {
  const hit = PANEL_BUTTONS.find(b => Math.hypot(b.x - x, b.y - y) <= BUTTON_R + 2);
  return hit ? hit.n : null;
}

const CORRIDOR_WALLS = ['#d9cfb8', '#cfd6c8', '#d8c8c0', '#c9d2d6', '#dcd3a8', '#cbc2d3', '#d5d0c8', '#c8d7cb', '#ddd0bd'];

export function ceiling(c: CanvasRenderingContext2D, t: number): void {
  rect(c, 0, 0, WIDTH, WALL_TOP, '#3b3a3f');
  rect(c, 0, WALL_TOP - 2, WIDTH, 2, '#22222a');
  for (let x = 60; x < WIDTH; x += 150) {
    rect(c, x, 4, 44, 6, '#f5edc8');
    rect(c, x - 1, 3, 46, 1, '#a9a58a');
    rect(c, x, 10, 44, 2, mix('#f5edc8', '#3b3a3f', 0.4 + Math.sin(t * 6 + x) * 0.02));
  }
}

function tiledFloor(c: CanvasRenderingContext2D, a: string, b: string): void {
  for (let y = FLOOR_Y; y < HEIGHT; y += 12) for (let x = 0, k = 0; x < WIDTH; x += 24, k++) {
    rect(c, x, y, 24, 12, (k + Math.floor((y - FLOOR_Y) / 12)) % 2 ? a : b);
  }
  rect(c, 0, FLOOR_Y, WIDTH, 3, '#4a463f');
  rect(c, 0, FLOOR_Y + 3, WIDTH, 1, '#8b857a');
}

function wall(c: CanvasRenderingContext2D, colour: string, seed: number): void {
  rect(c, 0, WALL_TOP, WIDTH, FLOOR_Y - WALL_TOP, colour);
  for (let i = 0; i < 260; i++) rect(c, Math.floor(rand(i, seed) * WIDTH), WALL_TOP + Math.floor(rand(i, seed + 1) * (FLOOR_Y - WALL_TOP)), 1, 1, rand(i, seed + 2) > 0.5 ? shade(colour, 0.94) : mix(colour, '#ffffff', 0.25));
  rect(c, 0, FLOOR_Y - 46, WIDTH, 46, shade(colour, 0.72));
  rect(c, 0, FLOOR_Y - 47, WIDTH, 2, mix(colour, '#ffffff', 0.4));
  for (let x = 0; x < WIDTH; x += 24) rect(c, x, FLOOR_Y - 45, 1, 44, shade(colour, 0.62));
}

/** Closed or open steel lift doors; through the gap you see whichever landing they open onto. */
function liftDoors(c: CanvasRenderingContext2D, x: number, open: number, beyond: string, floorLabel: string): void {
  const w = 56, top = 66, h = FLOOR_Y - top;
  rect(c, x - 4, top - 4, w + 8, h + 4, '#5e6265');
  rect(c, x - 3, top - 3, w + 6, 1, '#b4b9bb');
  rect(c, x, top, w, h, beyond);
  const half = Math.round((w / 2) * (1 - open));
  for (const side of [0, 1]) {
    const dx = side ? x + w - half : x;
    rect(c, dx, top, half, h, '#a5aaad');
    rect(c, dx, top, half, 2, '#d1d5d6');
    if (half > 3) { rect(c, dx + (side ? 0 : half - 1), top, 1, h, '#6e7376'); for (let y = top + 4; y < top + h; y += 6) rect(c, dx + 1, y, Math.max(0, half - 2), 1, '#979c9f'); }
  }
  rect(c, x + w + 8, top + 30, 6, 10, '#2c2f33');
  rect(c, x + w + 9, top + 32, 4, 2, '#e8c25a');
  // Floor display above the doors.
  rect(c, x + 8, top - 18, 40, 12, '#141417');
  text(c, floorLabel, x + 28 - Math.floor(textWidth(floorLabel, 2) / 2), top - 16, '#ff5a3c', 2);
}

function door(c: CanvasRenderingContext2D, x: number, colour: string, name: string, ajar = false): void {
  const w = 30, top = FLOOR_Y - 58;
  rect(c, x - w / 2 - 2, top - 2, w + 4, 60, '#efe9dc');
  rect(c, x - w / 2, top, w, 58, ajar ? '#1a1712' : colour);
  if (ajar) poly(c, [[x - w / 2, top], [x - w / 2 + 12, top + 3], [x - w / 2 + 12, top + 58], [x - w / 2, top + 58]], colour);
  else { rect(c, x - w / 2 + 4, top + 5, w - 8, 20, shade(colour, 0.88)); rect(c, x - w / 2 + 4, top + 30, w - 8, 22, shade(colour, 0.9)); disc(c, x, top + 12, 1.5, '#c8c3b0'); rect(c, x + w / 2 - 6, top + 32, 2, 2, '#e8d9a0'); }
  const tw = Math.max(16, textWidth(name) + 4);
  rect(c, x - tw / 2, top - 8, tw, 6, '#f2ede0');
  text(c, name, x - Math.floor(textWidth(name) / 2), top - 7, '#33414a');
}

const NAMEPLATES = ['ANDERSSON', 'LUNDQVIST', 'NILSSON', 'KARIMI', 'BERG', 'HOLM', 'EK', 'STRÖM', 'ÅBERG', 'DAHL', 'ÖSTLUND', 'SAAD'];

/** The entrance hall on the ground floor. */
function drawLobby(c: CanvasRenderingContext2D, run: RoomView, t: number): void {
  wall(c, '#d7cdb6', 3);
  ceiling(c, t);
  tiledFloor(c, '#8a8f8c', '#a8aca4');
  // Glass entrance with the street beyond.
  rect(c, LOBBY_EXIT_X - 26, 62, 52, FLOOR_Y - 62, '#4d5257');
  rect(c, LOBBY_EXIT_X - 23, 65, 46, FLOOR_Y - 65, '#a9d0dc');
  rect(c, LOBBY_EXIT_X - 23, 120, 46, FLOOR_Y - 120, '#7fb06a');
  rect(c, LOBBY_EXIT_X, 65, 1, FLOOR_Y - 65, '#4d5257');
  rect(c, LOBBY_EXIT_X - 21, 68, 2, 30, '#e8f3f5');
  rect(c, LOBBY_EXIT_X - 10, 46, 20, 9, '#e9f2e6');
  text(c, 'UT', LOBBY_EXIT_X - 3, 49, '#1f7a4a');
  // Mailboxes and a notice board.
  for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) {
    const x = 128 + k * 17, y = 84 + r * 17;
    rect(c, x, y, 15, 15, '#8b8f93'); rect(c, x + 1, y + 1, 13, 13, r % 2 ? '#d9b93c' : '#c7c9c6'); rect(c, x + 3, y + 6, 9, 1, '#333a3f'); rect(c, x + 3, y + 3, 4, 2, '#f4f2e6');
  }
  rect(c, 276, 80, 44, 32, '#8a6a44'); rect(c, 278, 82, 40, 28, '#cdb98f');
  rect(c, 282, 86, 14, 10, '#f4f2e6'); rect(c, 300, 88, 12, 12, '#e4d27a'); rect(c, 284, 100, 16, 6, '#f4f2e6');
  // Plant in a pot.
  rect(c, 350, 152, 14, 22, '#6a4a37'); for (let i = 0; i < 9; i++) ellipse(c, 357 + Math.round((rand(i, 4) - 0.5) * 20), 146 - Math.round(rand(i, 5) * 22), 6, 3, i % 2 ? '#3e7d3b' : '#5aa04a');
  liftDoors(c, LOBBY_LIFT_X - 20, run.ride ? 0 : 0.0, '#6b6d70', 'BV');
  // A worn rug by the lift.
  rect(c, LOBBY_LIFT_X - 50, 196, 100, 30, '#7a3a34'); rect(c, LOBBY_LIFT_X - 46, 200, 92, 22, '#93504a');
}

/** One floor's corridor: lift on the left, doors along the wall, and D.D's on the top floor. */
function drawFloor(c: CanvasRenderingContext2D, run: RoomView, t: number): void {
  const colour = CORRIDOR_WALLS[run.floor % CORRIDOR_WALLS.length];
  wall(c, colour, 20 + run.floor);
  ceiling(c, t);
  tiledFloor(c, mix(colour, '#3a3f44', 0.55), mix(colour, '#3a3f44', 0.4));
  liftDoors(c, FLOOR_LIFT_X - 28, 0.8, '#7a7d80', String(run.floor));
  // Big floor number on the wall.
  const label = String(run.floor);
  text(c, label, 96 - Math.floor(textWidth(label, 4) / 2), 96, mix(colour, '#000000', 0.25), 4);
  const names = [0, 1, 2, 3].map(i => NAMEPLATES[(run.floor * 4 + i * 5 + 3) % NAMEPLATES.length]);
  const colours = ['#7a5a42', '#5b6b73', '#7a4a3a', '#5a6b58'];
  [150, 236, 322, 408].forEach((x, i) => {
    const ddDoor = run.floor === TOP_FLOOR && i === 2;
    door(c, x, ddDoor ? '#2d4a3c' : colours[(run.floor + i) % colours.length], ddDoor ? 'D.D' : names[i], ddDoor);
  });
  // Emergency exit sign and a window at the end of the corridor.
  rect(c, 226, 26, 28, 9, '#1f7a4a'); text(c, 'UT', 236, 28, '#f4f8ee');
}

/** The lift cabin, seen from inside: doors on the left, the wood-panelled wall and the button panel on the right. */
function drawCabin(c: CanvasRenderingContext2D, run: RoomView, t: number): void {
  rect(c, 0, 0, WIDTH, HEIGHT, '#5a5e60');
  // Light oak wall panelling.
  rect(c, 0, WALL_TOP, WIDTH, FLOOR_Y - WALL_TOP + 6, '#c99a63');
  for (let y = WALL_TOP + 6; y < FLOOR_Y + 6; y += 13) { rect(c, 0, y, WIDTH, 1, '#a97c48'); for (let x = Math.floor(rand(y, 1) * 40); x < WIDTH; x += 60 + Math.floor(rand(y, 2) * 30)) rect(c, x, y + 1, 26, 1, '#dcb582'); }
  rect(c, 0, 0, WIDTH, WALL_TOP, '#3b3a3f');
  rect(c, 60, 6, WIDTH - 120, 8, '#f5edc8');
  rect(c, 0, FLOOR_Y + 6, WIDTH, HEIGHT - FLOOR_Y - 6, '#6d7173');
  for (let x = 0; x < WIDTH; x += 14) rect(c, x, FLOOR_Y + 8, 7, HEIGHT - FLOOR_Y - 8, '#7a7e80');
  rect(c, 0, FLOOR_Y + 3, WIDTH, 3, '#383a3c');
  // Doors: shut while moving, open onto the landing when the lift is still.
  const landing = run.floor === 0 ? '#7d8082' : mix(CORRIDOR_WALLS[run.floor % CORRIDOR_WALLS.length], '#000000', 0.15);
  liftDoors(c, 28, run.ride ? 0 : 0.85, landing, floorLabel(run, t));
  // Mirror and handrail.
  rect(c, 168, 48, 110, 70, '#39424a'); rect(c, 170, 50, 106, 66, '#a9c7d6');
  poly(c, [[170, 116], [196, 50], [214, 50], [188, 116]], '#c9dfe8'); poly(c, [[222, 116], [242, 50], [252, 50], [232, 116]], '#bcd6e1');
  rect(c, 150, 138, 190, 4, '#b9bdbf'); rect(c, 150, 138, 190, 1, '#e6e9ea'); rect(c, 148, 136, 4, 8, '#8c9092'); rect(c, 338, 136, 4, 8, '#8c9092');
  // Steel panel with the floor buttons.
  rect(c, 358, 66, 104, 200, '#7d8184');
  rect(c, 360, 68, 100, 196, '#a9adb0');
  rect(c, 360, 68, 8, 196, '#c7cbcd'); rect(c, 452, 68, 8, 196, '#8b8f92');
  for (let y = 70; y < 262; y += 3) rect(c, 369, y, 82, 1, y % 6 ? '#a1a5a8' : '#b3b7ba');
  for (const b of PANEL_BUTTONS) drawButton(c, b.x, b.y, b.n === 0 ? 'BV' : String(b.n), run.floor === b.n, run.ride?.to === b.n && Math.floor(t * 4) % 2 === 0);
  // The alarm bell and door button, as on the real panel.
  drawButton(c, 388, 242, '', false, false, 'bell');
  drawButton(c, 430, 242, '', false, false, 'doors');
}

function floorLabel(run: RoomView, t: number): string {
  if (!run.ride) return run.floor === 0 ? 'BV' : String(run.floor);
  const k = Math.min(1, run.ride.t / run.ride.dur), n = Math.round(run.ride.from + (run.ride.to - run.ride.from) * k);
  return n === 0 ? 'BV' : String(n);
}

function drawButton(c: CanvasRenderingContext2D, x: number, y: number, label: string, lit: boolean, blink: boolean, icon?: 'bell' | 'doors'): void {
  disc(c, x, y, BUTTON_R, '#70757a');
  disc(c, x, y, BUTTON_R - 1, '#c9cccc');
  disc(c, x, y, BUTTON_R - 3, lit ? '#1e8f55' : blink ? '#e0b640' : '#9da1a2');
  disc(c, x, y, BUTTON_R - 4, lit ? '#22a862' : blink ? '#f0cc60' : '#b5b8b9');
  if (icon === 'bell') { poly(c, [[x - 5, y + 4], [x - 3, y - 4], [x + 3, y - 4], [x + 5, y + 4]], '#f0c22e'); rect(c, x - 1, y + 5, 3, 1, '#f0c22e'); return; }
  if (icon === 'doors') { poly(c, [[x - 8, y], [x - 3, y - 4], [x - 3, y + 4]], '#3a3f44'); poly(c, [[x + 8, y], [x + 3, y - 4], [x + 3, y + 4]], '#3a3f44'); return; }
  const w = textWidth(label, 2);
  text(c, label, x - Math.floor(w / 2), y - 4, '#1b1d20', 2);
}

export function drawRoom(c: CanvasRenderingContext2D, run: RoomView, t: number): void {
  if (run.scene === 'lobby') drawLobby(c, run, t);
  else if (run.scene === 'floor') drawFloor(c, run, t);
  else drawCabin(c, run, t);
}

/** Small props that go with a character: a dog, a rollator, a guitar, a box, a scooter. */
export function drawProp(c: CanvasRenderingContext2D, prop: Prop, x: number, y: number, facing: 1 | -1, t: number): void {
  const X = Math.round(x), Y = Math.round(y), f = facing;
  switch (prop) {
    case 'dog':
      rect(c, X + f * 16, Y - 10, 12, 6, '#8a6a44'); rect(c, X + f * 24, Y - 14, 6, 6, '#8a6a44'); rect(c, X + f * 28, Y - 12, 3, 2, '#2b2018');
      rect(c, X + f * 17, Y - 4, 2, 4, '#6f5335'); rect(c, X + f * 24, Y - 4, 2, 4, '#6f5335'); rect(c, X + f * 14, Y - 12 - Math.round(Math.sin(t * 8)), 3, 2, '#6f5335');
      break;
    case 'rollator':
      rect(c, X + f * 10, Y - 20, 12, 2, '#5c6b78'); rect(c, X + f * 10, Y - 20, 2, 20, '#5c6b78'); rect(c, X + f * 20, Y - 20, 2, 20, '#5c6b78');
      disc(c, X + f * 11, Y - 2, 2, '#22262a'); disc(c, X + f * 21, Y - 2, 2, '#22262a'); rect(c, X + f * 12, Y - 12, 8, 4, '#a53a3a');
      break;
    case 'guitar':
      ellipse(c, X + f * 10, Y - 12, 6, 5, '#a8672f'); ellipse(c, X + f * 10, Y - 20, 4, 4, '#a8672f'); rect(c, X + f * 10 - 1, Y - 38, 2, 16, '#3a2b20'); disc(c, X + f * 10, Y - 12, 1.5, '#1b1410');
      break;
    case 'box':
      rect(c, X + f * 6, Y - 26, 16, 4, '#efe9dc'); rect(c, X + f * 6, Y - 24, 16, 2, '#c1863f'); rect(c, X + f * 6, Y - 22, 16, 1, '#8a5a2a');
      break;
    case 'scooter':
      rect(c, X + f * 6, Y - 3, 20, 2, '#3a3f44'); disc(c, X + f * 8, Y - 2, 2, '#c8352d'); disc(c, X + f * 24, Y - 2, 2, '#c8352d'); rect(c, X + f * 24, Y - 20, 2, 18, '#3a3f44');
      break;
  }
}

