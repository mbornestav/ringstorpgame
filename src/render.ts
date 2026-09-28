import { buildingFront, roofGeometry, signedArea } from './buildings';
import { MapCamera } from './camera';
import { TILE_X, TILE_Y, distance, normalize, orientedCorners, pointInShape, type Vec2 } from './geometry';
import type { Enemy, Game, Player } from './game';
import { CROSSINGS, FOOTPRINTS, METRES_PER_UNIT, distanceToPolygon, nearestRoad, surfaceAt } from './map';
import { HOME, KIOSK_FORECOURT, MARCUS_A, PACKAGE, PROPS, ROUTES, START, propCorners, type Prop } from './world';

const MARCUS_HOUSE = PROPS.find(p => p.role === 'marcus');
const HOME_HOUSE = PROPS.find(p => p.role === 'home');

export const WIDTH = 480;
export const HEIGHT = 270;

type Point = { x: number; y: number };
type RGB = [number, number, number];
/** A cached drawing, positioned relative to its prop's anchor point on screen. */
interface Sprite { canvas: HTMLCanvasElement; ox: number; oy: number; w: number; h: number; mask: Uint8Array }
/** A vertical wall: base line from (ax, ay) along (dx, dy) for len units, facing (nx, ny). */
interface Face { ax: number; ay: number; dx: number; dy: number; len: number; nx: number; ny: number }
interface Actor { pos: Vec2; depth: number; draw: () => void; fades: boolean }
interface Item { prop: Prop; sprite: Sprite; at: Point; depth: number }
/** Local frame of an oriented prop: world = origin + x·(c, s) + y·(−s, c). */
interface Frame { ox: number; oy: number; c: number; s: number }

/** Pixels of height per world unit, so slopes and walls are lit consistently. */
const Z_UNIT = 20;
/** A clear afternoon sun from the south-south-west, which lights the scene from the right of the screen. */
const SUN = (() => { const l = Math.hypot(0.72, -0.12, 0.56); return { x: 0.72 / l, y: -0.12 / l, z: 0.56 / l }; })();
/** Ground offset of a shadow per pixel of height. */
const SHADOW = { x: -SUN.x / SUN.z / Z_UNIT, y: -SUN.y / SUN.z / Z_UNIT };
const AMBIENT = 0.6, DIFFUSE = 0.52, NORM = AMBIENT + DIFFUSE * SUN.z;
const OUTLINE = 'rgba(28, 24, 36, 0.62)';
const CHUNK = 256;
const OCCLUDERS = new Set(['building', 'tree', 'shelter']);
const ORIENTED = new Set(['building', 'car', 'shelter', 'bench', 'fence', 'hedge']);

function clamp255(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }
function rgb(color: string): RGB { const n = parseInt(color.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(c: RGB): string { return '#' + ((1 << 24) | (clamp255(c[0]) << 16) | (clamp255(c[1]) << 8) | clamp255(c[2])).toString(16).slice(1); }
function shade(color: string, k: number): string { const c = rgb(color); return hex([c[0] * k, c[1] * k, c[2] * k]); }
function mix(a: string, b: string, t: number): string { const p = rgb(a), q = rgb(b); return hex([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]); }

/** Warm direct light and cool ambient, normalised so flat ground keeps its colour. */
function lightFactors(nx: number, ny: number, nz: number, out: RGB): RGB {
  const len = Math.hypot(nx, ny, nz) || 1;
  const d = Math.max(0, (nx * SUN.x + ny * SUN.y + nz * SUN.z) / len);
  out[0] = (AMBIENT * 0.88 + DIFFUSE * d * 1.3) / NORM;
  out[1] = (AMBIENT * 0.95 + DIFFUSE * d * 1.0) / NORM;
  out[2] = (AMBIENT * 1.12 + DIFFUSE * d * 0.62) / NORM;
  return out;
}
const litCache = new Map<string, string>();
const factors: RGB = [0, 0, 0];
function litWorld(color: string, nx: number, ny: number, nz: number): string {
  const key = `${color}${nx.toFixed(2)},${ny.toFixed(2)},${nz.toFixed(2)}`;
  let out = litCache.get(key);
  if (!out) {
    const c = rgb(color);
    lightFactors(nx, ny, nz, factors);
    out = hex([c[0] * factors[0], c[1] * factors[1], c[2] * factors[2]]);
    litCache.set(key, out);
  }
  return out;
}

function rand(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = rand(ix, iy), b = rand(ix + 1, iy), c = rand(ix, iy + 1), d = rand(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** Canopy radius in pixels: tall forest beeches spread wide enough to close the canopy. */
const treeRadius = (variant: number, height: number) => variant === 4 || variant === 3 ? 8 : variant === 2 ? 10 : Math.min(19, 8 + height * 0.26);
const pick = <T,>(list: T[], seed: number): T => list[((seed % list.length) + list.length) % list.length];

function hull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [], upper: Point[] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** A 3x5 pixel font for signs; diacritics sit on an extra row above. */
const GLYPHS: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'], '-': ['...', '...', '###', '...', '...'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'], '·': ['...', '...', '.#.', '...', '...'], '.': ['...', '...', '...', '...', '.#.'],
  ' ': ['...', '...', '...', '...', '...'],
};
const ACCENTS: Record<string, [string, string]> = { Å: ['A', '.#.'], Ä: ['A', '#.#'], Ö: ['O', '#.#'], É: ['E', '..#'] };

// ---------------------------------------------------------------- ground, evaluated per pixel

const px: RGB = [0, 0, 0];
function set(r: number, g: number, b: number): void { px[0] = r; px[1] = g; px[2] = b; }
function grassColour(x: number, y: number, sx: number, sy: number, lush: number): void {
  const n = vnoise(x * 0.9, y * 0.9) * 0.6 + vnoise(x * 3.1 + 50, y * 3.1) * 0.4;
  const g = (rand(sx, sy) - 0.5) * 16;
  set(86 + n * 46 - lush * 10 + g * 0.5, 128 + n * 40 + lush * 4 + g, 62 + n * 20 - lush * 4 + g * 0.3);
  const t = rand(sx * 7 + 1, sy * 3);
  if (t > 0.93) set(px[0] * 0.8, px[1] * 0.84, px[2] * 0.8);
  if (t > 0.9978 - lush * 0.0015) {
    const f = rand(sx, sy * 5) * 3 | 0;
    if (f === 0) set(242, 238, 222); else if (f === 1) set(238, 204, 86); else set(214, 132, 150);
  }
}
function groundColour(x: number, y: number, sx: number, sy: number): void {
  const s = surfaceAt(x, y);
  const grain = rand(sx, sy) - 0.5;
  if (!['road', 'curb', 'walk'].includes(s.kind) && pointInShape({ x, y }, KIOSK_FORECOURT, 0)) {
    const v = grain * 9 + vnoise(x * 2, y * 2) * 7;
    set(116 + v, 118 + v, 113 + v);
    return;
  }
  switch (s.kind) {
    case 'road': {
      const road = s.road!;
      let v = vnoise(x * 1.7, y * 1.7) * 10 - 5 + grain * 9;
      const cellX = Math.floor(x / 2.3), cellY = Math.floor(y / 1.6), fx = x / 2.3 - cellX, fy = y / 1.6 - cellY;
      if (rand(cellX + 900, cellY) > 0.87 && fx > 0.15 && fx < 0.8 && fy > 0.2 && fy < 0.75) v -= 8;
      if (road.hw - Math.abs(s.offset) < 0.14) v -= 10;
      if (road.hw > 1.5 && Math.abs(Math.abs(s.offset) - road.hw * 0.5) < 0.3) v -= 4;
      if (rand(sx * 3, sy) > 0.97) v += 14;
      const service = road.kind === 'service';
      set((service ? 104 : 88) + v, (service ? 104 : 93) + v, (service ? 106 : 101) + v);
      if (s.roads === 1 && road.kind === 'tertiary' && Math.abs(s.offset) < 0.07 && s.along % 3.2 < 1.4) set(236, 234, 224);
      const m = s.along % 23;
      if (s.roads === 1 && road.hw > 1.2 && m > 11 && m < 11.6 && Math.abs(s.offset - road.hw * 0.45) < 0.28) set(66, 70, 76);
      break;
    }
    case 'curb': { const v = grain * 10; set(196 + v, 192 + v, 184 + v); break; }
    case 'walk': {
      const ix = Math.floor(x * 2), iy = Math.floor(y * 2), fx = x * 2 - ix, fy = y * 2 - iy;
      if (fx < 0.07 || fy < 0.08) { const v = grain * 6; set(150 + v, 144 + v, 135 + v); break; }
      const v = (rand(ix, iy) - 0.5) * 12 + grain * 7 + (vnoise(x * 0.7, y * 0.7) - 0.5) * 10;
      set(182 + v, 176 + v, 165 + v);
      break;
    }
    case 'footway': { const v = grain * 9 + vnoise(x * 2, y * 2) * 6; set(150 + v, 146 + v, 140 + v); break; }
    case 'path': { const v = grain * 22 + (rand(sx * 5, sy * 3) > 0.9 ? -24 : 0); set(176 + v, 150 + v, 108 + v * 0.8); break; }
    case 'rail': {
      const off = Math.abs(s.offset);
      const v = grain * 20;
      set(128 + v, 116 + v, 102 + v);
      if (off < 1.05 && (s.along * 3) % 1 < 0.34) set(96 + v * 0.5, 72 + v * 0.5, 54 + v * 0.5);
      if (Math.abs(off - 0.72) < 0.07) set(176, 178, 180);
      if (Math.abs(off - 0.66) < 0.05) set(78, 76, 74);
      break;
    }
    case 'lawn': grassColour(x, y, sx, sy, 1); break;
    case 'grass': case 'park': grassColour(x, y, sx, sy, 0); break;
    case 'allotments': {
      grassColour(x, y, sx, sy, 1);
      if ((x * 1.3 + y * 0.4) % 2 < 0.8) set(118 + grain * 20, 90 + grain * 16, 62 + grain * 10);
      break;
    }
    case 'forest': {
      const n = vnoise(x * 1.3, y * 1.3), leaf = vnoise(x * 5, y * 5);
      const v = grain * 18;
      if (vnoise(x * 2 + 20, y * 2) > 0.72) set(112 + v, 88 + v, 58 + v);
      else set(52 + n * 30 + leaf * 18 + v, 82 + n * 30 + leaf * 16 + v, 44 + n * 12 + v * 0.5);
      if (rand(sx * 3, sy * 7) > 0.95) set(px[0] * 0.66, px[1] * 0.7, px[2] * 0.68);
      else if (rand(sx * 5, sy * 3) > 0.985) set(160, 122, 66);
      break;
    }
    case 'pitch': {
      const stripe = Math.floor((x + y) / 1.5) % 2 ? 8 : -4;
      set(88 + stripe + grain * 8, 146 + stripe + grain * 10, 70 + grain * 6);
      break;
    }
    case 'playground': { const v = grain * 16; set(214 + v, 186 + v, 136 + v); break; }
    case 'parking': case 'school': {
      const v = vnoise(x * 1.7, y * 1.7) * 8 + grain * 9;
      set(112 + v, 114 + v, 116 + v);
      break;
    }
  }
}

export class Renderer {
  readonly view = new MapCamera();
  readonly canvas: HTMLCanvasElement;
  readonly screen: CanvasRenderingContext2D;
  /** The context drawing primitives target; swapped while baking chunks and sprites. */
  private ctx: CanvasRenderingContext2D;
  private camera: Point = { x: 0, y: 0 };
  /** Integer camera actually used for drawing, so pixel art never shimmers. */
  private cam: Point = { x: 0, y: 0 };
  private lift = 0;
  private frame: Frame | null = null;
  private initialized = false;
  private warmed = false;
  private elapsed = 0;
  private readonly chunks = new Map<number, HTMLCanvasElement>();
  /** A ground chunk being baked a few rows per frame ahead of the camera. */
  private pending: { key: number; cx: number; cy: number; image: ImageData; row: number } | null = null;
  private readonly sprites = new Map<Prop | string, Sprite>();
  private readonly anchors = new Map<Prop, Point>();
  private shadowBoxes: Array<{ prop: Prop; x0: number; y0: number; x1: number; y1: number }> | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.screen = context;
    this.ctx = context;
    context.imageSmoothingEnabled = false;
  }

  resetCamera(): void { this.initialized = false; }

  setView(step: number): void {
    if (!this.view.setStep(step)) return;
    this.chunks.clear();
    this.sprites.clear();
    this.anchors.clear();
    this.shadowBoxes = null;
    this.pending = null;
    this.resetCamera();
  }

  private pt(x: number, y: number, z = 0): Point {
    let wx = x, wy = y;
    const f = this.frame;
    if (f) { wx = f.ox + x * f.c - y * f.s; wy = f.oy + x * f.s + y * f.c; }
    const p = this.view.project(wx, wy);
    return { x: Math.round(p.x) - this.cam.x, y: Math.round(p.y - z - this.lift) - this.cam.y };
  }

  /** Lights a colour for a surface normal given in the current prop's local frame. */
  private lit(color: string, nx: number, ny: number, nz: number): string {
    const f = this.frame;
    return f ? litWorld(color, nx * f.c - ny * f.s, nx * f.s + ny * f.c, nz) : litWorld(color, nx, ny, nz);
  }

  private bake(ctx: CanvasRenderingContext2D, origin: Point, draw: () => void): void {
    const saved = { ctx: this.ctx, cam: this.cam, lift: this.lift, frame: this.frame };
    this.ctx = ctx; this.cam = origin; this.lift = 0; this.frame = null;
    try { draw(); } finally { this.ctx = saved.ctx; this.cam = saved.cam; this.lift = saved.lift; this.frame = saved.frame; }
  }

  // ---------------------------------------------------------------- frame

  render(game: Game, dt: number): void {
    this.elapsed += dt;
    if (!this.warmed) { this.warmed = true; this.warmUp(START); }
    const c = this.screen;
    const focusPos = game.mode === 'title' ? this.attractPoint() : game.player.pos;
    const focus = this.view.project(focusPos.x, focusPos.y);
    const target = { x: focus.x - WIDTH * 0.45, y: focus.y - HEIGHT * 0.56 };
    if (!this.initialized) {
      this.camera = target;
      this.initialized = true;
    } else {
      const t = Math.min(1, dt * (game.mode === 'title' ? 2 : 6));
      this.camera.x += (target.x - this.camera.x) * t;
      this.camera.y += (target.y - this.camera.y) * t;
    }
    this.cam = { x: Math.round(this.camera.x), y: Math.round(this.camera.y) };
    this.ctx = c;
    this.lift = 0;
    this.frame = null;

    c.fillStyle = '#5f8a45';
    c.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawGround();
    this.drawCloudShadows();
    this.drawRoute(game);
    this.drawScene(game);
    this.drawMarkers(game);
    this.drawGulls();
    this.drawAtmosphere();
    this.drawTargetArrow(game);
    if (game.messageTimer > 0 && game.mode === 'playing') this.drawMessage(game.message, game.messageTimer);
  }

  /** Bakes the ground and sprites around a point up front, so starting a run doesn't stall. */
  private warmUp(point: Vec2): void {
    const f = this.view.project(point.x, point.y);
    const cx = Math.round(f.x - WIDTH * 0.45), cy = Math.round(f.y - HEIGHT * 0.56);
    for (let y = Math.floor((cy - CHUNK) / CHUNK); y <= Math.floor((cy + HEIGHT + CHUNK) / CHUNK); y++) {
      for (let x = Math.floor((cx - CHUNK) / CHUNK); x <= Math.floor((cx + WIDTH + CHUNK) / CHUNK); x++) this.chunk(x, y);
    }
    for (const prop of PROPS) {
      const a = this.anchorOf(prop);
      if (a.x > cx - 200 && a.x < cx + WIDTH + 200 && a.y > cy - 60 && a.y < cy + HEIGHT + 260) this.spriteFor(prop);
    }
  }

  /** A slow drive along the direct route behind the title screen. */
  private attractPoint(): Vec2 {
    const path = ROUTES.direct;
    const lengths = path.slice(1).map((p, i) => distance(p, path[i]));
    const total = lengths.reduce((a, b) => a + b, 0);
    let s = (Math.sin(this.elapsed * 0.02 - Math.PI / 2) * 0.5 + 0.5) * total;
    for (let i = 0; i < lengths.length; i++) {
      if (s <= lengths[i]) { const t = s / lengths[i]; return { x: path[i].x + (path[i + 1].x - path[i].x) * t, y: path[i].y + (path[i + 1].y - path[i].y) * t }; }
      s -= lengths[i];
    }
    return path[path.length - 1];
  }

  private anchorOf(prop: Prop): Point {
    let a = this.anchors.get(prop);
    if (!a) { const p = this.view.project(prop.x, prop.y); a = { x: Math.round(p.x), y: Math.round(p.y) }; this.anchors.set(prop, a); }
    return a;
  }

  private drawScene(game: Game): void {
    const c = this.ctx;
    const items: Item[] = [];
    const vx0 = this.cam.x - 200, vx1 = this.cam.x + WIDTH + 200, vy0 = this.cam.y - 60, vy1 = this.cam.y + HEIGHT + 260;
    for (const prop of PROPS) {
      const a = this.anchorOf(prop);
      if (a.x < vx0 || a.x > vx1 || a.y < vy0 || a.y > vy1) continue;
      const sprite = this.spriteFor(prop);
      const sx = a.x + sprite.ox - this.cam.x, sy = a.y + sprite.oy - this.cam.y;
      if (sx > WIDTH || sy > HEIGHT || sx + sprite.w < 0 || sy + sprite.h < 0) continue;
      items.push({ prop, sprite, at: { x: sx, y: sy }, depth: this.depthOf(prop) });
    }
    items.sort((a, b) => a.depth - b.depth);

    const actors: Actor[] = [];
    if (!game.hasPackage) actors.push({ pos: PACKAGE, depth: this.view.depth(PACKAGE.x, PACKAGE.y), draw: () => this.drawPackage(PACKAGE.x, PACKAGE.y), fades: false });
    actors.push({ pos: game.player.pos, depth: this.view.depth(game.player.pos.x, game.player.pos.y), draw: () => this.drawPlayer(game.player, game.hasPackage), fades: game.mode !== 'title' });
    for (const enemy of game.enemies) actors.push({ pos: enemy.pos, depth: this.view.depth(enemy.pos.x, enemy.pos.y), draw: () => this.drawEnemy(enemy), fades: enemy.state !== 'ko' });
    actors.sort((a, b) => a.depth - b.depth);

    // Each actor goes after every overlapping prop it stands in front of and before those it stands behind.
    const slots: Actor[][] = items.map(() => []);
    const tail: Actor[] = [];
    const faded = new Set<number>();
    for (const actor of actors) {
      const s = this.pt(actor.pos.x, actor.pos.y);
      if (s.x < -40 || s.x > WIDTH + 40 || s.y < -40 || s.y > HEIGHT + 60) continue;
      let lo = 0, hi = items.length;
      let index = items.findIndex(item => item.depth > actor.depth);
      if (index < 0) index = items.length;
      items.forEach((item, i) => {
        const { at, sprite } = item;
        if (s.x + 9 < at.x || s.x - 9 > at.x + sprite.w || s.y + 3 < at.y || s.y - 26 > at.y + sprite.h) return;
        if (this.inFront(actor.pos, item.prop)) lo = Math.max(lo, i + 1);
        else {
          hi = Math.min(hi, i);
          if (actor.fades && OCCLUDERS.has(item.prop.kind) && this.covers(item, s)) faded.add(i);
        }
      });
      index = lo <= hi ? Math.max(lo, Math.min(hi, index)) : lo;
      (index < items.length ? slots[index] : tail).push(actor);
    }
    items.forEach((item, i) => {
      for (const actor of slots[i]) actor.draw();
      if (faded.has(i)) c.globalAlpha = 0.42;
      c.drawImage(item.sprite.canvas, item.at.x, item.at.y);
      c.globalAlpha = 1;
    });
    for (const actor of tail) actor.draw();
  }

  /** Compare the actor with the nearest footprint edge at its projected horizontal position. */
  private inFront(pos: Vec2, p: Prop): boolean {
    if (p.footprint) {
      const actor = this.view.project(pos.x, pos.y);
      const outline = p.footprint.pts.map(q => this.view.project(q.x, q.y));
      let nearest = -Infinity;
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i], b = outline[(i + 1) % outline.length];
        if (actor.x < Math.min(a.x, b.x) || actor.x > Math.max(a.x, b.x)) continue;
        const t = Math.abs(b.x - a.x) < 1e-8 ? 0 : (actor.x - a.x) / (b.x - a.x);
        nearest = Math.max(nearest, a.y + (b.y - a.y) * t);
      }
      return Number.isFinite(nearest) ? actor.y >= nearest - 0.1 : this.view.depth(pos.x, pos.y) >= this.view.depth(p.x, p.y);
    }
    const frame = this.view.frame(p.angle, p.w, p.h);
    const c = Math.cos(frame.angle), s = Math.sin(frame.angle);
    const dx = pos.x - p.x, dy = pos.y - p.y;
    return dx * c + dy * s >= frame.w / 2 || -dx * s + dy * c >= frame.h / 2;
  }

  private depthOf(p: Prop): number {
    if (p.kind === 'tree' || p.kind === 'bush') return this.view.depth(p.x, p.y) + 0.4;
    return Math.max(...(p.footprint?.pts ?? propCorners(p)).map(q => this.view.depth(q.x, q.y)));
  }

  private covers(item: Item, s: Point): boolean {
    const { sprite, at } = item;
    for (const dy of [-6, -13, -19]) {
      const lx = s.x - at.x, ly = s.y + dy - at.y;
      if (lx >= 0 && ly >= 0 && lx < sprite.w && ly < sprite.h && sprite.mask[ly * sprite.w + lx]) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- sprites

  private spriteFor(prop: Prop): Sprite {
    const key: Prop | string = prop.kind === 'tree' ? `tree${prop.variant}:${prop.height}` : prop.kind === 'bush' ? `bush${prop.variant}` : prop;
    const cached = this.sprites.get(key);
    if (cached) return cached;
    const anchor = this.anchorOf(prop);
    const corners = propCorners(prop).map(q => this.view.project(q.x, q.y));
    const left = Math.floor(Math.min(...corners.map(p => p.x)) - anchor.x) - 64;
    const right = Math.ceil(Math.max(...corners.map(p => p.x)) - anchor.x) + 64;
    const top = Math.floor(Math.min(...corners.map(p => p.y)) - anchor.y - (prop.height || 0)) - 110;
    const bottom = Math.ceil(Math.max(...corners.map(p => p.y)) - anchor.y) + 24;
    const scratch = document.createElement('canvas');
    scratch.width = right - left;
    scratch.height = bottom - top;
    const sctx = scratch.getContext('2d', { willReadFrequently: true })!;
    this.bake(sctx, { x: anchor.x + left, y: anchor.y + top }, () => this.drawProp(prop));
    const data = sctx.getImageData(0, 0, scratch.width, scratch.height).data;
    let x0 = scratch.width, y0 = scratch.height, x1 = -1, y1 = -1;
    for (let y = 0; y < scratch.height; y++) {
      for (let x = 0; x < scratch.width; x++) {
        if (data[(y * scratch.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.drawImage(scratch, -x0, -y0);
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * w + x] = data[((y + y0) * scratch.width + x + x0) * 4 + 3] > 96 ? 1 : 0;
    const sprite = { canvas, ox: left + x0, oy: top + y0, w, h, mask };
    this.sprites.set(key, sprite);
    return sprite;
  }

  private drawProp(prop: Prop): void {
    if (prop.kind === 'building') { this.drawBuilding(prop); return; }
    if (ORIENTED.has(prop.kind)) {
      const axes = this.view.frame(prop.angle, prop.w, prop.h);
      prop = { ...prop, ...axes };
      const c = Math.cos(prop.angle), s = Math.sin(prop.angle);
      this.frame = { ox: prop.x - (prop.w / 2) * c + (prop.h / 2) * s, oy: prop.y - (prop.w / 2) * s - (prop.h / 2) * c, c, s };
      const local: Prop = { ...prop, x: 0, y: 0 };
      switch (prop.kind) {
        case 'car': this.drawCar(local); break;
        case 'shelter': this.drawShelter(local); break;
        case 'bench': this.drawBench(local); break;
        case 'fence': this.drawFence(local); break;
        default: break;
      }
      this.frame = null;
      return;
    }
    switch (prop.kind) {
      case 'tree': this.drawTree(prop); break;
      case 'bush': this.drawBush(prop); break;
      case 'lamp': this.drawLamp(prop); break;
      case 'sign': this.drawSign(prop); break;
      case 'busstop': this.drawBusStop(prop); break;
      case 'crossing': this.drawCrossingSign(prop); break;
      case 'postbox': this.drawPostbox(prop); break;
      case 'bin': this.drawBin(prop); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- primitives

  private poly(points: Point[], fill: string, stroke?: string): void {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }

  private shape(points: number[][], fill: string): void {
    this.poly(points.map(([x, y, z]) => this.pt(x, y, z)), fill);
  }

  /** Crisp one-pixel line (Bresenham) between two screen points. */
  private line(a: Point, b: Point, color: string): void {
    const c = this.ctx;
    c.fillStyle = color;
    let x0 = a.x, y0 = a.y;
    const dx = Math.abs(b.x - x0), dy = -Math.abs(b.y - y0), sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 3000; guard++) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === b.x && y0 === b.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  private line3(a: number[], b: number[], color: string): void {
    this.line(this.pt(a[0], a[1], a[2]), this.pt(b[0], b[1], b[2]), color);
  }

  /** A lit box in the current frame; the visible faces are its +x wall, +y wall and top. */
  private box(x: number, y: number, w: number, h: number, z0: number, z1: number, color: string, top = color, outline = true): void {
    this.shape([[x + w, y, z0], [x + w, y + h, z0], [x + w, y + h, z1], [x + w, y, z1]], this.lit(color, 1, 0, 0));
    this.shape([[x, y + h, z0], [x + w, y + h, z0], [x + w, y + h, z1], [x, y + h, z1]], this.lit(color, 0, 1, 0));
    this.shape([[x, y, z1], [x + w, y, z1], [x + w, y + h, z1], [x, y + h, z1]], this.lit(top, 0, 0, 1));
    if (outline) this.outlineBox(x, y, w, h, z0, z1);
  }

  private outlineBox(x: number, y: number, w: number, h: number, z0: number, z1: number): void {
    this.line3([x, y + h, z0], [x, y + h, z1], OUTLINE);
    this.line3([x + w, y, z0], [x + w, y, z1], OUTLINE);
    this.line3([x, y + h, z1], [x, y, z1], OUTLINE);
    this.line3([x, y, z1], [x + w, y, z1], OUTLINE);
    this.line3([x + w, y + h, z0 + 1], [x + w, y + h, z1], 'rgba(255, 236, 200, 0.28)');
  }

  private faces(x: number, y: number, w: number, h: number): { left: Face; right: Face } {
    return {
      left: { ax: x, ay: y + h, dx: 1, dy: 0, len: w, nx: 0, ny: 1 },
      right: { ax: x + w, ay: y, dx: 0, dy: 1, len: h, nx: 1, ny: 0 },
    };
  }

  private fp(f: Face, u: number, z: number, out = 0): Point {
    return this.pt(f.ax + f.dx * u + f.nx * out, f.ay + f.dy * u + f.ny * out, z);
  }

  private fquad(f: Face, u0: number, u1: number, z0: number, z1: number, fill: string, out = 0): void {
    this.poly([this.fp(f, u0, z0, out), this.fp(f, u1, z0, out), this.fp(f, u1, z1, out), this.fp(f, u0, z1, out)], fill);
  }

  private faceLit(f: Face, color: string): string { return this.lit(color, f.nx, f.ny, 0); }

  private clip(points: Point[], draw: () => void): void {
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) c.lineTo(p.x, p.y);
    c.closePath();
    c.clip();
    draw();
    c.restore();
  }

  /** Brick courses and speckle, plaster mottling or vertical boarding over a wall. */
  private texture(f: Face, z0: number, z1: number, color: string, kind: 'brick' | 'plaster' | 'wood', seed: number): void {
    const base = this.faceLit(f, color);
    const dark = shade(base, kind === 'plaster' ? 0.94 : 0.86), light = mix(base, '#fff4dc', kind === 'plaster' ? 0.1 : 0.14);
    this.clip([this.fp(f, 0, z0), this.fp(f, f.len, z0), this.fp(f, f.len, z1), this.fp(f, 0, z1)], () => {
      const c = this.ctx;
      if (kind === 'brick') for (let z = z0 + 2; z < z1; z += 2) this.line(this.fp(f, 0, z), this.fp(f, f.len, z), shade(base, 0.9));
      if (kind === 'wood') for (let u = 0.14; u < f.len; u += 0.16) this.line(this.fp(f, u, z0), this.fp(f, u, z1), shade(base, 0.86));
      const count = Math.floor(f.len * (z1 - z0) * (kind === 'plaster' ? 0.5 : 1.3));
      for (let i = 0; i < count; i++) {
        const p = this.fp(f, rand(seed + i, 11) * f.len, z0 + rand(seed + i, 23) * (z1 - z0));
        c.fillStyle = rand(seed + i, 37) > 0.5 ? dark : light;
        c.fillRect(p.x, p.y, kind === 'brick' ? 2 : 1, 1);
      }
    });
  }

  private sunlit(f: Face): boolean {
    const fr = this.frame;
    const nx = fr ? f.nx * fr.c - f.ny * fr.s : f.nx, ny = fr ? f.nx * fr.s + f.ny * fr.c : f.ny;
    return nx * SUN.x + ny * SUN.y > 0.25;
  }

  private window(f: Face, u: number, z: number, ww: number, wh: number, seed: number, frame = '#efe9dc', cross = false, warm = false, reference = false): void {
    const sunlit = this.sunlit(f);
    const r = rand(seed, 77);
    const lamp = warm || (!reference && r > 0.93);
    const glass = reference ? '#3d4b50' : lamp ? '#f4c877' : sunlit ? (r > 0.6 ? '#e6a55c' : '#6f8ea3') : '#3d5063';
    const shine = reference ? '#6d8085' : lamp ? '#fff0b8' : sunlit ? '#f7d9a0' : '#7892a6';
    const fr = this.faceLit(f, frame);
    this.fquad(f, u - ww / 2 - 0.07, u + ww / 2 + 0.07, z - 1, z + wh + 1, fr);
    this.fquad(f, u - ww / 2, u + ww / 2, z, z + wh, glass);
    this.fquad(f, u - ww / 2, u + ww / 2, z + wh * 0.62, z + wh, shine);
    this.fquad(f, u - 0.035, u + 0.035, z, z + wh, fr);
    if (cross) this.fquad(f, u - ww / 2, u + ww / 2, z + wh * 0.55, z + wh * 0.55 + 1, fr);
    this.fquad(f, u - ww / 2 - 0.1, u + ww / 2 + 0.1, z - 2, z - 1, shade(fr, 0.8));
  }

  private door(f: Face, u: number, z: number, width: number, height: number, color: string): void {
    this.fquad(f, u - width / 2 - 0.07, u + width / 2 + 0.07, z, z + height + 1, this.faceLit(f, '#e8e2d4'));
    this.fquad(f, u - width / 2, u + width / 2, z, z + height, this.faceLit(f, color));
    this.fquad(f, u - width / 2 + 0.06, u + width / 2 - 0.06, z + height * 0.55, z + height - 1, '#5d7488');
  }

  private pixelText(text: string, x: number, y: number, color: string): void {
    const c = this.ctx;
    c.fillStyle = color;
    [...text].forEach((ch, i) => {
      const accent = ACCENTS[ch];
      const rows = GLYPHS[accent ? accent[0] : ch] ?? GLYPHS[' '];
      const gx = x + i * 4;
      rows.forEach((row, r) => { for (let k = 0; k < 3; k++) if (row[k] === '#') c.fillRect(gx + k, y + r, 1, 1); });
      if (accent) for (let k = 0; k < 3; k++) if (accent[1][k] === '#') c.fillRect(gx + k, y - 2, 1, 1);
    });
  }

  // ---------------------------------------------------------------- buildings

  /** Every wall follows the mapped polygon; facades and roof ridges stay fixed in world space. */
  private drawBuilding(p: Prop): void {
    const appearance = p.appearance!, footprint = p.footprint!;
    const H = appearance.eaves, seed = p.variant || 0;
    const ring = signedArea(footprint.pts) > 0 ? footprint.pts : [...footprint.pts].reverse();
    const faces: Face[] = ring.map((a, i) => {
      const b = ring[(i + 1) % ring.length], len = Math.hypot(b.x - a.x, b.y - a.y);
      const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
      return { ax: a.x, ay: a.y, dx, dy, len, nx: dy, ny: -dx };
    }).filter(f => f.len > 0.05);
    const road = nearestRoad(p.x, p.y);
    const entrance = p.role === 'home' ? HOME : p.role === 'marcus' ? MARCUS_A : p.role === 'kiosk' ? PACKAGE : road ?? { x: p.x, y: p.y + 1 };
    const front = buildingFront(footprint, entrance);
    const angle = Math.atan2(front.dy, front.dx), c = Math.cos(angle), s = Math.sin(angle);
    const us = ring.map(q => q.x * c + q.y * s), vs = ring.map(q => -q.x * s + q.y * c);
    const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
    const w = u1 - u0, h = v1 - v0, um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
    const cx = um * c - vm * s, cy = um * s + vm * c;
    const toWorld = (u: number, v: number): Vec2 => ({ x: cx + u * c - v * s, y: cy + u * s + v * c });
    const ridgeAlongX = appearance.model === 'kiosk' ? false : appearance.model === 'generic' ? w >= h : true;
    const geometry = roofGeometry(ring, angle, w, h, cx, cy, appearance, ridgeAlongX);
    const visible = faces.filter(f => this.view.depth(f.nx, f.ny) > 0.001)
      .sort((f, g) => this.view.depth(f.ax + f.dx * f.len / 2, f.ay + f.dy * f.len / 2) - this.view.depth(g.ax + g.dx * g.len / 2, g.ay + g.dy * g.len / 2));
    for (const f of visible) {
      // Adjacent terrace homes share party walls; never paint windows through their neighbours.
      const middle = { x: f.ax + f.dx * f.len / 2 + f.nx * 0.08, y: f.ay + f.dy * f.len / 2 + f.ny * 0.08 };
      const shared = appearance.model === 'terrace' && FOOTPRINTS.some(other => other !== footprint && Math.hypot(other.obb.cx - middle.x, other.obb.cy - middle.y) < 12 && distanceToPolygon(middle, other.pts) < 0.1);
      if (shared) continue;
      const cuts = [0, 1];
      for (let i = 0; i < geometry.planes.length; i++) for (let j = i + 1; j < geometry.planes.length; j++) {
        const a = geometry.planes[i], b = geometry.planes[j];
        const delta = (a.a - b.a) * f.dx * f.len + (a.b - b.b) * f.dy * f.len;
        if (Math.abs(delta) < 1e-8) continue;
        const t = -((a.a - b.a) * f.ax + (a.b - b.b) * f.ay + a.c - b.c) / delta;
        if (t > 0 && t < 1) cuts.push(t);
      }
      cuts.sort((a, b) => a - b);
      const top = cuts.map(t => { const q = { x: f.ax + f.dx * f.len * t, y: f.ay + f.dy * f.len * t }; return this.pt(q.x, q.y, geometry.height(q)); });
      const wallPoly = [this.fp(f, 0, 0), this.fp(f, f.len, 0), ...top.reverse()];
      this.poly(wallPoly, this.faceLit(f, appearance.wall));
      this.clip(wallPoly, () => {
        this.texture(f, 0, H + appearance.rise, appearance.wall, appearance.material, seed + Math.round(f.ax * 7));
        this.fquad(f, 0, f.len, 0, appearance.model === 'marcus' ? 5 : 2, this.faceLit(f, '#777b7d'));
        const streetFace = f.nx * front.nx + f.ny * front.ny > 0.9;
        if (appearance.model === 'terrace') this.terraceFacade(f, streetFace, H, seed);
        else if (appearance.model === 'marcus') this.marcusFacade(f, streetFace, H, appearance.rise, seed);
        else if (appearance.model === 'kiosk') this.kioskFacade(f, streetFace, H);
        else {
          const floors = Math.max(1, appearance.floors), fh = (H - 3) / floors;
          const n = Math.max(1, Math.floor(f.len / 1.3));
          for (let k = 0; k < n; k++) for (let fl = 0; fl < floors; fl++) {
            if (streetFace && k === 0 && fl === 0) this.door(f, (k + 0.5) * f.len / n, 2, 0.36, Math.min(9, fh - 1), '#4a4e43');
            else this.window(f, (k + 0.5) * f.len / n, 4 + fl * fh, 0.46, Math.max(3, fh - 5), seed + k * 7 + fl);
          }
        }
      });
      this.line(this.fp(f, 0, 0), this.fp(f, 0, geometry.height({ x: f.ax, y: f.ay })), OUTLINE);
    }
    // Render complete roof planes after the facades. Triangulation preserves every extension and recess.
    const overhang = appearance.model === 'kiosk' ? 0.22 : appearance.model === 'marcus' ? 0.08 : 0;
    const roofRing = overhang ? ring.map(q => {
      const u = (q.x - cx) * c + (q.y - cy) * s, v = -(q.x - cx) * s + (q.y - cy) * c;
      return toWorld(u * (1 + overhang * 2 / w), v * (1 + overhang * 2 / h));
    }) : ring;
    const roof = overhang ? roofGeometry(roofRing, angle, w + overhang * 2, h + overhang * 2, cx, cy, appearance, ridgeAlongX) : geometry;
    const roofDepth = (plane: typeof roof.planes[number]) => {
      const pts = roof.patches.filter(patch => patch.plane === plane).flatMap(patch => patch.pts);
      return pts.reduce((sum, q) => sum + this.view.depth(q.x, q.y), 0) / Math.max(1, pts.length);
    };
    for (const plane of [...roof.planes].sort((a, b) => roofDepth(a) - roofDepth(b))) {
      if (this.view.depth(-plane.a, -plane.b) + 2 * TILE_Y <= 0) continue;
      const patches = roof.patches.filter(patch => patch.plane === plane);
      const color = litWorld(appearance.roof, -plane.a / Z_UNIT, -plane.b / Z_UNIT, 1);
      const zAt = (q: Vec2) => plane.a * q.x + plane.b * q.y + plane.c;
      for (const patch of patches) {
        const screen = patch.pts.map(q => this.pt(q.x, q.y, zAt(q)));
        this.poly(screen, color);
        // World-anchored tile lines remain attached to the roof as the camera turns.
        this.clip(screen, () => {
          for (let v = -h / 2 - overhang; v <= h / 2 + overhang; v += 0.28) {
            const a = toWorld(-w / 2 - overhang, v), b = toWorld(w / 2 + overhang, v);
            this.line(this.pt(a.x, a.y, zAt(a)), this.pt(b.x, b.y, zAt(b)), shade(color, 0.83));
          }
          for (let u = -w / 2 - overhang; u <= w / 2 + overhang; u += 0.22) {
            const a = toWorld(u, -h / 2 - overhang), b = toWorld(u, h / 2 + overhang);
            this.line(this.pt(a.x, a.y, zAt(a)), this.pt(b.x, b.y, zAt(b)), shade(color, 0.94));
          }
        });
      }
    }
    for (let i = 0; i < roofRing.length; i++) {
      const a = roofRing[i], b = roofRing[(i + 1) % roofRing.length];
      const ts = [0, 1];
      for (let j = 0; j < roof.planes.length; j++) for (let k = j + 1; k < roof.planes.length; k++) {
        const p0 = roof.planes[j], p1 = roof.planes[k];
        const denominator = (p0.a - p1.a) * (b.x - a.x) + (p0.b - p1.b) * (b.y - a.y);
        const t = -((p0.a - p1.a) * a.x + (p0.b - p1.b) * a.y + p0.c - p1.c) / denominator;
        if (Number.isFinite(t) && t > 0 && t < 1) ts.push(t);
      }
      ts.sort((a, b) => a - b);
      const edge = ts.map(t => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }));
      for (let k = 1; k < edge.length; k++) this.line(this.pt(edge[k - 1].x, edge[k - 1].y, roof.height(edge[k - 1])), this.pt(edge[k].x, edge[k].y, roof.height(edge[k])), appearance.model === 'kiosk' || appearance.model === 'marcus' ? '#c9cec5' : shade(appearance.roof, 0.65));
    }
    if (appearance.model === 'marcus' || appearance.model === 'terrace') {
      const q = toWorld(w * 0.15, h * 0.09), z = roof.height(q);
      // Fixed position relative to the ridge, independent of viewing angle.
      const axes = this.view.frame(angle, 0.4, 0.42), cc = Math.cos(axes.angle), ss = Math.sin(axes.angle);
      this.frame = { ox: q.x - axes.w / 2 * cc + axes.h / 2 * ss, oy: q.y - axes.w / 2 * ss - axes.h / 2 * cc, c: cc, s: ss };
      this.box(0, 0, axes.w, axes.h, z, z + (appearance.model === 'marcus' ? 12 : 7), '#a99477', '#655e52');
      this.frame = null;
    }
  }

  private referenceWindow(f: Face, u: number, z: number, ww: number, wh: number, seed: number, frame = '#efe9dc', cross = false): void {
    this.window(f, u, z, ww, wh, seed, frame, cross, false, true);
  }

  private terraceFacade(f: Face, front: boolean, H: number, seed: number): void {
    if (!front) {
      for (const z of [5, H * 0.56]) for (const u of [f.len * 0.28, f.len * 0.72]) this.referenceWindow(f, u, z, 0.5, 7, seed, '#e9ece5');
      return;
    }
    this.fquad(f, 0, f.len, 4, H * 0.52, this.faceLit(f, '#e2e5df'));
    for (let z = 5; z < H * 0.52; z += 1.6) this.fquad(f, 0, f.len, z, z + 0.3, this.faceLit(f, '#bec6c2'));
    this.door(f, f.len * 0.18, 4, 0.43, 11, '#d7dcd6');
    this.referenceWindow(f, f.len * 0.67, 8, Math.min(0.85, f.len * 0.32), 6, seed + 4, '#f1f0e5');
    for (const u of [f.len * 0.24, f.len * 0.74]) this.referenceWindow(f, u, H * 0.62, 0.55, 8, seed + Math.round(u * 9), '#f1eee8');
    this.fquad(f, f.len * 0.48, f.len * 0.9, 0, 4, '#747b7b');
    for (let z = 0.7; z < 4; z += 0.8) this.fquad(f, f.len * 0.48, f.len * 0.9, z, z + 0.2, '#a1a8a3');
  }

  private marcusFacade(f: Face, front: boolean, H: number, rise: number, seed: number): void {
    const n = front ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const u = f.len * (k + 0.5) / n, width = 0.6;
      for (const side of [-1, 1]) this.fquad(f, u + side * 0.48 - 0.1, u + side * 0.48 + 0.1, 9, 20, this.faceLit(f, '#353b40'));
      this.referenceWindow(f, u, 10, width, 8, seed + k, '#d8d8c4', true);
    }
    for (const u of [f.len * 0.27, f.len * 0.76]) this.fquad(f, u - 0.2, u + 0.2, 1, 3.5, '#414d50');
    // Only the gable wall extends into this clipped region.
    this.fquad(f, 0, f.len, H, H + rise, this.faceLit(f, '#3b4246'));
    this.texture(f, H, H + rise, '#3b4246', 'wood', seed);
    this.referenceWindow(f, f.len / 2, H + 5, 0.52, 10, seed + 8, '#d8d7c8');
  }

  private kioskFacade(f: Face, front: boolean, H: number): void {
    if (front) {
      this.fquad(f, 0.12, f.len - 0.12, 5, H - 2, '#afb9b5');
      for (let z = 5; z < H - 2; z += 0.8) this.fquad(f, 0.13, f.len - 0.13, z, z + 0.3, '#e0e3d9');
      this.fquad(f, 0.05, f.len - 0.05, 4, 5, this.faceLit(f, '#648e9d'), 0.12);
      this.fquad(f, 0.05, f.len - 0.05, 1, 4, '#e4e4d5');
      this.fquad(f, 0.05, f.len - 0.05, H - 2, H, '#6f929e');
      const label = this.fp(f, f.len / 2, H - 1);
      // Small readable fascia; the gameplay marker remains separate above the building.
      const text = 'SANNAS KIOSK';
      this.pixelText(text, Math.round(label.x - (text.length * 4 - 1) / 2), label.y - 2, '#c87763');
    } else {
      const n = Math.max(2, Math.round(f.len / 0.8));
      for (let k = 0; k < n; k++) {
        const u = f.len * (k + 0.5) / n;
        this.poly([this.fp(f, u - 0.17, 2), this.fp(f, u + 0.17, 2), this.fp(f, u + 0.17, H - 2), this.fp(f, u - 0.17, H - 5)], this.faceLit(f, '#5c736b'));
      }
    }
  }

  // ---------------------------------------------------------------- street furniture and plants

  private drawTree(p: Prop): void {
    const c = this.ctx;
    const H = p.height || 26;
    const v = p.variant || 0;
    const seed = v * 131 + H * 7;
    const pal = [
      ['#2f5a37', '#4a7d3f', '#7aa451', '#b3cf6e', '#6d6a62'],
      ['#4a2430', '#6e3440', '#94505a', '#c98a78', '#5f5850'],
      ['#3f6b33', '#5f8f3d', '#8fb553', '#c4dc7c', '#5b4a3c'],
      ['#4d7a38', '#76a24a', '#a4c865', '#d6e690', '#e8e4da'],
      ['#3a6431', '#588a3c', '#86ae50', '#b0cc72', '#5b4636'],
    ][v];
    const base = this.pt(p.x, p.y);
    const trunkTop = H * (v === 3 ? 0.75 : H > 32 ? 0.5 : 0.6);
    c.fillStyle = shade(pal[4], 0.7); c.fillRect(base.x - 1, base.y - trunkTop, 3, trunkTop + 1);
    c.fillStyle = pal[4]; c.fillRect(base.x - 1, base.y - trunkTop, 2, trunkTop + 1);
    if (v === 3) { c.fillStyle = '#2d2a28'; for (let k = 3; k < trunkTop; k += 4) c.fillRect(base.x - 1 + (k % 2), base.y - k, 1, 1); }
    const R = treeRadius(v, H);
    const blobs: Array<[number, number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const a = rand(seed, i) * Math.PI * 2, d = rand(seed, i + 20) * R * 0.6;
      blobs.push([Math.cos(a) * d, -H + Math.sin(a) * d * 0.7 * (v === 2 ? 1.5 : 1) - (v === 2 ? 3 : 0), R * (0.55 + rand(seed, i + 40) * 0.3)]);
    }
    blobs.push([0, -H, R * 0.8]);
    const disc = (ox: number, oy: number, k: number, color: string) => {
      c.fillStyle = color;
      for (const [bx, by, r] of blobs) { c.beginPath(); c.arc(base.x + bx + ox, base.y + by + oy, Math.max(1, r * k), 0, Math.PI * 2); c.fill(); }
    };
    disc(0, 0, 1, pal[0]);
    disc(0.8, -1, 0.86, pal[1]);
    disc(2.4, -2.6, 0.52, pal[2]);
    for (let i = 0; i < 46; i++) {
      const [bx, by, r] = blobs[i % blobs.length];
      const a = rand(seed + i, 3) * Math.PI * 2, d = rand(seed + i, 4) * r * 0.95;
      const x = Math.round(base.x + bx + Math.cos(a) * d), y = Math.round(base.y + by + Math.sin(a) * d);
      c.fillStyle = Math.cos(a) - Math.sin(a) > 0.2 ? pal[3] : shade(pal[0], 0.8);
      c.fillRect(x, y, 2, 1);
    }
    if (v === 4) for (let i = 0; i < 7; i++) { c.fillStyle = '#c8402e'; c.fillRect(Math.round(base.x - 6 + rand(seed, i + 70) * 12), Math.round(base.y - H - 4 + rand(seed, i + 80) * 8), 1, 1); }
  }

  private drawBush(p: Prop): void {
    const c = this.ctx;
    const b = this.pt(p.x, p.y);
    const v = p.variant || 0;
    const [dark, mid, light] = [['#2f5a32', '#487a3e', '#78a456'], ['#3a5f2e', '#5b8a3c', '#8ab45a'], ['#2f5a32', '#487a3e', '#d77aa0'], ['#355a3a', '#4f7f4a', '#f0e6c8']][v];
    for (const [ox, oy, r, col] of [[0, -3, 4, dark], [1, -4, 3, mid], [2, -5, 1.6, light]] as Array<[number, number, number, string]>) {
      c.fillStyle = col; c.beginPath(); c.arc(b.x + ox, b.y + oy, r, 0, Math.PI * 2); c.fill();
    }
    if (v >= 2) for (let i = 0; i < 5; i++) { c.fillStyle = light; c.fillRect(b.x - 3 + Math.round(rand(v, i) * 6), b.y - 6 + Math.round(rand(i, v) * 4), 1, 1); }
  }

  private drawCar(p: Prop): void {
    const { x, y, w, h } = p;
    const v = p.variant || 0;
    const body = ['#a8322a', '#e8e2d0', '#2b3f63', '#3f6b4a', '#c7b48a'][v % 5];
    const front = v % 2 === 0;
    const c = this.ctx;
    const long = w >= h;
    const L = long ? w : h, Wd = long ? h : w;
    // Draw in a frame where the car's length runs along x; swap the axes for cars placed across.
    const at = (lx: number, ly: number): [number, number] => long ? [x + lx, y + ly] : [x + ly, y + lx];
    const boxAlong = (u0: number, v0: number, lu: number, lv: number, z0: number, z1: number, color: string) => {
      const [bx, by] = at(u0, v0);
      this.box(bx, by, long ? lu : lv, long ? lv : lu, z0, z1, color);
    };
    const sideFace = (u0: number, v0: number, lu: number, lv: number): Face => long ? this.faces(x + u0, y + v0, lu, lv).left : this.faces(x + v0, y + u0, lv, lu).right;
    const endFace = (u0: number, v0: number, lu: number, lv: number): Face => long ? this.faces(x + u0, y + v0, lu, lv).right : this.faces(x + v0, y + u0, lv, lu).left;
    const side = sideFace(0.05, 0.08, L - 0.1, Wd - 0.16);
    for (const u of [0.45, L - 0.55]) { const q = this.fp(side, u, 2); c.fillStyle = '#16181c'; c.fillRect(q.x - 3, q.y - 3, 6, 5); c.fillStyle = '#8a8c90'; c.fillRect(q.x - 1, q.y - 1, 2, 2); }
    boxAlong(0.05, 0.08, L - 0.1, Wd - 0.16, 2, 7, body);
    this.fquad(side, 0, side.len, 3.5, 4.2, '#26282c');
    const cab0 = front ? 0.3 : 0.55, cab1 = front ? L - 0.6 : L - 0.25;
    boxAlong(cab0, 0.15, cab1 - cab0, Wd - 0.3, 7, 11.5, body);
    const cs = sideFace(cab0, 0.15, cab1 - cab0, Wd - 0.3), ce = endFace(cab0, 0.15, cab1 - cab0, Wd - 0.3);
    this.fquad(cs, 0.08, cs.len - 0.08, 7.6, 11, '#2d3c4c');
    this.fquad(cs, 0.08, cs.len - 0.08, 9.8, 11, '#7f9fb4');
    this.fquad(cs, cs.len * 0.5 - 0.04, cs.len * 0.5 + 0.04, 7.6, 11, body);
    this.fquad(ce, 0.06, ce.len - 0.06, 7.6, 11, front ? '#9ab8c8' : '#2d3c4c');
    const end = endFace(0.05, 0.08, L - 0.1, Wd - 0.16);
    this.fquad(end, 0, end.len, 2, 3, '#26282c');
    if (front) {
      this.fquad(end, 0.1, 0.26, 4, 6, '#f4f0dc');
      this.fquad(end, end.len - 0.26, end.len - 0.1, 4, 6, '#f4f0dc');
      this.fquad(end, 0.3, end.len - 0.3, 4, 6, '#2a2c30');
    } else {
      this.fquad(end, 0.06, 0.22, 3.5, 6.5, '#c0392b');
      this.fquad(end, end.len - 0.22, end.len - 0.06, 3.5, 6.5, '#c0392b');
      this.fquad(end, 0.3, end.len - 0.3, 4.5, 5.5, '#e7c86a');
    }
  }

  private drawLamp(p: Prop): void {
    const c = this.ctx;
    const H = p.height || 28;
    const arm = p.facing ?? { x: 0, y: 1 };
    const base = this.pt(p.x, p.y);
    c.fillStyle = '#3f464c'; c.fillRect(base.x - 1, base.y - H, 2, H + 1);
    c.fillStyle = '#7b848b'; c.fillRect(base.x - 1, base.y - H, 1, H + 1);
    c.fillStyle = '#2f3438'; c.fillRect(base.x - 2, base.y - 3, 4, 3);
    const tip = this.pt(p.x + arm.x * 0.8, p.y + arm.y * 0.8, H + 1);
    this.line({ x: base.x, y: base.y - H }, tip, '#3f464c');
    c.fillStyle = '#2d3236'; c.fillRect(tip.x - 3, tip.y - 1, 7, 2);
    c.fillStyle = '#ffe7a8'; c.fillRect(tip.x - 2, tip.y + 1, 5, 1);
  }

  private drawBench(p: Prop): void {
    const { x, y, w, h } = p;
    const slat = '#4f7a55';
    const long = w >= h;
    for (const [lx, ly] of long ? [[x + 0.1, y + 0.1], [x + w - 0.2, y + 0.1]] : [[x + 0.1, y + 0.1], [x + 0.1, y + h - 0.2]]) this.box(lx, ly, 0.1, 0.1, 0, 3.5, '#2f3336', '#2f3336', false);
    this.box(x, y, w, h, 3.5, 4.5, slat, '#6d9a6d', false);
    if (long) this.box(x, y, w, 0.08, 4.5, 8, slat, slat, false);
    else this.box(x, y, 0.08, h, 4.5, 8, slat, slat, false);
  }

  private drawFence(p: Prop): void {
    const { x, y, w, h } = p;
    const long = w >= h;
    const a = long ? [x, y + h / 2] : [x + w / 2, y], b = long ? [x + w, y + h / 2] : [x + w / 2, y + h];
    this.shape([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], 8], [a[0], a[1], 8]], 'rgba(70, 96, 78, 0.55)');
    for (const q of [a, b]) this.line3([q[0], q[1], 0], [q[0], q[1], 9], '#34463c');
    this.line3([a[0], a[1], 8], [b[0], b[1], 8], '#4a5e50');
  }

  private drawSign(p: Prop): void {
    const c = this.ctx;
    const H = p.height || 20;
    const base = this.pt(p.x, p.y);
    c.fillStyle = '#5b646b'; c.fillRect(base.x - 1, base.y - H, 2, H + 1);
    c.fillStyle = '#9aa3a9'; c.fillRect(base.x - 1, base.y - H, 1, H + 1);
    if (!p.label) return;
    const tw = p.label.length * 4 - 1;
    const v = p.variant || 0;
    const [plate, ink] = v === 3 ? ['#2f9a55', '#f6f4ea'] : v === 2 ? ['#f2c14e', '#1d2a33'] : v === 1 ? ['#f4f1e6', '#1d2a33'] : ['#1f4f8f', '#f6f4ea'];
    const x0 = base.x - Math.ceil(tw / 2) - 3, y0 = base.y - H - 11;
    c.fillStyle = '#10181f'; c.fillRect(x0 - 1, y0 - 1, tw + 8, 12);
    c.fillStyle = plate; c.fillRect(x0, y0, tw + 6, 10);
    c.fillStyle = ink; c.fillRect(x0 + 1, y0 + 1, tw + 4, 1); c.fillRect(x0 + 1, y0 + 8, tw + 4, 1);
    this.pixelText(p.label, x0 + 3, y0 + 3, ink);
  }

  private drawBusStop(p: Prop): void {
    // Skånetrafiken stop: a pole with the green-and-yellow bus sign and the stop name.
    const c = this.ctx;
    const H = p.height || 24;
    const base = this.pt(p.x, p.y);
    c.fillStyle = '#5b646b'; c.fillRect(base.x, base.y - H, 1, H + 1);
    c.fillStyle = '#10181f'; c.fillRect(base.x - 5, base.y - H - 10, 11, 11);
    c.fillStyle = '#f2c200'; c.fillRect(base.x - 4, base.y - H - 9, 9, 9);
    c.fillStyle = '#1d6b3a'; c.fillRect(base.x - 3, base.y - H - 8, 7, 7);
    this.pixelText('H', base.x - 1, base.y - H - 7, '#f6f4ea');
    if (p.label) {
      const tw = p.label.length * 4 - 1;
      const x0 = Math.round(base.x - tw / 2);
      c.fillStyle = '#10181f'; c.fillRect(x0 - 3, base.y - H + 2, tw + 6, 9);
      c.fillStyle = '#f4f1e6'; c.fillRect(x0 - 2, base.y - H + 3, tw + 4, 7);
      this.pixelText(p.label, x0, base.y - H + 5, '#1d2a33');
    }
  }

  private drawCrossingSign(p: Prop): void {
    const c = this.ctx;
    const H = p.height || 19;
    const base = this.pt(p.x, p.y);
    c.fillStyle = '#5b646b'; c.fillRect(base.x, base.y - H, 1, H + 1);
    c.fillStyle = '#f6f4ea'; c.fillRect(base.x - 4, base.y - H - 8, 9, 9);
    c.fillStyle = '#2064b0'; c.fillRect(base.x - 3, base.y - H - 7, 7, 7);
    c.fillStyle = '#f6f4ea';
    c.fillRect(base.x, base.y - H - 6, 1, 1); c.fillRect(base.x - 1, base.y - H - 5, 3, 1); c.fillRect(base.x - 2, base.y - H - 4, 5, 1); c.fillRect(base.x - 3, base.y - H - 3, 7, 1);
    c.fillStyle = '#10181f'; c.fillRect(base.x, base.y - H - 4, 1, 1);
  }

  private drawPostbox(p: Prop): void {
    const c = this.ctx;
    const b = this.pt(p.x, p.y);
    c.fillStyle = '#3a4046'; c.fillRect(b.x, b.y - 9, 1, 10);
    c.fillStyle = '#a07c00'; c.fillRect(b.x - 3, b.y - 15, 7, 7);
    c.fillStyle = '#f2c200'; c.fillRect(b.x - 2, b.y - 15, 6, 6);
    c.fillStyle = '#ffe36b'; c.fillRect(b.x - 2, b.y - 15, 6, 1);
    c.fillStyle = '#1b1b1b'; c.fillRect(b.x - 1, b.y - 13, 4, 1);
    c.fillStyle = '#1f5fa8'; c.fillRect(b.x, b.y - 11, 2, 1);
  }

  private drawBin(p: Prop): void {
    const c = this.ctx;
    const b = this.pt(p.x, p.y);
    c.fillStyle = '#3a4046'; c.fillRect(b.x, b.y - 4, 1, 5);
    c.fillStyle = '#1f3a2c'; c.fillRect(b.x - 3, b.y - 10, 7, 7);
    c.fillStyle = '#3f6b4a'; c.fillRect(b.x - 2, b.y - 10, 5, 6);
    c.fillStyle = '#10181f'; c.fillRect(b.x - 1, b.y - 9, 3, 1);
  }

  private drawShelter(p: Prop): void {
    const { x, y, w, h } = p;
    const H = p.height || 15;
    const long = w >= h;
    if (long) this.box(x, y, w, 0.08, 0, H, '#2f3438', '#2f3438', false);
    else this.box(x, y, 0.08, h, 0, H, '#2f3438', '#2f3438', false);
    this.shape([[x, y + h, 0], [x + w, y + h, 0], [x + w, y + h, H], [x, y + h, H]], 'rgba(176, 214, 226, 0.42)');
    this.shape([[x + w, y, 0], [x + w, y + h, 0], [x + w, y + h, H], [x + w, y, H]], 'rgba(196, 226, 236, 0.5)');
    for (const [px2, py2] of [[x, y + h], [x + w, y + h], [x + w, y]]) this.line3([px2, py2, 0], [px2, py2, H], '#2f3438');
    const end = long ? this.faces(x, y, w, h).right : this.faces(x, y, w, h).left;
    this.fquad(end, 0.08, end.len - 0.08, 3, 12, '#e07a4a');
    this.fquad(end, 0.12, end.len - 0.12, 7, 10, '#f5e3b0');
    this.box(x - 0.1, y - 0.1, w + 0.2, h + 0.2, H, H + 1.5, '#3c4247', '#6f777d');
  }

  // ---------------------------------------------------------------- ground layer

  private drawGround(): void {
    const x0 = Math.floor(this.cam.x / CHUNK), x1 = Math.floor((this.cam.x + WIDTH) / CHUNK);
    const y0 = Math.floor(this.cam.y / CHUNK), y1 = Math.floor((this.cam.y + HEIGHT) / CHUNK);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) this.ctx.drawImage(this.chunk(cx, cy), cx * CHUNK - this.cam.x, cy * CHUNK - this.cam.y);
    }
    // Bake the ring of chunks around the view a few milliseconds per frame, so walking never waits on the ground.
    if (!this.pending) {
      outer: for (let cy = y0 - 1; cy <= y1 + 1; cy++) {
        for (let cx = x0 - 1; cx <= x1 + 1; cx++) {
          const key = cy * 4096 + cx;
          if (!this.chunks.has(key)) { this.pending = { key, cx, cy, image: new ImageData(CHUNK, CHUNK), row: 0 }; break outer; }
        }
      }
    }
    if (this.pending) {
      const started = performance.now();
      while (this.pending.row < CHUNK && performance.now() - started < 4) this.bakeRows(this.pending, 8);
      if (this.pending.row >= CHUNK) this.finishChunk(this.pending);
    }
  }

  private chunk(cx: number, cy: number): HTMLCanvasElement {
    const key = cy * 4096 + cx;
    const cached = this.chunks.get(key);
    if (cached) return cached;
    const job = this.pending?.key === key ? this.pending : { key, cx, cy, image: new ImageData(CHUNK, CHUNK), row: 0 };
    this.bakeRows(job, CHUNK);
    return this.finishChunk(job);
  }

  private bakeRows(job: { cx: number; cy: number; image: ImageData; row: number }, rows: number): void {
    const data = job.image.data;
    const ox = job.cx * CHUNK, oy = job.cy * CHUNK;
    const end = Math.min(CHUNK, job.row + rows);
    for (let py = job.row; py < end; py++) {
      for (let x = 0; x < CHUNK; x++) {
        const sx = ox + x, sy = oy + py;
        const w = this.view.unproject(sx, sy);
        groundColour(w.x, w.y, sx, sy);
        const i = (py * CHUNK + x) * 4;
        data[i] = clamp255(px[0]); data[i + 1] = clamp255(px[1]); data[i + 2] = clamp255(px[2]); data[i + 3] = 255;
      }
    }
    job.row = end;
  }

  /** Paints the baked pixels, zebra crossings and prop shadows into the finished chunk. */
  private finishChunk(job: { key: number; cx: number; cy: number; image: ImageData }): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = CHUNK;
    canvas.height = CHUNK;
    const g = canvas.getContext('2d')!;
    g.putImageData(job.image, 0, 0);
    const ox = job.cx * CHUNK, oy = job.cy * CHUNK;
    const origin = { x: ox, y: oy };
    this.bake(g, origin, () => this.drawCrossings(ox, oy));
    const shadows = document.createElement('canvas');
    shadows.width = CHUNK;
    shadows.height = CHUNK;
    const s = shadows.getContext('2d')!;
    this.bake(s, origin, () => {
      s.fillStyle = s.strokeStyle = '#1f2c55';
      for (const box of this.shadowIndex()) {
        if (box.x1 < ox || box.x0 > ox + CHUNK || box.y1 < oy || box.y0 > oy + CHUNK) continue;
        this.castShadow(box.prop);
      }
    });
    g.globalAlpha = 0.34;
    g.drawImage(shadows, 0, 0);
    g.globalAlpha = 1;
    this.chunks.set(job.key, canvas);
    if (this.pending?.key === job.key) this.pending = null;
    return canvas;
  }

  private drawCrossings(ox: number, oy: number): void {
    for (const cr of CROSSINGS) {
      const q = this.view.project(cr.x, cr.y);
      if (q.x < ox - 80 || q.x > ox + CHUNK + 80 || q.y < oy - 40 || q.y > oy + CHUNK + 40) continue;
      const road = nearestRoad(cr.x, cr.y);
      if (!road || road.d > 2) continue;
      const { dir } = road, n = { x: -dir.y, y: dir.x }, hw = road.road.hw;
      for (let k = -hw + 0.25; k < hw - 0.15; k += 0.55) {
        const c0 = { x: road.x + n.x * k - dir.x * 0.7, y: road.y + n.y * k - dir.y * 0.7 };
        const pts = [c0, { x: c0.x + dir.x * 1.4, y: c0.y + dir.y * 1.4 }, { x: c0.x + dir.x * 1.4 + n.x * 0.28, y: c0.y + dir.y * 1.4 + n.y * 0.28 }, { x: c0.x + n.x * 0.28, y: c0.y + n.y * 0.28 }];
        this.poly(pts.map(p => this.pt(p.x, p.y)), 'rgba(238, 236, 226, 0.9)');
      }
    }
  }

  private shadowIndex(): Array<{ prop: Prop; x0: number; y0: number; x1: number; y1: number }> {
    if (this.shadowBoxes) return this.shadowBoxes;
    this.shadowBoxes = PROPS.map(prop => {
      const h = this.shadowHeight(prop);
      const pts = propCorners(prop).flatMap(q => [this.view.project(q.x, q.y), this.view.project(q.x + SHADOW.x * h, q.y + SHADOW.y * h)]);
      const pad = prop.kind === 'tree' ? 30 : 4;
      return { prop, x0: Math.min(...pts.map(p => p.x)) - pad, y0: Math.min(...pts.map(p => p.y)) - pad, x1: Math.max(...pts.map(p => p.x)) + pad, y1: Math.max(...pts.map(p => p.y)) + pad };
    });
    return this.shadowBoxes;
  }

  private shadowHeight(p: Prop): number {
    const H = p.height || 0;
    if (p.kind !== 'building') return H;
    if (p.appearance) return H + p.appearance.rise * 0.8;
    return H;
  }

  private castShadow(p: Prop): void {
    const c = this.ctx;
    const H = this.shadowHeight(p);
    switch (p.kind) {
      case 'tree': {
        this.line(this.pt(p.x, p.y), this.pt(p.x + SHADOW.x * H * 0.6, p.y + SHADOW.y * H * 0.6), '#1f2c55');
        const q = this.pt(p.x + SHADOW.x * H, p.y + SHADOW.y * H);
        const r = treeRadius(p.variant || 0, H) / 16;
        c.beginPath(); c.ellipse(q.x, q.y, r * TILE_X * Math.SQRT2 * 0.8, r * TILE_Y * Math.SQRT2 * 0.8, 0, 0, Math.PI * 2); c.fill();
        return;
      }
      case 'bush': { const q = this.pt(p.x + SHADOW.x * 4, p.y + SHADOW.y * 4); c.beginPath(); c.ellipse(q.x, q.y, 5, 2, 0, 0, Math.PI * 2); c.fill(); return; }
      case 'lamp': case 'sign': case 'crossing': case 'postbox': case 'busstop':
        this.line(this.pt(p.x, p.y), this.pt(p.x + SHADOW.x * H, p.y + SHADOW.y * H), '#1f2c55');
        return;
      case 'fence': case 'bin': return;
      default: break;
    }
    const base = p.kind === 'building' && p.footprint ? p.footprint.pts : orientedCorners(p.x, p.y, p.w + 0.1, p.h + 0.1, p.angle);
    const pts: Point[] = [];
    for (const q of base) { pts.push(q); pts.push({ x: q.x + SHADOW.x * H, y: q.y + SHADOW.y * H }); }
    this.poly(hull(pts).map(q => this.pt(q.x, q.y)), '#1f2c55');
  }

  private drawCloudShadows(): void {
    const c = this.ctx;
    const t = this.elapsed;
    for (let k = 0; k < 5; k++) {
      const wx = ((t * 0.35 + k * 71) % 420) - 40, wy = ((k * 53) % 380);
      const q = this.pt(wx, wy);
      if (q.x < -260 || q.x > WIDTH + 260 || q.y < -160 || q.y > HEIGHT + 160) continue;
      const r = 110 + k * 16;
      const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
      g.addColorStop(0, 'rgba(30, 44, 80, 0.1)');
      g.addColorStop(1, 'rgba(30, 44, 80, 0)');
      c.fillStyle = g;
      c.save(); c.translate(q.x, q.y); c.scale(1, 0.4); c.translate(-q.x, -q.y);
      c.fillRect(q.x - r, q.y - r, r * 2, r * 2);
      c.restore();
    }
  }

  private drawGulls(): void {
    const c = this.ctx;
    const t = this.elapsed;
    for (let k = 0; k < 3; k++) {
      const x = Math.round(WIDTH * (0.3 + k * 0.25) + Math.sin(t * 0.21 + k * 2) * 90);
      const y = Math.round(40 + k * 22 + Math.sin(t * 0.33 + k) * 18);
      const flap = Math.sin(t * 7 + k * 3);
      c.fillStyle = 'rgba(30, 44, 80, 0.18)';
      c.fillRect(x + 44, y + 50, 4, 1);
      c.fillStyle = '#f4f1ea';
      c.fillRect(x - 1, y, 3, 1);
      const wy = flap > 0.6 ? -2 : flap > 0 ? -1 : 1;
      c.fillRect(x - 3, y + wy, 2, 1);
      c.fillRect(x + 2, y + wy, 2, 1);
      c.fillStyle = '#5e646c';
      c.fillRect(x - 4, y + wy - (flap > 0.6 ? 1 : 0), 1, 1);
      c.fillRect(x + 4, y + wy - (flap > 0.6 ? 1 : 0), 1, 1);
    }
  }

  // ---------------------------------------------------------------- actors and markers

  private drawRoute(game: Game): void {
    if (game.mode === 'title') return;
    const target = game.target;
    const p = this.pt(target.x, target.y);
    if (p.x < -15 || p.x > WIDTH + 15 || p.y < -15 || p.y > HEIGHT + 15) return;
    const pulse = Math.sin(this.elapsed * 5) * 2;
    const r = 0.8;
    this.ctx.globalAlpha = 0.25;
    this.poly([this.pt(target.x - r, target.y), this.pt(target.x, target.y - r), this.pt(target.x + r, target.y), this.pt(target.x, target.y + r)], '#f8e6a4');
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = '#f8d36a'; this.ctx.lineWidth = 2;
    this.ctx.beginPath(); this.ctx.ellipse(p.x, p.y + 1, 10 + pulse, 4 + pulse * 0.3, 0, 0, Math.PI * 2); this.ctx.stroke();
  }

  /** The route icons from the planning map: a question mark, googly eyes and a star. */
  private drawMarkers(game: Game): void {
    const c = this.ctx;
    const bob = Math.round(Math.sin(this.elapsed * 3) * 2);
    if (!game.hasPackage) {
      const p = this.pt(PACKAGE.x, PACKAGE.y, 40);
      c.font = 'bold 20px Impact, "Arial Black", sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#10181f'; c.fillText('?', p.x + 1, p.y + bob + 1);
      c.fillStyle = '#ef4e45'; c.fillText('?', p.x, p.y + bob);
      c.textAlign = 'left';
    }
    {
      const house = MARCUS_HOUSE ?? { x: MARCUS_A.x, y: MARCUS_A.y, height: 20 };
      const p = this.pt(house.x, house.y, (house.height || 20) + 34);
      const y = p.y + (game.healed ? 0 : bob);
      const look = normalize(this.view.project(game.player.pos.x - MARCUS_A.x, game.player.pos.y - MARCUS_A.y));
      for (const ex of [-5, 5]) {
        c.fillStyle = '#10181f'; c.beginPath(); c.arc(p.x + ex, y, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = game.healed ? '#d8d4ca' : '#f6f4ee'; c.beginPath(); c.arc(p.x + ex, y, 5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#10181f'; c.beginPath(); c.arc(p.x + ex + look.x * 2.2, y + look.y * 2.2 + 0.5, 2.4, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff'; c.fillRect(Math.round(p.x + ex + look.x * 2.2) - 1, Math.round(y + look.y * 2.2) - 1, 1, 1);
      }
    }
    {
      const house = HOME_HOUSE ?? { x: HOME.x, y: HOME.y, height: 20 };
      const p = this.pt(house.x, house.y, (house.height || 20) + 40);
      const y = p.y + bob;
      const star = [0, -8, 2.4, -2.6, 8, -2.6, 3.6, 1.2, 5, 7, 0, 3.6, -5, 7, -3.6, 1.2, -8, -2.6, -2.4, -2.6];
      c.beginPath();
      for (let i = 0; i < star.length; i += 2) c.lineTo(p.x + star[i] + 0.5, y + star[i + 1]);
      c.closePath();
      c.fillStyle = '#f5c33b'; c.fill();
      c.strokeStyle = '#10181f'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#fff3b0'; c.fillRect(p.x - 2, y - 3, 2, 2);
    }
  }

  private drawShadow(x: number, y: number, size = 7): void {
    const p = this.pt(x, y);
    this.ctx.fillStyle = 'rgba(24, 34, 62, 0.42)';
    this.ctx.beginPath(); this.ctx.ellipse(p.x - 2, p.y + 1, size, size * 0.36, 0, 0, Math.PI * 2); this.ctx.fill();
  }

  private drawPerson(pos: Vec2, facing: Vec2, color: string, kind: 'player' | 'runner' | 'bruiser' | 'boss', walk: number, flash: number, carrying = false): void {
    const c = this.ctx;
    const p = this.pt(pos.x, pos.y);
    this.drawShadow(pos.x, pos.y, kind === 'boss' ? 9 : 7);
    const step = Math.round(Math.sin(walk) * 2);
    const broad = kind === 'boss' ? 5 : kind === 'bruiser' ? 4 : 3;
    const right = this.view.project(facing.x, facing.y).x >= 0;
    const body = flash > 0 ? '#fff3ca' : color;
    const sleeve = kind === 'player' ? '#edbd59' : shade(color, 0.72);
    const trousers = kind === 'player' ? '#26343f' : '#262a33';
    const hair = kind === 'player' ? '#263d45' : kind === 'boss' ? '#1b1b1f' : '#3a2f2c';
    const parts: Array<[number, number, number, number, string]> = [
      [-4, -6 + step, 3, 6, trousers], [1, -6 - step, 3, 6, trousers],
      [-4, -1 + step, 3, 1, '#15181c'], [1, -1 - step, 3, 1, '#15181c'],
      [-broad - 3, -15, 3, 8, sleeve], [broad, -15, 3, 8, sleeve],
      [-broad - 1, -16, (broad + 1) * 2, 11, body],
      [-3, -21, 6, 6, '#d9a985'],
      [-4, -22, 8, 3, hair],
    ];
    if (kind === 'player') parts.push([right ? -6 : 3, -13, 4, 6, '#f2be64'], [right ? 2 : -6, -21, 4, 1, '#1d3038']);
    if (carrying) parts.push([-5, -14, 10, 7, '#c98f4a'], [-1, -14, 2, 7, '#f4e4b0']);
    for (const [x, y, w, h] of parts) { c.fillStyle = '#141820'; c.fillRect(p.x + x - 1, p.y + y - 1, w + 2, h + 2); }
    for (const [x, y, w, h, fill] of parts) { c.fillStyle = fill; c.fillRect(p.x + x, p.y + y, w, h); }
    if (!carrying) {
      c.fillStyle = mix(body, '#ffe2b0', 0.35); c.fillRect(p.x + broad, p.y - 16, 1, 11);
      c.fillStyle = shade(body, 0.72); c.fillRect(p.x - broad - 1, p.y - 16, 1, 11);
    }
    c.fillStyle = '#f2c9a4'; c.fillRect(p.x + 2, p.y - 21, 1, 4);
    c.fillStyle = '#1a1a1e'; c.fillRect(p.x + (right ? 1 : -2), p.y - 19, 1, 1);
    if (kind === 'player' && !carrying) { c.fillStyle = '#f8e6a6'; c.fillRect(p.x - 2, p.y - 17, 4, 1); }
    if (kind === 'boss') { c.fillStyle = '#d9b44a'; c.fillRect(p.x - 1, p.y - 12, 2, 1); }
  }

  private drawPlayer(player: Player, carrying: boolean): void {
    if (player.invulnerable > 0 && Math.floor(this.elapsed * 18) % 2 === 0 && player.dodgeTimer <= 0) return;
    if (player.dodgeTimer > 0) {
      const p = this.pt(player.pos.x - player.facing.x * 0.7, player.pos.y - player.facing.y * 0.7);
      this.ctx.fillStyle = '#86d5c766'; this.ctx.fillRect(p.x - 5, p.y - 17, 10, 13);
    }
    this.drawPerson(player.pos, player.facing, '#298f9d', 'player', player.walk, player.flash, carrying);
    if (player.attackTimer > 0) {
      const p = this.pt(player.pos.x + player.facing.x * 0.9, player.pos.y + player.facing.y * 0.9, 9);
      const size = player.combo === 3 ? 15 : 11;
      const screenDirection = normalize(this.view.project(player.facing.x, player.facing.y));
      const angle = Math.atan2(screenDirection.y, screenDirection.x);
      this.ctx.strokeStyle = player.combo === 3 ? '#fff1a4' : '#f6cf72';
      this.ctx.lineWidth = player.combo === 3 ? 4 : 3;
      this.ctx.beginPath(); this.ctx.arc(p.x, p.y, size, angle - 0.9, angle + 0.9); this.ctx.stroke();
    }
  }

  private drawEnemy(e: Enemy): void {
    if (e.state === 'ko') {
      const p = this.pt(e.pos.x, e.pos.y);
      this.drawShadow(e.pos.x, e.pos.y, 8);
      this.ctx.fillStyle = '#141820'; this.ctx.fillRect(p.x - 9, p.y - 6, 18, 7);
      this.ctx.fillStyle = e.kind === 'boss' ? '#794748' : '#694a50';
      this.ctx.fillRect(p.x - 8, p.y - 5, 16, 5);
      this.ctx.fillStyle = '#c29b83'; this.ctx.fillRect(p.x + 5, p.y - 5, 4, 4);
      return;
    }
    if (e.state === 'windup') {
      const p = this.pt(e.pos.x, e.pos.y);
      this.ctx.strokeStyle = '#e96c5d'; this.ctx.lineWidth = 2;
      this.ctx.beginPath(); this.ctx.ellipse(p.x, p.y, 11, 4, 0, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.fillStyle = '#fff1b8'; this.ctx.font = 'bold 12px monospace'; this.ctx.fillText('!', p.x - 4, p.y - 29);
    }
    const color = e.kind === 'boss' ? '#a34254' : e.kind === 'bruiser' ? '#7b586f' : '#985c57';
    this.drawPerson(e.pos, e.facing, color, e.kind, e.walk, e.flash);
    const fullHp = e.kind === 'boss' ? 9 : e.kind === 'bruiser' ? 4 : 2;
    if (e.hp < fullHp || e.kind === 'boss') {
      const p = this.pt(e.pos.x, e.pos.y, 27);
      this.ctx.fillStyle = '#273942'; this.ctx.fillRect(p.x - 10, p.y, 20, 3);
      this.ctx.fillStyle = e.kind === 'boss' ? '#f2be64' : '#e36e61'; this.ctx.fillRect(p.x - 9, p.y + 1, Math.max(0, 18 * e.hp / fullHp), 1);
    }
  }

  private drawPackage(x: number, y: number): void {
    const p = this.pt(x, y);
    this.drawShadow(x, y, 8);
    const bob = Math.round(Math.sin(this.elapsed * 4) * 2);
    const c = this.ctx;
    c.fillStyle = '#3a2a22'; c.fillRect(p.x - 8, p.y - 12 + bob, 16, 12);
    c.fillStyle = '#b97c3e'; c.fillRect(p.x - 7, p.y - 7 + bob, 14, 6);
    c.fillStyle = '#dfad59'; c.fillRect(p.x - 7, p.y - 11 + bob, 14, 5);
    c.fillStyle = '#fff0b0'; c.fillRect(p.x - 1, p.y - 11 + bob, 3, 10);
    c.fillStyle = '#ac6646'; c.fillRect(p.x - 7, p.y - 5 + bob, 14, 1);
  }

  // ---------------------------------------------------------------- overlays

  private drawAtmosphere(): void {
    const c = this.ctx;
    const haze = c.createLinearGradient(0, 0, 0, HEIGHT);
    haze.addColorStop(0, 'rgba(255, 214, 160, 0.18)');
    haze.addColorStop(0.45, 'rgba(255, 214, 160, 0.03)');
    haze.addColorStop(1, 'rgba(24, 40, 70, 0.14)');
    c.fillStyle = haze; c.fillRect(0, 0, WIDTH, HEIGHT);
    const sun = c.createRadialGradient(WIDTH * 1.05, HEIGHT * 0.45, 10, WIDTH * 1.05, HEIGHT * 0.45, WIDTH * 0.9);
    sun.addColorStop(0, 'rgba(255, 190, 110, 0.2)');
    sun.addColorStop(1, 'rgba(255, 190, 110, 0)');
    c.fillStyle = sun; c.fillRect(0, 0, WIDTH, HEIGHT);
    c.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let y = 0; y < HEIGHT; y += 3) c.fillRect(0, y, WIDTH, 1);
    const vignette = c.createRadialGradient(WIDTH / 2, HEIGHT / 2, 90, WIDTH / 2, HEIGHT / 2, 320);
    vignette.addColorStop(0, 'rgba(7, 20, 32, 0)'); vignette.addColorStop(1, 'rgba(7, 20, 32, 0.42)');
    c.fillStyle = vignette; c.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawTargetArrow(game: Game): void {
    if (game.mode !== 'playing') return;
    const target = game.target;
    const d = distance(game.player.pos, target);
    if (d < 2 && game.hasPackage) return;
    const direction = normalize({ x: target.x - game.player.pos.x, y: target.y - game.player.pos.y });
    const screenDir = normalize(this.view.project(direction.x, direction.y));
    const c = this.ctx;
    const x = WIDTH - 27, y = 72;
    c.fillStyle = '#102a35ce'; c.fillRect(x - 17, y - 16, 34, 34);
    c.strokeStyle = '#d6b66d'; c.lineWidth = 1; c.strokeRect(x - 17.5, y - 16.5, 35, 35);
    c.save(); c.translate(x, y); c.rotate(Math.atan2(screenDir.y, screenDir.x));
    this.poly([{ x: 11, y: 0 }, { x: -6, y: -7 }, { x: -3, y: 0 }, { x: -6, y: 7 }], '#f3cc75');
    c.restore();
    c.font = 'bold 8px monospace'; c.textAlign = 'center'; c.fillStyle = '#e7dabc';
    const metres = game.hasPackage ? distance(game.player.pos, HOME) * METRES_PER_UNIT : game.targetMetres;
    c.fillText(`${Math.round(metres)} m`, x, y + 29); c.textAlign = 'left';
  }

  private drawMessage(message: string, timer: number): void {
    const c = this.ctx;
    c.globalAlpha = Math.min(1, timer * 2);
    c.font = 'bold 10px monospace';
    const width = Math.min(WIDTH - 24, c.measureText(message).width + 26);
    c.fillStyle = '#102c35e6'; c.fillRect((WIDTH - width) / 2, HEIGHT - 36, width, 24);
    c.strokeStyle = '#eec36e'; c.lineWidth = 1; c.strokeRect((WIDTH - width) / 2 + 0.5, HEIGHT - 35.5, width - 1, 23);
    c.fillStyle = '#f7e8c4'; c.textAlign = 'center'; c.fillText(message, WIDTH / 2, HEIGHT - 20); c.textAlign = 'left';
    c.globalAlpha = 1;
  }
}
