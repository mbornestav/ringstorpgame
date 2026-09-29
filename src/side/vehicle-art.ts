import type { Car } from './game';
import { drawHead, LOOKS, type Look } from './fighters';
import { disc, ellipse, mix, poly, rect, seg, shade } from './pixel';

// The Level 3 vehicles in side view: D.D's Ford Taunus with two heads in the windows, ordinary
// traffic, and curtain-sided trucks whose kapell (tarpaulin) can be cut open. Cars head right, with y
// measured up from the tyre line, and are mirrored for a car heading left.

type Local = Array<[number, number]>;
const TYRE = '#131518';
const CHROME = '#d4dbe1';

interface Paint { body: string; light: string; dark: string; glass: string; shine: string }
const paint = (body: string): Paint => ({ body, light: mix(body, '#ffffff', 0.3), dark: shade(body, 0.68), glass: '#1a2430', shine: '#6f90aa' });
/** Burnt orange, like the Taunus in the photos of that era. */
export const TAUNUS_PAINT = paint('#b9612b');
const TONES = ['#8c2231', '#a9b0b6', '#2b5140', '#e6e7e5', '#23282e', '#2f5f78', '#c9b25a', '#6a4a7a'].map(paint);

export type TruckTone = 0 | 1 | 2;
const TARPS: Array<{ tarp: string; dark: string; light: string }> = [
  { tarp: '#2f5c4a', dark: '#1f4034', light: '#4a7d66' },
  { tarp: '#2c4d7d', dark: '#1d3557', light: '#4a6fa3' },
  { tarp: '#8a8f92', dark: '#62676a', light: '#b0b5b8' },
];

/** Extra cars for the heist: the Taunus, other traffic, and trucks. Returns false for the older kinds. */
export function drawExtraCar(c: CanvasRenderingContext2D, car: Car, sx: number, elapsed: number): boolean {
  if (car.kind === 'taunus') { drawSaloon(c, car, sx, { half: 52, pal: TAUNUS_PAINT, cabin: 'taunus', people: car.crew === 1 ? [LOOKS.dd] : [LOOKS.dd, LOOKS.goran] }); return true; }
  if (car.kind === 'civil') {
    const style = car.id % 3 === 0 ? 'van' : car.id % 3 === 1 ? 'hatch' : 'sedan';
    drawSaloon(c, car, sx, { half: style === 'van' ? 56 : style === 'hatch' ? 44 : 49, pal: TONES[(car.tone ?? car.id) % TONES.length], cabin: style, people: [] });
    return true;
  }
  if (car.kind === 'truck') {
    drawTruck(c, { x: sx, y: car.y, facing: car.dir, tone: (car.tone ?? 0) % 3 as TruckTone, cut: 0, crates: 0, wheel: car.wheel, moving: car.speed > 5, lights: !!car.lights, elapsed });
    return true;
  }
  void elapsed;
  return false;
}

interface Saloon { half: number; pal: Paint; cabin: 'taunus' | 'sedan' | 'hatch' | 'van'; people: Look[] }

function drawSaloon(c: CanvasRenderingContext2D, car: Car, sx: number, cfg: Saloon): void {
  const dir = car.dir, gy = Math.round(car.y), cx = Math.round(sx), { half, pal } = cfg;
  const P = (x: number, y: number): [number, number] => [cx + x * dir, gy + y];
  const shape = (points: Local, colour: string) => poly(c, points.map(([x, y]) => P(x, y)), colour);
  const box = (x: number, y: number, w: number, h: number, colour: string) => rect(c, dir > 0 ? cx + x : cx - x - w, gy + y, w, h, colour);
  const wheels = cfg.cabin === 'van' ? [-36, 34] : [-31, 31];
  const braking = car.braking || car.state === 'braking';

  ellipse(c, cx, gy, half + 2, 3.5, 'rgba(18, 24, 30, 0.42)');
  for (const wx of wheels) disc(c, cx + wx * dir, gy - 7, 9.5, '#0f1216');
  // Body: sill to shoulder, then the glasshouse.
  const roofY = cfg.cabin === 'van' ? -41 : -31;
  shape([[-half, -8], [half, -8], [half + 1, -12], [half - 1, -19], [half - 20, -20], [-half + 2, -20], [-half - 1, -14]], pal.body);
  box(-half + 1, -10, half * 2 - 2, 2, pal.dark);
  box(-half + 4, -18, half * 2 - 12, 1, pal.light);
  let glass: Local, cab: Local;
  switch (cfg.cabin) {
    case 'taunus':
      cab = [[33, -20], [21, roofY], [-24, roofY], [-34, -21]];
      glass = [[31, -21], [20, roofY + 1], [-23, roofY + 1], [-32, -22]];
      break;
    case 'van':
      cab = [[half - 6, -20], [half - 16, roofY], [-half + 1, roofY], [-half + 1, -20]];
      glass = [[half - 8, -21], [half - 16, roofY + 2], [half - 32, roofY + 2], [half - 33, -21]];
      break;
    case 'hatch':
      cab = [[26, -20], [14, -31], [-half + 12, -31], [-half + 3, -20]];
      glass = [[23, -21], [13, -30], [-half + 13, -30], [-half + 6, -21]];
      break;
    default:
      cab = [[28, -20], [15, -32], [-22, -32], [-33, -21]];
      glass = [[25, -21], [14, -30], [-21, -30], [-30, -22]];
  }
  shape(cab, pal.body);
  shape(glass, pal.glass);
  // Heads in the windows: the far one first, so the near one sits in front of it.
  cfg.people.forEach((look, i) => {
    const far = i === 0;
    const head = P(far ? 1 : 10, -26 + (far ? -1 : 0));
    rect(c, Math.round(head[0] - 5), gy - 22, 10, 3, shade(look.jacket, far ? 0.7 : 1));
    drawHead(c, head, dir, 7, 8, look, 0, undefined);
  });
  // Pillars and glass highlights.
  if (cfg.cabin === 'van') box(half - 33, roofY + 1, 2, 20, '#15191e');
  else { box(-3, roofY, 3, -roofY - 20, '#15191e'); box(cfg.cabin === 'taunus' ? -24 : -half + 12, roofY, 2, 2, '#15191e'); }
  if (cfg.people.length === 0) for (const k of [0, 9]) seg(c, P(-14 + k, -22)[0], gy - 22, P(-9 + k, -29)[0], gy - 29, 1, pal.shine);
  // Door seams, handles and a mirror.
  box(-4, -20, 1, 12, pal.dark); box(22, -19, 1, 11, pal.dark);
  box(-1, -17, 3, 1, CHROME); box(17, -17, 3, 1, CHROME);
  box(24, -24, 5, 3, cfg.cabin === 'taunus' ? '#20252b' : pal.body);
  // Bumpers, lamps and the tail light.
  box(half - 3, -12, 6, 3, CHROME);
  box(-half - 3, -12, 6, 3, CHROME);
  box(half - 5, -18, 5, 4, car.lights ? '#fff3b0' : '#f4f1dc');
  box(half - 1, -14, 2, 2, '#d99a2a');
  box(-half - 1, -18, 4, 5, braking ? '#ff4a36' : '#b3261e');
  if (cfg.cabin === 'taunus') {
    // Chrome trim along the shoulder line and a black grille.
    box(-half + 6, -16, half * 2 - 14, 1, CHROME);
    box(half - 8, -16, 3, 5, '#1b1e22');
    seg(c, P(-30, roofY)[0], gy + roofY, P(-34, roofY - 8)[0], gy + roofY - 8, 1, '#1d2126');
  }
  if (braking) { c.globalAlpha = 0.3; disc(c, P(-half + 1, -15)[0], gy - 15, 7, '#ff5a40'); c.globalAlpha = 1; }
  for (const wx of wheels) wheel(c, cx + wx * dir, gy - 7, car.wheel);
}

function wheel(c: CanvasRenderingContext2D, x: number, y: number, turn: number): void {
  disc(c, x, y, 7, TYRE);
  disc(c, x, y, 4.6, '#b8bfc6');
  for (let k = 0; k < 5; k++) {
    const a = turn + k * Math.PI * 2 / 5;
    seg(c, x, y, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 1, '#7d858d');
  }
  disc(c, x, y, 1.5, '#555b61');
}

export interface TruckDrawing {
  /** Centre of the trailer, and the line the tyres stand on. */
  x: number; y: number; facing: 1 | -1; tone: TruckTone;
  /** 0 to 1: how far the knife has cut along the kapell. At 1 the tarp is open. */
  cut: number;
  /** Crates showing through the cut. */
  crates: number;
  wheel: number; moving: boolean; lights: boolean; elapsed: number;
}

/** A curtain-sided trailer behind a dark tractor unit, 200 px long. */
export function drawTruck(c: CanvasRenderingContext2D, o: TruckDrawing): void {
  const dir = o.facing, gy = Math.round(o.y), cx = Math.round(o.x), tone = TARPS[o.tone];
  const P = (x: number, y: number): [number, number] => [cx + x * dir, gy + y];
  const box = (x: number, y: number, w: number, h: number, colour: string) => rect(c, dir > 0 ? cx + x : cx - x - w, gy + y, w, h, colour);
  const shape = (points: Local, colour: string) => poly(c, points.map(([x, y]) => P(x, y)), colour);
  ellipse(c, cx, gy, 104, 4, 'rgba(14, 18, 24, 0.42)');
  // Trailer: a steel chassis, then the tarp over its hoops.
  box(-104, -16, 160, 4, '#2b2f33');
  box(-104, -12, 158, 2, '#16191c');
  const top = -66, bottom = -16;
  shape([[-104, bottom], [55, bottom], [55, top + 3], [52, top], [-101, top], [-104, top + 3]], tone.tarp);
  box(-104, top, 159, 2, tone.light);
  // Vertical straps with buckles, and the hoops' shadows.
  for (let x = -96; x < 54; x += 22) {
    box(x, top + 2, 3, bottom - top - 2, tone.dark);
    box(x - 1, bottom - 8, 5, 4, '#c9b25a');
  }
  for (let x = -85; x < 54; x += 22) box(x, top + 2, 1, bottom - top - 2, mix(tone.tarp, tone.dark, 0.4));
  box(-104, bottom - 3, 159, 3, tone.dark);
  // Red-and-white marker strip along the bottom rail, and the tail lamps.
  for (let x = -102; x < 54; x += 6) box(x, bottom + 1, 3, 2, (x / 6) % 2 ? '#d9342b' : '#f1efe6');
  box(-106, -30, 3, 10, '#b3261e');
  // Tandem axles under the trailer.
  const wheels = [-88, -70, -52];
  for (const wx of wheels) disc(c, cx + wx * dir, gy - 8, 9, '#0d0f11');
  box(-96, -17, 50, 4, '#202428');
  for (const wx of wheels) wheelBig(c, cx + wx * dir, gy - 8, o.wheel);
  // The cut: a slit opening as the knife travels along the tarp.
  if (o.cut > 0) {
    const y = -44, len = Math.round(96 * Math.min(1, o.cut)), x0 = -74;
    if (o.cut < 1) {
      box(x0, y, len, 1, '#0d1114');
      box(x0 + len - 3, y - 1, 4, 3, '#f5f1d8');
      if (Math.floor(o.elapsed * 14) % 2 === 0) box(x0 + len + 1, y - 3, 2, 2, '#ffe28a');
    } else {
      // Open: the flaps peel back to show what's inside.
      box(x0, y - 20, 96, 40, '#15181b');
      box(x0, y - 20, 96, 1, '#050607');
      shape([[x0 - 2, y - 22], [x0 + 20, y - 20], [x0 + 6, y - 2], [x0 - 2, y + 6]], tone.dark);
      shape([[x0 + 98, y - 22], [x0 + 76, y - 20], [x0 + 90, y - 2], [x0 + 98, y + 6]], tone.dark);
      const n = Math.min(6, o.crates);
      for (let i = 0; i < n; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const bx = x0 + 10 + col * 26, by = y + 16 - row * 17;
        box(bx, by - 15, 22, 15, '#a97940');
        box(bx, by - 15, 22, 2, '#c99a5a');
        box(bx + 9, by - 15, 4, 15, '#e8d9a0');
        box(bx, by - 1, 22, 1, '#6f4c26');
      }
    }
  }
  // Tractor unit: dark grey, the way the photo shows it.
  const cabTop = -62;
  box(52, -22, 52, 8, '#25282b');
  shape([[104, -14], [104, -40], [98, -56], [92, cabTop], [58, cabTop], [58, -14]], '#3b3f42');
  shape([[104, -14], [104, -40], [98, -56], [96, -56], [100, -40], [100, -14]], '#5b6064');
  box(58, cabTop, 34, 2, '#5b6064');
  // Windows and a mirror.
  shape([[64, -34], [64, -56], [90, -56], [95, -46], [95, -34]], '#1b2530');
  shape([[66, -36], [66, -54], [88, -54], [92, -46], [92, -36]], '#3a5468');
  box(78, -34, 2, 22, '#2a2e31');
  box(96, -44, 4, 10, '#2a2e31');
  // Grille with the round badge, and headlamps.
  box(101, -30, 3, 14, '#15181a');
  for (let y = -29; y < -16; y += 3) box(101, y, 3, 1, '#4b5054');
  disc(c, P(100, -35)[0], gy - 35, 2.4, '#c8352d');
  box(102, -20, 3, 4, o.lights ? '#fff3b0' : '#e8e2c8');
  box(102, -14, 4, 3, '#b8bdc0');
  // Exhaust stack and a step.
  box(54, -66, 3, 40, '#7d8388');
  box(54, -66, 3, 2, '#b8bdc0');
  // Drive axle and steering axle.
  for (const wx of [62, 84]) disc(c, cx + wx * dir, gy - 9, 10.5, '#0d0f11');
  for (const wx of [62, 84]) wheelBig(c, cx + wx * dir, gy - 9, o.wheel);
}

function wheelBig(c: CanvasRenderingContext2D, x: number, y: number, turn: number): void {
  disc(c, x, y, 8.5, TYRE);
  disc(c, x, y, 5, '#b3bac0');
  for (let k = 0; k < 6; k++) {
    const a = turn + k * Math.PI / 3;
    seg(c, x, y, x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 1, '#7d858d');
  }
  disc(c, x, y, 1.8, '#555b61');
}
