export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
/** A solid footprint: any simple polygon, with its bounding box for quick rejection. */
export interface Shape extends Rect { pts: Vec2[] }

export const TILE_X = 16;
/** A lower camera than classic 2:1 isometric, closer to a street-level aerial view. */
export const TILE_Y = 6;

export function iso(x: number, y: number): Vec2 {
  return { x: (x - y) * TILE_X, y: (x + y) * TILE_Y };
}

export function uniso(x: number, y: number): Vec2 {
  return { x: x / (2 * TILE_X) + y / (2 * TILE_Y), y: y / (2 * TILE_Y) - x / (2 * TILE_X) };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v: Vec2): Vec2 {
  const length = Math.hypot(v.x, v.y);
  return length > 0 ? { x: v.x / length, y: v.y / length } : { x: 0, y: 0 };
}

export function pointInExpandedRect(p: Vec2, r: Rect, radius: number): boolean {
  return p.x > r.x - radius && p.x < r.x + r.w + radius && p.y > r.y - radius && p.y < r.y + r.h + radius;
}

export function shape(pts: Vec2[]): Shape {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { pts, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Corners of a box centred on (cx, cy) with extents w × h, rotated by angle. */
export function orientedCorners(cx: number, cy: number, w: number, h: number, angle: number): Vec2[] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => ({ x: cx + (u * w / 2) * c - (v * h / 2) * s, y: cy + (u * w / 2) * s + (v * h / 2) * c }));
}

/** True when p lies inside the shape or within radius of its outline. */
export function pointInShape(p: Vec2, s: Shape, radius: number): boolean {
  if (!pointInExpandedRect(p, s, radius)) return false;
  let inside = false;
  const pts = s.pts;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x)) inside = !inside;
  }
  if (inside) return true;
  if (radius <= 0) return false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    if (Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y) < radius) return true;
  }
  return false;
}

/** Uniform grid over the obstacles so collision checks only look at nearby shapes. */
export class ObstacleGrid {
  readonly shapes: Shape[];
  private readonly cells = new Map<number, Shape[]>();
  private readonly size: number;

  constructor(shapes: Shape[], size = 4) {
    this.shapes = shapes;
    this.size = size;
    for (const s of shapes) {
      for (let gy = Math.floor(s.y / size); gy <= Math.floor((s.y + s.h) / size); gy++) {
        for (let gx = Math.floor(s.x / size); gx <= Math.floor((s.x + s.w) / size); gx++) {
          const key = gy * 100000 + gx;
          const list = this.cells.get(key);
          if (list) list.push(s); else this.cells.set(key, [s]);
        }
      }
    }
  }

  /** Shapes whose bounding boxes might touch the box around (x, y) with the given reach. */
  near(x: number, y: number, reach: number): Shape[] {
    const out = new Set<Shape>();
    for (let gy = Math.floor((y - reach) / this.size); gy <= Math.floor((y + reach) / this.size); gy++) {
      for (let gx = Math.floor((x - reach) / this.size); gx <= Math.floor((x + reach) / this.size); gx++) {
        for (const s of this.cells.get(gy * 100000 + gx) ?? []) out.add(s);
      }
    }
    return [...out];
  }

  hits(p: Vec2, radius: number): boolean {
    return this.near(p.x, p.y, radius + 0.01).some(s => pointInShape(p, s, radius));
  }
}

export function moveWithCollision(position: Vec2, delta: Vec2, radius: number, obstacles: ObstacleGrid, bounds: Rect): Vec2 {
  const next = { ...position };
  next.x = Math.max(bounds.x + radius, Math.min(bounds.x + bounds.w - radius, next.x + delta.x));
  if (obstacles.hits(next, radius)) next.x = position.x;
  next.y = Math.max(bounds.y + radius, Math.min(bounds.y + bounds.h - radius, next.y + delta.y));
  if (obstacles.hits(next, radius)) next.y = position.y;
  return next;
}

/** True when the straight line from a to b passes through any obstacle. */
export function segmentBlocked(a: Vec2, b: Vec2, obstacles: ObstacleGrid): boolean {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const nearby = obstacles.near(mid.x, mid.y, distance(a, b) / 2 + 0.5);
  if (!nearby.length) return false;
  const steps = Math.max(1, Math.ceil(distance(a, b) * 8));
  for (let i = 1; i < steps; i++) {
    const p = { x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps };
    if (nearby.some(s => pointInShape(p, s, 0))) return true;
  }
  return false;
}
