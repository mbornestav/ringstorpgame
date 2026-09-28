import { iso, normalize, uniso, type Vec2 } from './geometry';

/** Eight fixed views keep the low-resolution artwork crisp while orbiting all 360 degrees. */
export const VIEW_COUNT = 8;
export class MapCamera {
  private view = 0;
  private cosine = 1;
  private sine = 0;

  get step(): number { return this.view; }
  get angle(): number { return this.view * Math.PI * 2 / VIEW_COUNT; }

  setStep(step: number): boolean {
    if (!Number.isFinite(step)) return false;
    const next = ((Math.round(step) % VIEW_COUNT) + VIEW_COUNT) % VIEW_COUNT;
    if (next === this.view) return false;
    this.view = next;
    this.cosine = Math.cos(this.angle);
    this.sine = Math.sin(this.angle);
    return true;
  }

  rotate(x: number, y: number): Vec2 {
    return { x: x * this.cosine - y * this.sine, y: x * this.sine + y * this.cosine };
  }

  unrotate(x: number, y: number): Vec2 {
    return { x: x * this.cosine + y * this.sine, y: -x * this.sine + y * this.cosine };
  }

  project(x: number, y: number): Vec2 {
    const p = this.rotate(x, y);
    return iso(p.x, p.y);
  }

  unproject(x: number, y: number): Vec2 {
    const p = uniso(x, y);
    return this.unrotate(p.x, p.y);
  }

  depth(x: number, y: number): number {
    return x * (this.cosine + this.sine) + y * (this.cosine - this.sine);
  }

  movement(x: number, y: number): Vec2 {
    // Preserve the game's equal-speed eight-way controls, relative to the current view.
    return normalize(this.unrotate(x + y, y - x));
  }

  /** Equivalent rectangle axes whose positive walls face the current camera. */
  frame(angle: number, w: number, h: number): { angle: number; w: number; h: number } {
    let facing = angle + this.angle;
    while (facing >= Math.PI / 4) { facing -= Math.PI / 2; [w, h] = [h, w]; }
    while (facing < -Math.PI / 4) { facing += Math.PI / 2; [w, h] = [h, w]; }
    return { angle: facing - this.angle, w, h };
  }
}
