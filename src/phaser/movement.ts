/** Adventure-specific tuning. Ground integration and bounds belong to Arcade Physics. */
export interface MovementInput { x: number; y: number; sneak: boolean }
export interface MotionState {
  z: number; vz: number; vx: number; facing: 1 | -1; moving: boolean; walk: number;
  invulnerable: number; dodgeTimer: number; dodgeCooldown: number;
}
export const createMotion = (): MotionState => ({ z: 0, vz: 0, vx: 0, facing: 1, moving: false, walk: 0, invulnerable: 0, dodgeTimer: 0, dodgeCooldown: 0 });
export class Movement {
  state = createMotion();
  private jumpBuffer = 0;
  private dodgeBuffer = 0;
  jump(): void { this.jumpBuffer = 0.12; }
  dodge(): void { this.dodgeBuffer = 0.12; }
  clearInput(): void { this.jumpBuffer = this.dodgeBuffer = 0; }
  step(dt: number, input: MovementInput): { x: number; y: number; sounds: string[] } {
    const p = this.state, sounds: string[] = [];
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.dodgeBuffer = Math.max(0, this.dodgeBuffer - dt);
    const grounded = p.z <= 0;
    if (this.dodgeBuffer > 0 && grounded && p.dodgeCooldown <= 0) {
      this.dodgeBuffer = 0;
      if (input.x) p.facing = input.x > 0 ? 1 : -1;
      p.dodgeTimer = 0.26; p.dodgeCooldown = 0.8; p.invulnerable = Math.max(p.invulnerable, 0.32); sounds.push('dodge');
    }
    if (this.jumpBuffer > 0 && grounded && p.dodgeTimer <= 0) {
      this.jumpBuffer = 0; p.vz = 250; p.z = 0.01; p.vx = input.x * 96;
      if (input.x) p.facing = input.x > 0 ? 1 : -1;
      sounds.push('jump');
    }
    let x = 0, y = 0;
    if (p.dodgeTimer > 0) {
      p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
      x = p.facing * 250; y = input.y * 29; p.walk += dt * 16;
    } else if (p.z > 0) x = p.vx;
    else {
      const pace = input.sneak ? 0.55 : 1;
      x = input.x * 96 * pace; y = input.y * 58 * pace;
      if (input.x) p.facing = input.x > 0 ? 1 : -1;
      p.moving = !!(input.x || input.y);
      if (p.moving) p.walk += dt * 10 * pace;
    }
    if (p.z > 0) p.moving = false;
    if (p.z > 0 || p.vz > 0) {
      p.vz -= 900 * dt; p.z += p.vz * dt;
      if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx = 0; }
    }
    return { x, y, sounds };
  }
}
