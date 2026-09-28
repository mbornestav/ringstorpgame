import { describe, expect, it } from 'vitest';
import { MapCamera, VIEW_COUNT } from '../src/camera';
import { appearanceFor, buildingFront, roofGeometry, signedArea, triangulate } from '../src/buildings';
import { orientedCorners, pointInShape, shape } from '../src/geometry';
import { FOOTPRINTS, nearestRoad } from '../src/map';
import { HOME, MARCUS_A, PACKAGE, PROPS } from '../src/world';

describe('rotating the map', () => {
  it('round trips projection and keeps controls relative to every view', () => {
    const camera = new MapCamera();
    for (let step = 0; step < VIEW_COUNT; step++) {
      camera.setStep(step);
      for (const p of [HOME, MARCUS_A, PACKAGE, { x: -41.2, y: 39.7 }]) {
        const screen = camera.project(p.x, p.y), world = camera.unproject(screen.x, screen.y);
        expect(world.x).toBeCloseTo(p.x, 9);
        expect(world.y).toBeCloseTo(p.y, 9);
      }
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const world = camera.movement(x, y), screen = camera.project(world.x, world.y);
        expect(Math.hypot(world.x, world.y)).toBeCloseTo(1);
        if (x) { expect(screen.y).toBeCloseTo(0); expect(Math.sign(screen.x)).toBe(x); }
        if (y) { expect(screen.x).toBeCloseTo(0); expect(Math.sign(screen.y)).toBe(y); }
      }
    }
  });

  it('wraps a complete orbit and rejects invalid angles', () => {
    const camera = new MapCamera();
    camera.setStep(-1); expect(camera.step).toBe(7);
    camera.setStep(8); expect(camera.step).toBe(0);
    expect(camera.setStep(NaN)).toBe(false);
    expect(camera.setStep(Infinity)).toBe(false);
    expect(camera.step).toBe(0);
  });

  it('keeps oriented furniture fixed on the ground with visible positive faces', () => {
    const camera = new MapCamera();
    for (let step = 0; step < VIEW_COUNT; step++) {
      camera.setStep(step);
      for (const angle of [-0.6, 0, 0.72]) {
        const axes = camera.frame(angle, 2, 5);
        expect(camera.depth(Math.cos(axes.angle), Math.sin(axes.angle))).toBeGreaterThanOrEqual(-1e-9);
        expect(camera.depth(-Math.sin(axes.angle), Math.cos(axes.angle))).toBeGreaterThanOrEqual(-1e-9);
        const original = orientedCorners(0, 0, 2, 5, angle);
        for (const q of orientedCorners(0, 0, axes.w, axes.h, axes.angle)) expect(original.some(p => Math.hypot(p.x - q.x, p.y - q.y) < 1e-8)).toBe(true);
      }
    }
  });
});

describe('building silhouettes and references', () => {
  it('triangulates every real footprint without filling concave recesses', () => {
    for (const f of FOOTPRINTS) {
      const triangles = triangulate(f.pts);
      expect(triangles.reduce((a, t) => a + Math.abs(signedArea(t)), 0), f.address ?? String(f.id)).toBeCloseTo(Math.abs(signedArea(f.pts)), 6);
      for (const t of triangles) {
        const middle = { x: t.reduce((s, p) => s + p.x, 0) / 3, y: t.reduce((s, p) => s + p.y, 0) / 3 };
        expect(pointInShape(middle, shape(f.pts), 0.0001)).toBe(true);
      }
    }
  });

  it('covers each polygon exactly once with roof facets, including concave extensions', () => {
    for (const f of FOOTPRINTS) {
      const { angle, w, h, cx, cy } = f.obb;
      const appearance = appearanceFor(f, 20);
      for (const roofShape of ['gabled', 'flat', 'hipped'] as const) {
        const roof = roofGeometry(f.pts, angle, w, h, cx, cy, { ...appearance, roofShape }, w >= h);
        expect(roof.patches.reduce((a, patch) => a + Math.abs(signedArea(patch.pts)), 0)).toBeCloseTo(Math.abs(signedArea(f.pts)), 5);
        for (const patch of roof.patches) for (const p of patch.pts) {
          expect(roof.height(p)).toBeGreaterThanOrEqual(appearance.eaves - 1e-7);
          expect(roof.height(p)).toBeLessThanOrEqual(appearance.eaves + appearance.rise + 1e-7);
        }
      }
    }
  });

  it('assigns the supplied photos to Home, Marcus A and the kiosk', () => {
    const home = PROPS.find(p => p.role === 'home')!, marcus = PROPS.find(p => p.role === 'marcus')!, kiosk = PROPS.find(p => p.role === 'kiosk')!;
    expect(home.appearance?.model).toBe('terrace');
    expect(marcus.appearance?.model).toBe('marcus');
    expect(kiosk.appearance?.model).toBe('kiosk');
    expect(marcus.appearance!.rise).toBeGreaterThan(home.appearance!.rise);
    expect(kiosk.appearance!.roofShape).toBe('gabled');
    const row = PROPS.filter(p => /^Ringstorpsvägen 55[A-D]$/.test(p.footprint?.address ?? ''));
    expect(row).toHaveLength(4);
    expect(new Set(row.map(p => p.height)).size).toBe(1);
    expect(row.every(p => p.appearance?.model === 'terrace')).toBe(true);
    const homeFront = buildingFront(home.footprint!, HOME);
    for (const unit of row) {
      const front = buildingFront(unit.footprint!, unit === home ? HOME : nearestRoad(unit.x, unit.y)!);
      expect(front.nx * homeFront.nx + front.ny * homeFront.ny).toBeGreaterThan(0.99);
    }
  });
});
