/** A short, forgiving ride. Coordinates are in the 960 × 540 illustrated world. */
export const RIDE_LENGTH = 3600;
export const RIDE_SPEED = 82;
export const BIKE_BOUNDS = { left: 80, right: 650, top: 396, bottom: 475 };
export type RideMode = 'ready' | 'riding' | 'paused' | 'won' | 'lost';

export interface Apple {
  id: number;
  x: number;
  y: number;
  height: number;
  speed: number;
  warning: number;
  landed: number;
  checked: boolean;
}

export class BikeRun {
  mode: RideMode = 'ready';
  x = 220;
  y = 433;
  distance = 0;
  elapsed = 0;
  hearts = 3;
  dodged = 0;
  invulnerable = 0;
  apples: Apple[] = [];
  private spawnIn = 2.3;
  private nextId = 0;

  constructor(private readonly random: () => number = Math.random) {}

  get progress(): number { return this.distance / RIDE_LENGTH; }
  get metresLeft(): number { return Math.ceil((RIDE_LENGTH - this.distance) / 12); }

  start(): void {
    this.mode = 'riding';
    this.x = 220; this.y = 433; this.distance = 0; this.elapsed = 0;
    this.hearts = 3; this.dodged = 0; this.invulnerable = 0;
    this.apples = []; this.spawnIn = 2.3; this.nextId = 0;
  }

  pause(): void { if (this.mode === 'riding') this.mode = 'paused'; }
  resume(): void { if (this.mode === 'paused') this.mode = 'riding'; }

  update(seconds: number, horizontal = 0, vertical = 0): void {
    if (this.mode !== 'riding' || !Number.isFinite(seconds) || seconds <= 0) return;
    // Small steps keep falling apples and collision detection stable after a slow frame.
    let remaining = Math.min(seconds, 0.25);
    while (remaining > 0 && this.mode === 'riding') {
      const dt = Math.min(remaining, 1 / 60);
      this.step(dt, horizontal, vertical);
      remaining -= dt;
    }
  }

  private step(dt: number, horizontal: number, vertical: number): void {
    this.elapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    const norm = Math.max(1, Math.hypot(horizontal, vertical));
    this.x = Math.max(BIKE_BOUNDS.left, Math.min(BIKE_BOUNDS.right, this.x + horizontal / norm * 220 * dt));
    this.y = Math.max(BIKE_BOUNDS.top, Math.min(BIKE_BOUNDS.bottom, this.y + vertical / norm * 150 * dt));
    this.distance = Math.min(RIDE_LENGTH, this.distance + RIDE_SPEED * dt);
    this.spawnIn -= dt;
    // The last stretch is clear, so the arrival at preschool feels like a reward.
    if (this.spawnIn <= 0 && this.distance < RIDE_LENGTH - 450) {
      const aimed = this.random() < 0.65;
      this.apples.push({
        id: this.nextId++,
        x: Math.max(80, Math.min(710, aimed ? this.x + (this.random() - 0.5) * 150 : 95 + this.random() * 600)),
        y: Math.max(398, Math.min(474, aimed ? this.y + (this.random() - 0.5) * 44 : 400 + this.random() * 72)),
        height: 285, speed: 35, warning: 0.85, landed: 0, checked: false,
      });
      this.spawnIn = 1.3 + this.random() * 0.7;
    }
    for (const apple of this.apples) {
      if (apple.warning > 0) { apple.warning = Math.max(0, apple.warning - dt); continue; }
      if (apple.height <= 0) { apple.landed += dt; continue; }
      apple.speed += 210 * dt;
      apple.height = Math.max(0, apple.height - apple.speed * dt);
      if (!apple.checked && apple.height <= 78 && apple.height >= 12
        && Math.abs(apple.x - this.x) < 33 && Math.abs(apple.y - this.y) < 20) {
        apple.checked = true;
        if (this.invulnerable === 0) {
          this.hearts--;
          this.invulnerable = 1.8;
          if (this.hearts === 0) { this.mode = 'lost'; return; }
        }
      }
      if (apple.height === 0 && !apple.checked) { apple.checked = true; this.dodged++; }
    }
    this.apples = this.apples.filter(a => a.landed < 0.6);
    if (this.distance === RIDE_LENGTH) { this.mode = 'won'; this.apples = []; }
  }
}
