import { type Vec2 } from './geometry';
import { type Footprint } from './map';

export type RoofShape = 'flat' | 'gabled' | 'hipped';
export interface BuildingAppearance {
  wall: string;
  roof: string;
  material: 'brick' | 'plaster' | 'wood';
  roofShape: RoofShape;
  /** Pixel-art heights; the photo references do not provide surveyed dimensions. */
  eaves: number;
  rise: number;
  floors: number;
  model: 'generic' | 'terrace' | 'marcus' | 'kiosk';
  reference?: string;
}

/** The supplied Street View images are visual references, not measured elevations. */
export function appearanceFor(f: Footprint, fallbackHeight: number): BuildingAppearance {
  const terrace = /^Ringstorpsvägen (49|51|53|55|57)[A-D]$/.test(f.address ?? '');
  if (terrace) return { wall: '#ad975e', roof: '#8c784d', material: 'brick', roofShape: 'gabled', eaves: 30, rise: 9, floors: 2, model: 'terrace', reference: 'User Street View reference 1: Home terrace' };
  if (f.address === 'Långåkersgatan 4') return { wall: '#c2a36a', roof: '#56534c', material: 'brick', roofShape: 'gabled', eaves: 24, rise: 25, floors: 1, model: 'marcus', reference: 'User Street View reference 3: Marcus A villa' };
  if (f.use === 'kiosk') return { wall: '#e1e0d3', roof: '#3e4847', material: 'wood', roofShape: 'gabled', eaves: 16, rise: 5, floors: 1, model: 'kiosk', reference: 'User Street View reference 2: Pålsjö kiosk' };
  const garage = f.type === 'garages' || f.area < 32;
  const apartment = f.type === 'apartments' || f.area > 320;
  const flat = garage || (f.levels ?? 0) >= 6 || f.area > 1400 || f.fill < 0.8;
  return {
    wall: apartment ? '#d2b981' : '#e0d8c7', roof: flat ? '#696968' : '#a25f43',
    material: apartment ? 'brick' : 'plaster', roofShape: flat ? 'flat' : 'gabled',
    eaves: fallbackHeight, rise: flat ? 0 : Math.max(8, Math.min(15, Math.min(f.obb.w, f.obb.h) * 2.6)),
    floors: f.levels ?? (apartment ? Math.max(2, Math.round((fallbackHeight - 4) / 11)) : fallbackHeight > 16 ? 2 : 1), model: 'generic',
  };
}

export interface RoofPlane { a: number; b: number; c: number }
export interface RoofPatch { pts: Vec2[]; plane: RoofPlane }
export interface BuildingFace { ax: number; ay: number; dx: number; dy: number; len: number; nx: number; ny: number }

export function buildingFront(footprint: Footprint, entrance: Vec2): BuildingFace {
  const ring = signedArea(footprint.pts) > 0 ? footprint.pts : [...footprint.pts].reverse();
  const toward = { x: entrance.x - footprint.obb.cx, y: entrance.y - footprint.obb.cy };
  const faces = ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length], len = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    return { ax: a.x, ay: a.y, dx, dy, len, nx: dy, ny: -dx };
  }).filter(f => f.len > Math.min(footprint.obb.w, footprint.obb.h) * 0.25);
  return faces.reduce((best, f) => f.nx * toward.x + f.ny * toward.y > best.nx * toward.x + best.ny * toward.y ? f : best);
}

export function frontagePolygon(f: BuildingFace, depth: number, widen = 0): Vec2[] {
  return [
    { x: f.ax, y: f.ay },
    { x: f.ax + f.dx * f.len, y: f.ay + f.dy * f.len },
    { x: f.ax + f.dx * (f.len + widen) + f.nx * depth, y: f.ay + f.dy * (f.len + widen) + f.ny * depth },
    { x: f.ax - f.dx * widen + f.nx * depth, y: f.ay - f.dy * widen + f.ny * depth },
  ];
}
const value = (p: RoofPlane, q: Vec2) => p.a * q.x + p.b * q.y + p.c;
const cross = (a: Vec2, b: Vec2, c: Vec2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export function signedArea(pts: Vec2[]): number {
  return pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
}

/** Ear clipping keeps concave extensions intact instead of replacing houses with rectangles. */
export function triangulate(pts: Vec2[]): Vec2[][] {
  const ring = signedArea(pts) > 0 ? [...pts] : [...pts].reverse();
  for (let i = ring.length - 1; i >= 0 && ring.length > 3; i--) {
    if (Math.abs(cross(ring[(i + ring.length - 1) % ring.length], ring[i], ring[(i + 1) % ring.length])) < 1e-7) ring.splice(i, 1);
  }
  const triangles: Vec2[][] = [];
  while (ring.length > 3) {
    const ear = ring.findIndex((b, i) => {
      const a = ring[(i + ring.length - 1) % ring.length], c = ring[(i + 1) % ring.length];
      if (cross(a, b, c) <= 1e-8) return false;
      return !ring.some(p => p !== a && p !== b && p !== c && cross(a, b, p) >= -1e-8 && cross(b, c, p) >= -1e-8 && cross(c, a, p) >= -1e-8);
    });
    if (ear < 0) throw new Error('Building footprint is not a simple polygon');
    triangles.push([ring[(ear + ring.length - 1) % ring.length], ring[ear], ring[(ear + 1) % ring.length]]);
    ring.splice(ear, 1);
  }
  if (ring.length === 3) triangles.push(ring);
  return triangles;
}

function clip(pts: Vec2[], plane: RoofPlane): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], da = value(plane, a), db = value(plane, b);
    if (da <= 1e-8) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** A roof envelope clipped to the actual footprint, with a stable ridge in world space. */
export function roofGeometry(pts: Vec2[], angle: number, w: number, h: number, cx: number, cy: number, appearance: BuildingAppearance, ridgeAlongX: boolean): { height: (p: Vec2) => number; patches: RoofPatch[]; planes: RoofPlane[] } {
  const c = Math.cos(angle), s = Math.sin(angle), { eaves, rise, roofShape } = appearance;
  const xPlanes = [{ a: c, b: s, c: w / 2 - cx * c - cy * s }, { a: -c, b: -s, c: w / 2 + cx * c + cy * s }];
  const yPlanes = [{ a: -s, b: c, c: h / 2 + cx * s - cy * c }, { a: s, b: -c, c: h / 2 - cx * s + cy * c }];
  const scale = rise / Math.max(0.01, (ridgeAlongX ? h : w) / 2);
  const slopes = roofShape === 'flat' || rise === 0 ? [{ a: 0, b: 0, c: 0 }] : roofShape === 'hipped' ? [...xPlanes, ...yPlanes] : ridgeAlongX ? yPlanes : xPlanes;
  const planes = slopes.map(p => ({ a: p.a * scale, b: p.b * scale, c: eaves + p.c * scale }));
  const patches: RoofPatch[] = [];
  for (const triangle of triangulate(pts)) for (const plane of planes) {
    let patch = triangle;
    for (const other of planes) {
      if (other === plane) continue;
      patch = clip(patch, { a: plane.a - other.a, b: plane.b - other.b, c: plane.c - other.c });
      if (patch.length < 3) break;
    }
    if (patch.length >= 3 && Math.abs(signedArea(patch)) > 1e-8) patches.push({ pts: patch, plane });
  }
  return { planes, patches, height: p => Math.min(...planes.map(plane => value(plane, p))) };
}
