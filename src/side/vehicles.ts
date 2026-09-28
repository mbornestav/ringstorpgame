import type { Car } from './game';
import { disc, ellipse, poly, rect, seg, text, textWidth } from './pixel';

// Cars in side view: D.D's blue BMW saloon and the Swedish police's Volvo estate. Parts are laid
// out for a car heading right, with y measured up from the tyre line, and mirrored for a car heading left.

type Local = Array<[number, number]>;

const BMW = { body: '#2d59a8', light: '#5b88d2', dark: '#1c3a74', glass: '#1b2632', shine: '#6f90aa' };
const VOLVO = { body: '#eef1f3', light: '#ffffff', dark: '#b9c1c8', glass: '#1b2530', shine: '#7792a8' };
const TYRE = '#131518';
const CHROME = '#d4dbe1';

/** Draws a car with its centre at screen x and its tyres on the car's lane. */
export function drawCar(c: CanvasRenderingContext2D, car: Car, sx: number, elapsed: number): void {
  const dir = car.dir, gy = Math.round(car.y), cx = Math.round(sx);
  const P = (x: number, y: number): [number, number] => [cx + x * dir, gy + y];
  const shape = (points: Local, colour: string) => poly(c, points.map(([x, y]) => P(x, y)), colour);
  const box = (x: number, y: number, w: number, h: number, colour: string) => rect(c, dir > 0 ? cx + x : cx - x - w, gy + y, w, h, colour);
  const police = car.kind === 'police';
  const pal = police ? VOLVO : BMW;
  const half = police ? 53 : 50;

  ellipse(c, cx, gy, half + 2, 3.5, 'rgba(18, 24, 30, 0.42)');
  for (const wx of [-31, 31]) disc(c, cx + wx * dir, gy - 7, 9.5, '#0f1216');
  // Body: sill to shoulder line, then the glasshouse.
  shape([[-half, -8], [half - 1, -8], [half + 1, -12], [half, -17], [half - 8, -20], [-half + 10, -21], [-half + 2, -19], [-half - 1, -13]], pal.body);
  box(-half + 1, -10, half * 2 - 2, 2, pal.dark);
  box(-half + 4, -18, half * 2 - 12, 1, pal.light);
  if (police) {
    // The estate roof runs almost to the tailgate.
    shape([[-half + 2, -20], [27, -20], [14, -33], [-half + 7, -33], [-half + 2, -28]], pal.body);
    shape([[-half + 5, -21], [24, -21], [13, -31], [-half + 8, -31], [-half + 5, -27]], pal.glass);
    box(-4, -32, 3, 12, '#161a1f');
    box(-27, -32, 3, 12, '#161a1f');
    box(-half + 8, -34, 44, 1, pal.light);
  } else {
    shape([[-34, -20], [26, -20], [13, -32], [-20, -32], [-31, -24]], pal.body);
    shape([[-30, -21], [23, -21], [12, -30], [-19, -30], [-28, -24]], pal.glass);
    box(-5, -31, 3, 11, '#15191e');
    box(-19, -33, 31, 1, pal.light);
  }
  // Sun on the glass.
  for (const k of [0, 9]) seg(c, P(-14 + k, -22)[0], gy - 22, P(-9 + k, -29)[0], gy - 29, 1, pal.shine);
  // Doors, handles and mirror.
  box(-4, -20, 1, 12, pal.dark);
  box(22, -19, 1, 11, pal.dark);
  // Handles sit below POLIS on the patrol car.
  box(-1, police ? -15 : -17, 3, 1, police ? '#8b949b' : CHROME);
  box(17, police ? -15 : -17, 3, 1, police ? '#8b949b' : CHROME);
  box(20, -23, 5, 3, police ? '#20252b' : pal.body);

  if (police) {
    // Blue-and-yellow Battenburg checks along the side, cut by the wheel arches, and POLIS on the doors.
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i * 6 < half * 2 - 4; i++) {
        box(-half + 2 + i * 6, -14 + row * 5, 6, 5, (i + row) % 2 ? '#1f4fa8' : '#f2d31b');
      }
    }
    for (const wx of [-31, 31]) disc(c, cx + wx * dir, gy - 7, 9, '#0f1216');
    const tx = Math.round(cx + 6 * dir - textWidth('POLIS') / 2);
    text(c, 'POLIS', tx, gy - 20, '#1d3f8f');
    // Tall tail lights up the rear pillar, as on the Volvo estates.
    box(-half - 1, -31, 2, 13, '#c3282a');
    box(half - 3, -17, 4, 3, '#f4f1dc');
    box(half - 1, -13, 2, 3, '#2a2e33');
    box(-half, -11, 6, 3, '#23272b');
    // Light bar, flashing blue left and right.
    box(-10, -37, 20, 3, '#23272c');
    const phase = Math.floor(elapsed * 8) % 2;
    for (const side of [0, 1]) {
      const on = side === phase;
      const lx = -9 + side * 10;
      box(lx, -38, 8, 2, on ? '#5aa2ff' : '#1d3566');
      if (on) {
        c.globalAlpha = 0.2;
        disc(c, P(lx + 4, -37)[0], gy - 37, 9, '#4d8dff');
        c.globalAlpha = 1;
      }
    }
  } else {
    // The twin kidney grille and round lamps of a 90s BMW, and a slim red tail light.
    box(half - 5, -16, 5, 3, '#f4f1dc');
    box(half - 1, -15, 2, 3, CHROME);
    box(half, -14, 1, 1, '#1d2126');
    box(half - 7, -11, 8, 3, '#1b1e22');
    box(half - 4, -12, 2, 1, '#f0a13a');
    box(-half - 1, -17, 4, 4, car.state === 'braking' ? '#ff4a36' : '#b3261e');
    box(-half, -11, 7, 3, '#1b1e22');
    box(-half + 3, -8, 3, 2, '#6d7176');
    seg(c, P(-24, -32)[0], gy - 32, P(-28, -41)[0], gy - 41, 1, '#1d2126');
    if (car.state === 'braking') {
      c.globalAlpha = 0.3;
      disc(c, P(-half + 1, -15)[0], gy - 15, 7, '#ff5a40');
      c.globalAlpha = 1;
    }
  }
  for (const wx of [-31, 31]) wheel(c, cx + wx * dir, gy - 7, car.wheel, police);
  if (car.kind === 'bmw' && car.state === 'stopped') driver(c, P(7, -26), dir, car.timer);
}

function wheel(c: CanvasRenderingContext2D, x: number, y: number, turn: number, police: boolean): void {
  disc(c, x, y, 7, TYRE);
  disc(c, x, y, 4.6, police ? '#3a3f45' : '#b8bfc6');
  for (let k = 0; k < 5; k++) {
    const a = turn + k * Math.PI * 2 / 5;
    seg(c, x, y, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 1, police ? '#8e969d' : '#7d858d');
  }
  disc(c, x, y, 1.5, '#555b61');
}

const DD = { skin: '#c99474', shade: '#a67558', hair: '#231d1b', brow: '#1c1614', collar: '#e9e6df' };

/** D.D leaning out of the lowered window, with a word for the courier. */
function driver(c: CanvasRenderingContext2D, [x, y]: [number, number], dir: 1 | -1, t: number): void {
  const X = Math.round(x), Y = Math.round(y);
  rect(c, X - 6, Y - 5, 13, 11, '#39434d');
  rect(c, X - 4, Y + 3, 9, 3, DD.collar);
  rect(c, X - 4, Y - 5, 9, 9, '#141820');
  rect(c, X - 3, Y - 4, 7, 7, DD.skin);
  rect(c, X - 3, Y - 5, 7, 2, DD.hair);
  rect(c, X - 3, Y - 3, 1, 2, DD.hair);
  rect(c, X + 3, Y - 3, 1, 2, DD.hair);
  rect(c, X - 2, Y - 2, 2, 1, DD.brow);
  rect(c, X + 1, Y - 2, 2, 1, DD.brow);
  rect(c, X - 2, Y - 1, 1, 1, '#1a1414');
  rect(c, X + 2, Y - 1, 1, 1, '#1a1414');
  rect(c, X, Y, 1, 2, DD.shade);
  rect(c, X - 1, Y + 2, 3, 1, '#8e5a48');
  // His arm out of the window, tossing the gun across.
  if (t > 0.35 && t < 1.2) {
    seg(c, X + 3 * dir, Y + 4, X + 9 * dir, Y + 9, 4, '#141820');
    seg(c, X + 3 * dir, Y + 4, X + 9 * dir, Y + 9, 2, DD.skin);
  }
  if (t > 0.15) {
    const label = t < 1.1 ? 'D.D!' : 'LYCKA TILL';
    const w = textWidth(label) + 8, bx = X - Math.round(w / 2), by = Y - 22;
    rect(c, bx - 1, by - 1, w + 2, 11, '#141820');
    rect(c, bx, by, w, 9, '#fbf7ea');
    rect(c, X - 1, by + 9, 3, 2, '#fbf7ea');
    rect(c, X, by + 11, 1, 2, '#fbf7ea');
    text(c, label, bx + 4, by + 2, '#1d2a33');
  }
}

/** A small pixel portrait of D.D for his lines: short dark hair, strong brows, a light collar. */
export function drawPortrait(c: CanvasRenderingContext2D, x: number, y: number): void {
  const R = (dx: number, dy: number, w: number, h: number, colour: string) => rect(c, x + dx, y + dy, w, h, colour);
  R(0, 0, 22, 24, '#141820');
  R(1, 1, 20, 22, '#39505a');
  R(4, 5, 14, 15, '#141820');
  R(5, 6, 12, 13, DD.skin);
  R(4, 9, 1, 4, DD.skin); R(17, 9, 1, 4, DD.skin);
  R(3, 9, 1, 4, '#141820'); R(18, 9, 1, 4, '#141820');
  R(5, 3, 12, 4, DD.hair); R(4, 4, 1, 4, DD.hair); R(17, 4, 1, 4, DD.hair); R(6, 2, 10, 1, DD.hair);
  R(7, 3, 2, 1, '#3a302b'); R(12, 3, 2, 1, '#3a302b');
  R(6, 9, 4, 1, DD.brow); R(12, 9, 4, 1, DD.brow);
  R(7, 11, 2, 1, '#efe9df'); R(13, 11, 2, 1, '#efe9df');
  R(8, 11, 1, 1, '#1a1414'); R(13, 11, 1, 1, '#1a1414');
  R(10, 11, 2, 4, DD.shade); R(9, 14, 4, 1, DD.shade);
  R(8, 16, 6, 1, '#8e5a48'); R(7, 15, 1, 1, '#8e5a48'); R(14, 15, 1, 1, '#8e5a48');
  R(6, 18, 10, 1, DD.shade);
  R(8, 19, 6, 2, DD.skin);
  R(4, 20, 14, 3, DD.collar); R(10, 20, 2, 3, '#bdb8ae');
}
