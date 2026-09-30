import type { Car } from './game';
import { drawHead, LOOKS, type Look } from './fighters';
import { mix, shade, textWidth, text } from './pixel';
import { t as tr } from './i18n';

// Smooth-mode vehicles: the same cars and trucks as vehicles.ts and vehicle-art.ts, in the same places and sizes, drawn as
// illustrated bodywork. Paint carries a sky reflection above the waist and the darker ground below it, glass has streaks
// of reflected sky, bumpers are chrome, and the tyres have sidewalls and lit alloy rims. The static bodywork is baked once
// per model, colour and direction onto offscreen canvases at the screen's resolution; the wheels, lamps, beacons, heads in
// the windows and lettering are drawn live over it each frame.

type Pt = [number, number];
const INK = '#161b20';
const SKY = '#dce9f2';

export interface Paint { body: string; light: string; dark: string; glass: string; shine: string }
export type Cabin = 'taunus' | 'sedan' | 'hatch' | 'van' | 'bmw' | 'volvo';
export interface SmoothCar { half: number; pal: Paint; cabin: Cabin; people: Look[] }

interface Geometry { cab: Pt[]; glass: Pt[]; pillars: Array<[number, number, number, number]>; wheels: number[]; roof: number; nose: number; tail: number }

function geometry(cfg: SmoothCar): Geometry {
  const h = cfg.half;
  switch (cfg.cabin) {
    case 'bmw': return {
      cab: [[-34, -20], [26, -20], [13, -32], [-20, -32], [-31, -24]], glass: [[-30, -21], [23, -21], [12, -30], [-19, -30], [-28, -24]],
      pillars: [[-5, -31, 3, 11]], wheels: [-31, 31], roof: -32, nose: -16.5, tail: -19 };
    case 'volvo': return {
      cab: [[-h + 2, -20], [27, -20], [14, -33], [-h + 7, -33], [-h + 2, -28]], glass: [[-h + 5, -21], [24, -21], [13, -31], [-h + 8, -31], [-h + 5, -27]],
      pillars: [[-4, -32, 3, 12], [-27, -32, 3, 12]], wheels: [-31, 31], roof: -33, nose: -17, tail: -20 };
    case 'taunus': return {
      cab: [[33, -20], [21, -31], [-24, -31], [-34, -21]], glass: [[31, -21], [20, -30], [-23, -30], [-32, -22]],
      pillars: [[-3, -31, 3, 11]], wheels: [-31, 31], roof: -31, nose: -17.5, tail: -19 };
    case 'van': return {
      cab: [[h - 6, -20], [h - 16, -41], [-h + 1, -41], [-h + 1, -20]], glass: [[h - 8, -21], [h - 16, -39], [h - 32, -39], [h - 33, -21]],
      pillars: [[h - 33, -40, 2, 20]], wheels: [-36, 34], roof: -41, nose: -18, tail: -20 };
    case 'hatch': return {
      cab: [[26, -20], [14, -31], [-h + 12, -31], [-h + 3, -20]], glass: [[23, -21], [13, -30], [-h + 13, -30], [-h + 6, -21]],
      pillars: [[-3, -31, 3, 11]], wheels: [-31, 31], roof: -31, nose: -17.5, tail: -19.5 };
    default: return {
      cab: [[28, -20], [15, -32], [-22, -32], [-33, -21]], glass: [[25, -21], [14, -30], [-21, -30], [-30, -22]],
      pillars: [[-3, -32, 3, 12]], wheels: [-31, 31], roof: -32, nose: -17.5, tail: -19 };
  }
}

/** A polygon with its corners rounded by up to r. */
function roundPoly(c: CanvasRenderingContext2D, pts: Pt[], r: number): void {
  c.beginPath();
  const n = pts.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  c.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    c.arcTo(p[0], p[1], mid(p, q)[0], mid(p, q)[1], r);
  }
  c.closePath();
}

const scaleOf = (c: CanvasRenderingContext2D): number => Math.abs(c.getTransform().a) || 1;
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

interface Sprite { under: HTMLCanvasElement; over: HTMLCanvasElement; x0: number; y0: number }
const sprites = new Map<string, Sprite>();
/** Bakes (once) the two layers of a vehicle: `under` below the people in the windows, `over` above them. */
function sprite(key: string, S: number, x0: number, y0: number, w: number, h: number, paint: (c: CanvasRenderingContext2D, layer: 'under' | 'over') => void): Sprite {
  const id = `${key}@${S}`;
  let s = sprites.get(id);
  if (s) return s;
  const layer = (which: 'under' | 'over') => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * S); canvas.height = Math.ceil(h * S);
    const c = canvas.getContext('2d')!;
    c.setTransform(S, 0, 0, S, -x0 * S, -y0 * S);
    c.lineJoin = 'round'; c.lineCap = 'round';
    paint(c, which);
    return canvas;
  };
  s = { under: layer('under'), over: layer('over'), x0, y0 };
  sprites.set(id, s);
  return s;
}
const blit = (c: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, y: number, S: number) => c.drawImage(image, x, y, image.width / S, image.height / S);

/** A soft shadow on the road under a vehicle, darkest under the tyres. */
function groundShadow(c: CanvasRenderingContext2D, half: number, wheels: number[], depth = 3.6): void {
  c.save(); c.scale(1, depth / (half + 6));
  const g = c.createRadialGradient(0, 0, 0, 0, 0, half + 6);
  g.addColorStop(0, 'rgba(12, 16, 22, 0.5)'); g.addColorStop(0.7, 'rgba(12, 16, 22, 0.34)'); g.addColorStop(1, 'rgba(12, 16, 22, 0)');
  c.fillStyle = g; c.fillRect(-half - 8, -half - 8, half * 2 + 16, half * 2 + 16);
  c.restore();
  for (const wx of wheels) {
    c.save(); c.translate(wx, 0); c.scale(1, 0.22);
    const k = c.createRadialGradient(0, 0, 0, 0, 0, 10);
    k.addColorStop(0, 'rgba(6, 8, 12, 0.6)'); k.addColorStop(1, 'rgba(6, 8, 12, 0)');
    c.fillStyle = k; c.fillRect(-10, -10, 20, 20);
    c.restore();
  }
}

/** Paint shading over any body panel: sky reflected above the waist, a crisp horizon, the darker road below. */
function paintShade(c: CanvasRenderingContext2D, top: number, bottom: number, x0: number, x1: number, dir: number, waist = 0.46): void {
  const g = c.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, 'rgba(236, 244, 250, 0.55)');
  g.addColorStop(0.1, 'rgba(236, 244, 250, 0.2)');
  g.addColorStop(waist - 0.02, 'rgba(236, 244, 250, 0.04)');
  g.addColorStop(waist, 'rgba(10, 14, 24, 0.1)');
  g.addColorStop(0.85, 'rgba(10, 14, 24, 0.3)');
  g.addColorStop(1, 'rgba(10, 14, 24, 0.46)');
  c.fillStyle = g; c.fillRect(x0, top, x1 - x0, bottom - top);
  // The sun is to the right of the screen, whichever way the car is heading.
  const s = c.createLinearGradient(x0, 0, x1, 0);
  s.addColorStop(dir > 0 ? 0 : 1, 'rgba(10, 14, 24, 0.16)');
  s.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  s.addColorStop(dir > 0 ? 1 : 0, 'rgba(255, 240, 210, 0.12)');
  c.fillStyle = s; c.fillRect(x0, top, x1 - x0, bottom - top);
}

function glassFill(c: CanvasRenderingContext2D, pts: Pt[], top: number, bottom: number, tone: string): void {
  roundPoly(c, pts, 1.4);
  const g = c.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, mix(tone, '#6d8aa0', 0.55)); g.addColorStop(0.45, mix(tone, '#34495a', 0.4)); g.addColorStop(1, shade(tone, 0.8));
  c.fillStyle = g; c.fill();
}

function glassReflections(c: CanvasRenderingContext2D, pts: Pt[], x0: number, x1: number, top: number, bottom: number, strength: number): void {
  c.save(); roundPoly(c, pts, 1.4); c.clip();
  const h = bottom - top;
  const band = (x: number, w: number, a: number) => {
    c.beginPath(); c.moveTo(x, bottom + 1); c.lineTo(x + w, bottom + 1); c.lineTo(x + w + h * 0.9, top - 1); c.lineTo(x + h * 0.9, top - 1); c.closePath();
    c.fillStyle = `rgba(214, 232, 244, ${a * strength})`; c.fill();
  };
  for (let x = x0 - h; x < x1; x += 19) { band(x + 4, 5, 0.3); band(x + 11, 1.6, 0.22); }
  // A bright sky line along the top of the glass.
  c.strokeStyle = `rgba(230, 242, 250, ${0.45 * strength})`; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(x0, top + 0.7); c.lineTo(x1, top + 0.7); c.stroke();
  c.restore();
}

/** Chrome: a bright band over a dark reflection of the road. */
function chrome(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dark = false): void {
  c.beginPath(); c.roundRect(x, y, w, h, Math.min(1.2, h / 2));
  const g = c.createLinearGradient(0, y, 0, y + h);
  if (dark) { g.addColorStop(0, '#4a5058'); g.addColorStop(0.45, '#23272c'); g.addColorStop(1, '#121417'); }
  else { g.addColorStop(0, '#f7fbff'); g.addColorStop(0.42, '#c3ccd4'); g.addColorStop(0.55, '#5f6870'); g.addColorStop(1, '#a9b2ba'); }
  c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(16, 20, 24, 0.7)'; c.lineWidth = 0.35; c.stroke();
}

function lampShape(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, glassy = true): void {
  c.beginPath(); c.roundRect(x, y, w, h, 0.8);
  c.fillStyle = fill; c.fill();
  c.strokeStyle = 'rgba(16, 20, 24, 0.75)'; c.lineWidth = 0.4; c.stroke();
  if (glassy) { c.fillStyle = 'rgba(255, 255, 255, 0.45)'; c.fillRect(x + 0.5, y + 0.4, w - 1, Math.max(0.5, h * 0.28)); }
}

/** The body outline: sill to shoulder, bonnet to boot, with the wheel arches cut out. */
function bodyPath(c: CanvasRenderingContext2D, half: number, g: Geometry, waist = -20): void {
  const [rear, front] = [Math.min(...g.wheels), Math.max(...g.wheels)];
  const arch = 9.6, a = Math.asin(1.8 / arch);
  c.beginPath();
  c.moveTo(-half + 1, -4.8);
  c.quadraticCurveTo(-half - 1.2, -5.2, -half - 1.2, -8);
  c.lineTo(-half - 1.2, g.tail + 5);
  c.quadraticCurveTo(-half - 1, g.tail + 0.4, -half + 3, g.tail);
  c.lineTo(-half + 8, waist);
  c.lineTo(half - 20, waist);
  c.quadraticCurveTo(half - 6, waist + 0.2, half - 1, g.nose - 0.4);
  c.quadraticCurveTo(half + 1.4, g.nose + 0.4, half + 1.4, g.nose + 3.5);
  c.lineTo(half + 1.4, -8);
  c.quadraticCurveTo(half + 1.3, -5.1, half - 1, -4.8);
  c.lineTo(front + arch * Math.cos(a), -4.8);
  c.arc(front, -7, arch, a, Math.PI - a, true);
  c.lineTo(rear + arch * Math.cos(a), -4.8);
  c.arc(rear, -7, arch, a, Math.PI - a, true);
  c.closePath();
}

function paintSaloon(c: CanvasRenderingContext2D, cfg: SmoothCar, dir: 1 | -1, layer: 'under' | 'over'): void {
  const g = geometry(cfg), half = cfg.half, pal = cfg.pal, police = cfg.cabin === 'volvo';
  c.scale(dir, 1);
  if (layer === 'over') {
    const xs = g.glass.map(p => p[0]), ys = g.glass.map(p => p[1]);
    glassReflections(c, g.glass, Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), cfg.people.length ? 0.6 : 1);
    for (const [x, y, w, h] of g.pillars) {
      c.beginPath(); c.roundRect(x, y, w, h, 0.6);
      const p = c.createLinearGradient(x, 0, x + w, 0);
      p.addColorStop(0, '#0e1115'); p.addColorStop(0.6, '#1c2228'); p.addColorStop(1, '#2c333a');
      c.fillStyle = p; c.fill();
    }
    // The door mirror, in the car's colour.
    const mx = cfg.cabin === 'bmw' || cfg.cabin === 'volvo' ? 20 : 24, my = cfg.cabin === 'bmw' || cfg.cabin === 'volvo' ? -23.5 : -24.5;
    c.beginPath(); c.roundRect(mx, my, 5, 3.2, 1.2);
    c.fillStyle = cfg.cabin === 'taunus' || police ? '#20252b' : pal.body; c.fill();
    c.strokeStyle = INK; c.lineWidth = 0.4; c.stroke();
    c.fillStyle = 'rgba(255, 255, 255, 0.3)'; c.fillRect(mx + 0.6, my + 0.5, 3.6, 0.6);
    return;
  }
  groundShadow(c, half + 2, g.wheels);
  // Wheel wells: dark hollows behind the tyres.
  c.save(); c.beginPath(); c.rect(-half - 4, -20, half * 2 + 8, 15.4); c.clip();
  for (const wx of g.wheels) {
    const well = c.createRadialGradient(wx, -7, 5, wx, -7, 9.6);
    well.addColorStop(0, '#07090b'); well.addColorStop(1, '#1b1f24');
    c.beginPath(); c.arc(wx, -7, 9.6, 0, Math.PI * 2); c.fillStyle = well; c.fill();
  }
  c.restore();
  // Cabin, then the glass, then the lower body over both.
  const roofTop = g.roof, ys = g.cab.map(p => p[1]);
  roundPoly(c, g.cab, 2.6);
  c.fillStyle = pal.body; c.fill();
  c.save(); roundPoly(c, g.cab, 2.6); c.clip();
  paintShade(c, roofTop, -20, -half - 2, half + 2, dir, 0.9);
  c.restore();
  roundPoly(c, g.cab, 2.6); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();
  // A lit roof edge.
  c.strokeStyle = rgba(mix(pal.body, '#ffffff', 0.7), 0.8); c.lineWidth = 0.55;
  const top = g.cab.filter(p => p[1] === Math.min(...ys));
  if (top.length >= 2) { c.beginPath(); c.moveTo(top[0][0] + 1, roofTop + 0.6); c.lineTo(top[top.length - 1][0] - 1, roofTop + 0.6); c.stroke(); }
  const gys = g.glass.map(p => p[1]);
  glassFill(c, g.glass, Math.min(...gys), Math.max(...gys), pal.glass);

  bodyPath(c, half, g);
  c.fillStyle = pal.body; c.fill();
  c.save(); bodyPath(c, half, g); c.clip();
  if (police) {
    // Blue-and-yellow Battenburg checks along the side, as on the Swedish patrol cars.
    for (let row = 0; row < 2; row++) for (let i = 0; i * 6 < half * 2 - 4; i++) {
      c.fillStyle = (i + row) % 2 ? '#1f4fa8' : '#f2d31b';
      c.fillRect(-half + 2 + i * 6, -14 + row * 5, 6, 5);
    }
  }
  paintShade(c, -21, -4.5, -half - 2, half + 2, dir);
  // A rubbing strip along the doors, a crisp shoulder crease and its highlight.
  if (!police) { c.fillStyle = cfg.cabin === 'taunus' ? '#d7dde2' : 'rgba(16, 20, 26, 0.55)'; c.fillRect(-half, -12.4, half * 2, cfg.cabin === 'taunus' ? 0.9 : 1.3); }
  c.fillStyle = rgba(mix(pal.body, '#ffffff', 0.75), 0.75); c.fillRect(-half + 3, -18.2, half * 2 - 8, 0.55);
  c.fillStyle = 'rgba(10, 14, 20, 0.28)'; c.fillRect(-half + 3, -17.6, half * 2 - 8, 0.5);
  // Door shut lines.
  c.strokeStyle = 'rgba(10, 12, 16, 0.6)'; c.lineWidth = 0.4;
  for (const x of cfg.cabin === 'van' ? [half - 33] : [-4, 22]) { c.beginPath(); c.moveTo(x, -20); c.lineTo(x, -5.5); c.stroke(); }
  c.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  for (const x of cfg.cabin === 'van' ? [half - 32.5] : [-3.5, 22.5]) { c.beginPath(); c.moveTo(x, -20); c.lineTo(x, -5.5); c.stroke(); }
  // Bounce light from the road along the sill.
  c.fillStyle = 'rgba(200, 205, 210, 0.12)'; c.fillRect(-half - 2, -6.2, half * 2 + 4, 1.4);
  c.restore();
  bodyPath(c, half, g); c.strokeStyle = INK; c.lineWidth = 0.65; c.stroke();

  // Handles, bumpers, grille and lamps.
  for (const x of cfg.cabin === 'van' ? [half - 30] : [-1, 17]) chrome(c, x, police ? -15.4 : -17, 3.2, 1.1, police);
  const blackBumpers = police || cfg.cabin === 'bmw';
  chrome(c, half - 4, -11.5, 6.2, 3.2, blackBumpers);
  chrome(c, -half - 2.4, -11.5, 6.4, 3.2, blackBumpers);
  if (cfg.cabin === 'bmw') {
    // Twin round lamps and the kidney grille.
    c.fillStyle = '#15191d'; c.beginPath(); c.roundRect(half - 6, -17, 6.8, 4.4, 1); c.fill();
    for (const lx of [half - 4.6, half - 1.7]) {
      c.beginPath(); c.arc(lx, -14.8, 1.25, 0, Math.PI * 2); c.fillStyle = '#f4f1dc'; c.fill();
      c.fillStyle = 'rgba(255, 255, 255, 0.8)'; c.fillRect(lx - 0.6, -15.6, 0.8, 0.5);
    }
    c.fillStyle = '#b8c1c8'; c.fillRect(half + 0.2, -15.5, 1, 2.8);
    lampShape(c, -half - 1.2, -17, 3.6, 3.6, '#b3261e');
    c.fillStyle = '#e39a3a'; c.fillRect(half - 3.8, -12.8, 2, 1);
  } else if (police) {
    lampShape(c, half - 3.4, -17.2, 4.4, 3.2, '#f4f1dc');
    lampShape(c, -half - 1.4, -31, 2.6, 13, '#c3282a');
  } else {
    lampShape(c, half - 5, -18, 5.4, 3.8, '#f4f1dc');
    c.fillStyle = '#d99a2a'; c.fillRect(half - 1, -14, 2, 2);
    lampShape(c, -half - 1.2, -18, 4, 4.8, '#b3261e');
    if (cfg.cabin === 'taunus') {
      // Chrome trim along the shoulder and a black egg-crate grille.
      chrome(c, -half + 6, -16.4, half * 2 - 14, 0.9);
      c.fillStyle = '#121518'; c.beginPath(); c.roundRect(half - 8.4, -16.2, 3.4, 4.8, 0.5); c.fill();
      c.fillStyle = '#4a5157'; for (let y = -15.6; y < -11.6; y += 1.2) c.fillRect(half - 8, y, 2.6, 0.35);
    }
  }
  // Antennas.
  c.strokeStyle = '#1d2126'; c.lineWidth = 0.45;
  if (cfg.cabin === 'bmw') { c.beginPath(); c.moveTo(-24, -32); c.lineTo(-28, -41); c.stroke(); }
  if (cfg.cabin === 'taunus') { c.beginPath(); c.moveTo(-30, g.roof); c.lineTo(-34, g.roof - 8); c.stroke(); }
  if (police) {
    // The light bar's housing; the beacons themselves flash live.
    c.beginPath(); c.roundRect(-10.5, -37.4, 21, 3.8, 1.2);
    const bar = c.createLinearGradient(0, -37.4, 0, -33.6);
    bar.addColorStop(0, '#454c54'); bar.addColorStop(1, '#16191d');
    c.fillStyle = bar; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.4; c.stroke();
  }
}

/** A tyre with a sidewall and a lit alloy rim; `r` is the tyre's radius. */
function wheel(c: CanvasRenderingContext2D, x: number, y: number, r: number, turn: number, rim: 'alloy' | 'steel' | 'dark', spokes = 5): void {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#121417'; c.fill();
  c.beginPath(); c.arc(x, y, r * 0.83, 0, Math.PI * 2); c.strokeStyle = '#2b3036'; c.lineWidth = r * 0.14; c.stroke();
  // Sun on the upper right of the tread.
  c.beginPath(); c.arc(x, y, r - 0.45, -1.9, -0.2); c.strokeStyle = 'rgba(255, 250, 235, 0.2)'; c.lineWidth = 0.6; c.stroke();
  const R = r * 0.64;
  const g = c.createRadialGradient(x + R * 0.35, y - R * 0.4, 0, x, y, R);
  if (rim === 'dark') { g.addColorStop(0, '#6c747c'); g.addColorStop(1, '#2a2f35'); }
  else if (rim === 'steel') { g.addColorStop(0, '#dfe5ea'); g.addColorStop(1, '#8a9399'); }
  else { g.addColorStop(0, '#f2f6f9'); g.addColorStop(0.6, '#b9c2c9'); g.addColorStop(1, '#7c858d'); }
  c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(12, 14, 18, 0.6)'; c.lineWidth = 0.35; c.stroke();
  c.strokeStyle = rim === 'dark' ? '#1d2126' : '#5d666e'; c.lineWidth = r * 0.12;
  c.beginPath();
  for (let k = 0; k < spokes; k++) {
    const a = turn + k * Math.PI * 2 / spokes;
    c.moveTo(x + Math.cos(a) * R * 0.3, y + Math.sin(a) * R * 0.3); c.lineTo(x + Math.cos(a) * R * 0.88, y + Math.sin(a) * R * 0.88);
  }
  c.stroke();
  c.beginPath(); c.arc(x, y, R * 0.3, 0, Math.PI * 2); c.fillStyle = '#4d555c'; c.fill();
  c.beginPath(); c.arc(x - R * 0.08, y - R * 0.1, R * 0.12, 0, Math.PI * 2); c.fillStyle = '#c9d0d6'; c.fill();
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, a: number): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(colour, a)); g.addColorStop(1, rgba(colour, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Draws a car with its centre at screen x and its tyres on the car's lane. */
export function drawSmoothCar(c: CanvasRenderingContext2D, car: Car, sx: number, elapsed: number, cfg: SmoothCar): void {
  const S = scaleOf(c), dir = car.dir;
  const cx = Math.round(sx * S) / S, gy = Math.round(car.y);
  const half = cfg.half, g = geometry(cfg);
  const key = `${cfg.cabin}-${cfg.pal.body}-${half}-${dir}`;
  const box = half + 12;
  const sp = sprite(key, S, -box, -46, box * 2, 54, (k, layer) => paintSaloon(k, cfg, dir, layer));
  blit(c, sp.under, cx + sp.x0, gy + sp.y0, S);
  const P = (x: number, y: number): Pt => [cx + x * dir, gy + y];
  // Heads in the windows: the far one first, so the near one sits in front of it.
  cfg.people.forEach((look, i) => {
    const far = i === 0, head = P(far ? 1 : 10, -26 + (far ? -1 : 0));
    c.fillStyle = shade(look.jacket, far ? 0.6 : 0.9);
    c.beginPath(); c.roundRect(head[0] - 5, gy - 22.5, 10, 3.5, 1.5); c.fill();
    drawHead(c, head, dir, 7, 8, look, 0, undefined);
  });
  blit(c, sp.over, cx + sp.x0, gy + sp.y0, S);
  const braking = car.braking || car.state === 'braking';
  const police = cfg.cabin === 'volvo';
  if (police) {
    const tx = cx + 6 * dir - textWidth('POLIS') / 2;
    text(c, 'POLIS', tx + 0.3, gy - 19.7, 'rgba(10, 20, 50, 0.35)');
    text(c, 'POLIS', tx, gy - 20, '#1d3f8f');
    const phase = Math.floor(elapsed * 8) % 2;
    for (const side of [0, 1]) {
      const on = side === phase, lx = -9 + side * 10;
      const [bx] = P(lx + 4, 0);
      c.beginPath(); c.roundRect(bx - 4, gy - 38.2, 8, 2.6, 1);
      c.fillStyle = on ? '#6fb1ff' : '#1d3566'; c.fill();
      if (on) { c.fillStyle = 'rgba(235, 245, 255, 0.85)'; c.fillRect(bx - 2.5, gy - 37.9, 5, 0.7); glow(c, bx, gy - 37, 12, '#4d8dff', 0.45); }
    }
  }
  // Lamps that change: headlamps at night, brake lights.
  const head = P(half - 1.5, cfg.cabin === 'bmw' ? -14.8 : police ? -15.6 : -16);
  if (car.lights) {
    c.fillStyle = '#fffbe6'; c.beginPath(); c.arc(head[0], head[1], 1.6, 0, Math.PI * 2); c.fill();
    glow(c, head[0], head[1], 7, '#fff4c8', 0.6);
  }
  if (braking) {
    const tail = P(-half + 0.5, cfg.cabin === 'bmw' ? -15.2 : -15.6);
    c.fillStyle = '#ff5a40'; c.beginPath(); c.roundRect(tail[0] - 1.7, tail[1] - 2, 3.4, 4, 0.8); c.fill();
    glow(c, tail[0], tail[1], 9, '#ff4a30', 0.5);
  }
  for (const wx of g.wheels) wheel(c, cx + wx * dir, gy - 7, 7, car.wheel, police ? 'dark' : cfg.cabin === 'van' ? 'steel' : 'alloy');
  if (car.kind === 'bmw' && car.state === 'stopped') drawSmoothDriver(c, P(7, -26), dir, car.timer, car.delivery);
}

// ---------------------------------------------------------------- D.D at the BMW's window

/** D.D leaning out of the lowered window, with a word for the courier. */
function drawSmoothDriver(c: CanvasRenderingContext2D, [x, y]: Pt, dir: 1 | -1, t: number, delivery = false): void {
  const look = LOOKS.dd;
  // Shoulders in the window, then his head turned to the courier.
  c.beginPath(); c.roundRect(x - 5.5, y + 2, 11, 5, 2.2);
  const shirt = c.createLinearGradient(x - 5, 0, x + 5, 0);
  shirt.addColorStop(dir > 0 ? 0 : 1, '#bdb9b0'); shirt.addColorStop(dir > 0 ? 1 : 0, '#f4f1ea');
  c.fillStyle = shirt; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke();
  drawHead(c, [x, y - 0.5], dir, 7, 9, look, 0);
  if (t > 0.35 && t < 1.2) {
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + 3 * dir, y + 4); c.lineTo(x + 9 * dir, y + 9); c.strokeStyle = INK; c.lineWidth = 3.6; c.stroke();
    c.strokeStyle = look.skin; c.lineWidth = 2.6; c.stroke();
  }
  if (t > 0.15) {
    const label = delivery ? tr('car.dd') : t < 1.1 ? tr('car.hey') : tr('car.luck');
    const w = textWidth(label) + 9, bx = x - w / 2, by = y - 23;
    c.beginPath(); c.roundRect(bx, by, w, 10, 3.5);
    c.moveTo(x - 2, by + 9.8); c.lineTo(x + 0.5, by + 13.5); c.lineTo(x + 2.4, by + 9.8);
    c.fillStyle = 'rgba(10, 14, 20, 0.25)'; c.save(); c.translate(0.6, 0.9); c.fill(); c.restore();
    c.fillStyle = '#fdfaf0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();
    text(c, label, bx + 4.5, by + 2.5, '#1d2a33');
  }
}

// ---------------------------------------------------------------- trucks

export interface Tarp { tarp: string; dark: string; light: string }
export interface SmoothTruck { x: number; y: number; facing: 1 | -1; tarpTone: Tarp; toneKey: number; cut: number; crates: number; wheel: number; lights: boolean; elapsed: number }

function paintTruck(c: CanvasRenderingContext2D, tone: Tarp, dir: 1 | -1, layer: 'under' | 'over'): void {
  if (layer === 'over') return;
  c.scale(dir, 1);
  groundShadow(c, 106, [-88, -70, -52, 62, 84], 4.4);
  const top = -66, bottom = -16;
  // Chassis rails and the wheel wells.
  c.fillStyle = '#16191c'; c.fillRect(-104, -14, 158, 3);
  const rail = c.createLinearGradient(0, -16, 0, -12);
  rail.addColorStop(0, '#454b51'); rail.addColorStop(1, '#1d2125');
  c.fillStyle = rail; c.fillRect(-104, -16.5, 160, 3.2);
  c.fillStyle = '#0b0d0f'; c.fillRect(-97, -18, 52, 6); c.fillRect(52, -22, 44, 6);
  // The tarp: panels bulging between the straps, lit from the sun's side, sagging darker towards the rail.
  c.beginPath(); c.moveTo(-104, bottom); c.lineTo(55, bottom); c.lineTo(55, top + 3); c.quadraticCurveTo(55, top, 52, top); c.lineTo(-101, top); c.quadraticCurveTo(-104, top, -104, top + 3); c.closePath();
  c.fillStyle = tone.tarp; c.fill();
  c.save(); c.clip();
  const straps: number[] = []; for (let x = -96; x < 54; x += 22) straps.push(x);
  const edges = [-104, ...straps, 55];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i] + (i ? 3 : 0), b = edges[i + 1];
    const p = c.createLinearGradient(a, 0, b, 0);
    const dark = dir > 0 ? 0 : 1;
    p.addColorStop(dark, rgba(shade(tone.tarp, 0.55), 0.5));
    p.addColorStop(0.5, rgba(tone.tarp, 0));
    p.addColorStop(dark ? 0.08 : 0.92, rgba(mix(tone.light, '#ffffff', 0.25), 0.4));
    p.addColorStop(1 - dark, rgba(shade(tone.tarp, 0.7), 0.3));
    c.fillStyle = p; c.fillRect(a, top, b - a, bottom - top);
  }
  const v = c.createLinearGradient(0, top, 0, bottom);
  v.addColorStop(0, 'rgba(230, 240, 248, 0.22)'); v.addColorStop(0.25, 'rgba(0, 0, 0, 0)'); v.addColorStop(0.8, 'rgba(8, 12, 18, 0.12)'); v.addColorStop(1, 'rgba(8, 12, 18, 0.4)');
  c.fillStyle = v; c.fillRect(-105, top, 161, bottom - top);
  // Soft horizontal wrinkles where the curtain hangs from its rollers.
  c.strokeStyle = rgba(shade(tone.tarp, 0.5), 0.25); c.lineWidth = 0.5;
  for (const y of [-58, -49, -28]) { c.beginPath(); for (let x = -104; x <= 56; x += 4) { const yy = y + Math.sin(x * 0.29) * 0.7; x === -104 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); }
  c.restore();
  // Top rail, straps and buckles, bottom rail with its red-and-white marker strip.
  chrome(c, -104.5, top - 0.5, 160, 2.6);
  for (const x of straps) {
    const s = c.createLinearGradient(x, 0, x + 3, 0);
    s.addColorStop(0, shade(tone.dark, 0.8)); s.addColorStop(0.5, tone.dark); s.addColorStop(1, mix(tone.dark, tone.light, 0.5));
    c.fillStyle = s; c.fillRect(x, top + 2, 3, bottom - top - 2);
    c.beginPath(); c.roundRect(x - 1, bottom - 8, 5, 4, 0.8);
    const b = c.createLinearGradient(0, bottom - 8, 0, bottom - 4);
    b.addColorStop(0, '#f3dd84'); b.addColorStop(1, '#9a7d2c');
    c.fillStyle = b; c.fill(); c.strokeStyle = 'rgba(20, 16, 6, 0.7)'; c.lineWidth = 0.35; c.stroke();
  }
  c.fillStyle = tone.dark; c.fillRect(-104, bottom - 3, 159, 3);
  for (let x = -102; x < 54; x += 6) { c.fillStyle = (x / 6) % 2 ? '#d9342b' : '#f1efe6'; c.fillRect(x, bottom + 1, 3, 2); }
  c.fillStyle = 'rgba(255, 255, 255, 0.25)'; c.fillRect(-102, bottom + 1, 156, 0.5);
  lampShape(c, -106, -30, 3, 10, '#b3261e');
  c.beginPath(); c.moveTo(-104, top); c.lineTo(55, top); c.lineTo(55, bottom); c.lineTo(-104, bottom); c.closePath();
  c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();

  // Tractor unit: dark graphite, a big glasshouse, a chrome stack and a fuel tank.
  const cabTop = -62;
  c.fillStyle = '#1e2124'; c.fillRect(52, -22, 52, 8);
  const cab: Pt[] = [[104, -14], [104, -40], [98, -56], [92, cabTop], [58, cabTop], [58, -14]];
  roundPoly(c, cab, 2.4);
  c.fillStyle = '#3b3f42'; c.fill();
  c.save(); roundPoly(c, cab, 2.4); c.clip();
  paintShade(c, cabTop, -14, 57, 105, dir, 0.55);
  // The nose catches the sun when heading right.
  const nose = c.createLinearGradient(96, 0, 104, 0);
  nose.addColorStop(0, 'rgba(255, 255, 255, 0)'); nose.addColorStop(1, dir > 0 ? 'rgba(255, 244, 220, 0.22)' : 'rgba(0, 0, 0, 0.2)');
  c.fillStyle = nose; c.fillRect(96, cabTop, 9, 50);
  c.fillStyle = 'rgba(10, 12, 16, 0.55)'; c.fillRect(78, -34, 0.6, 20);
  c.fillStyle = 'rgba(255, 255, 255, 0.18)'; c.fillRect(78.6, -34, 0.4, 20);
  c.restore();
  roundPoly(c, cab, 2.4); c.strokeStyle = INK; c.lineWidth = 0.65; c.stroke();
  chrome(c, 58, cabTop - 0.2, 34, 1.6);
  const win: Pt[] = [[65, -35], [65, -55], [89.5, -55], [94, -46], [94, -35]];
  glassFill(c, win, -55, -35, '#1b2530');
  glassReflections(c, win, 65, 94, -55, -35, 1);
  roundPoly(c, win, 1.4); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke();
  // Mirror arm and mirror.
  c.strokeStyle = '#2a2e31'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(94, -44); c.lineTo(99, -46); c.stroke();
  c.beginPath(); c.roundRect(97.5, -47, 3, 9, 0.8); c.fillStyle = '#262a2e'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.4; c.stroke();
  // Door handle, steps and a round fuel tank.
  chrome(c, 81, -31, 4, 1);
  for (const y of [-19, -15.5]) chrome(c, 64, y, 9, 1.2, true);
  c.beginPath(); c.roundRect(52.5, -22.5, 9, 8, 3.5);
  const tank = c.createLinearGradient(0, -22.5, 0, -14.5);
  tank.addColorStop(0, '#f2f5f7'); tank.addColorStop(0.4, '#b3bcc3'); tank.addColorStop(1, '#5b646b');
  c.fillStyle = tank; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.4; c.stroke();
  // Grille with slats, the round badge, and the headlamp.
  c.beginPath(); c.roundRect(100.5, -30, 4, 14, 0.6); c.fillStyle = '#121416'; c.fill();
  c.fillStyle = '#5a6066'; for (let y = -29; y < -16.5; y += 2.2) c.fillRect(100.8, y, 3.4, 0.7);
  c.beginPath(); c.arc(100, -35, 2.3, 0, Math.PI * 2); c.fillStyle = '#c8352d'; c.fill(); c.strokeStyle = '#e6e9ec'; c.lineWidth = 0.5; c.stroke();
  lampShape(c, 101.6, -20.4, 3.4, 4, '#ece6cc');
  chrome(c, 101.5, -14.5, 4.6, 3.4, true);
  // Exhaust stack.
  const stack = c.createLinearGradient(54, 0, 57, 0);
  stack.addColorStop(0, '#6d747a'); stack.addColorStop(0.45, '#f2f6f9'); stack.addColorStop(1, '#7d858b');
  c.fillStyle = stack; c.fillRect(54, -67, 3, 41);
  c.fillStyle = '#23272b'; c.fillRect(53.6, -67.4, 3.8, 1.2);
  // Wheel wells over the axles.
  c.save(); c.beginPath(); c.rect(-100, -26, 200, 12); c.clip();
  for (const wx of [-88, -70, -52]) { c.beginPath(); c.arc(wx, -8, 9.6, 0, Math.PI * 2); c.fillStyle = '#07090b'; c.fill(); }
  for (const wx of [62, 84]) { c.beginPath(); c.arc(wx, -9, 10.8, 0, Math.PI * 2); c.fillStyle = '#07090b'; c.fill(); }
  c.restore();
  c.fillStyle = '#23272b'; c.fillRect(-96, -17.2, 50, 3.4);
}

/** A curtain-sided trailer behind a dark tractor unit, 200 px long; the cut in the kapell and the crates are drawn live. */
export function drawSmoothTruck(c: CanvasRenderingContext2D, o: SmoothTruck): void {
  const S = scaleOf(c), dir = o.facing;
  const cx = Math.round(o.x * S) / S, gy = Math.round(o.y);
  const sp = sprite(`truck-${o.toneKey}-${dir}`, S, -120, -72, 240, 80, (k, layer) => paintTruck(k, o.tarpTone, dir, layer));
  blit(c, sp.under, cx + sp.x0, gy + sp.y0, S);
  const X = (x: number) => cx + x * dir;
  const fr = (x: number, y: number, w: number, h: number, colour: string | CanvasGradient) => { c.fillStyle = colour; c.fillRect(dir > 0 ? cx + x : cx - x - w, gy + y, w, h); };
  if (o.cut > 0) {
    const y = -44, len = 96 * Math.min(1, o.cut), x0 = -74;
    if (o.cut < 1) {
      fr(x0, y - 0.4, len, 1.2, '#0b0e10');
      fr(x0, y + 0.8, len, 0.5, rgba(o.tarpTone.light, 0.6));
      fr(x0 + len - 3, y - 1, 4, 3, '#f5f1d8');
      if (Math.floor(o.elapsed * 14) % 2 === 0) glow(c, X(x0 + len + 2), gy + y - 1, 4, '#ffe28a', 0.9);
    } else {
      // Open: the flaps peel back to show the load inside.
      const hole = c.createLinearGradient(0, gy + y - 20, 0, gy + y + 20);
      hole.addColorStop(0, '#050607'); hole.addColorStop(1, '#1d2226');
      fr(x0, y - 20, 96, 40, hole);
      const n = Math.min(6, o.crates);
      for (let i = 0; i < n; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const bx = x0 + 10 + col * 26, by = y + 16 - row * 17;
        const wood = c.createLinearGradient(0, gy + by - 15, 0, gy + by);
        wood.addColorStop(0, '#c99a5a'); wood.addColorStop(1, '#8a5f30');
        fr(bx, by - 15, 22, 15, wood);
        fr(bx, by - 15, 22, 1.2, '#e2bb7c');
        for (const k of [4.5, 9.5]) fr(bx, by - 15 + k, 22, 0.4, 'rgba(60, 36, 12, 0.5)');
        fr(bx + 9, by - 15, 4, 15, '#e8d9a0');
        fr(bx, by - 1, 22, 1, '#5a3b1c');
      }
      const flap = (pts: Pt[]) => {
        c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(X(px), gy + py) : c.moveTo(X(px), gy + py)); c.closePath();
        c.fillStyle = o.tarpTone.dark; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke();
      };
      flap([[x0 - 2, y - 22], [x0 + 20, y - 20], [x0 + 6, y - 2], [x0 - 2, y + 6]]);
      flap([[x0 + 98, y - 22], [x0 + 76, y - 20], [x0 + 90, y - 2], [x0 + 98, y + 6]]);
    }
  }
  if (o.lights) {
    c.fillStyle = '#fffbe6'; c.fillRect(X(103.2) - 1.2, gy - 20, 2.4, 3.6);
    glow(c, X(103.5), gy - 18.4, 9, '#fff4c8', 0.6);
  }
  for (const wx of [-88, -70, -52]) wheel(c, X(wx), gy - 8, 8.5, o.wheel, 'steel', 6);
  for (const wx of [62, 84]) wheel(c, X(wx), gy - 9, 8.5, o.wheel, 'steel', 6);
}
