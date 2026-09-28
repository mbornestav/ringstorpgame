export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export const TILE_X = 16;
export const TILE_Y = 8;

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

export function moveWithCollision(position: Vec2, delta: Vec2, radius: number, obstacles: Rect[], bounds: Rect): Vec2 {
  const next = { ...position };
  next.x = Math.max(bounds.x + radius, Math.min(bounds.x + bounds.w - radius, next.x + delta.x));
  if (obstacles.some(rect => pointInExpandedRect(next, rect, radius))) next.x = position.x;
  next.y = Math.max(bounds.y + radius, Math.min(bounds.y + bounds.h - radius, next.y + delta.y));
  if (obstacles.some(rect => pointInExpandedRect(next, rect, radius))) next.y = position.y;
  return next;
}

export function segmentHitsRect(a: Vec2, b: Vec2, rect: Rect): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) * 8));
  for (let i = 1; i < steps; i++) {
    const p = { x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps };
    if (pointInExpandedRect(p, rect, 0)) return true;
  }
  return false;
}
