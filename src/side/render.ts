import { Backdrop, CHUNK, DISTANT_PARALLAX, HORIZON, bakeClouds, bakeSky, drawNearLamp, facadeBox } from './backdrop';
import { LOOKS, POSES, drawFighter, type Look, type Pose } from './fighters';
import type { Effect, Officer, SideEnemy, SideGame, SidePlayer } from './game';
import { drawCar, drawPortrait } from './vehicles';
import { BAND_TOP, HEIGHT, WIDTH } from './layout';
import { disc, ellipse, rand, rect, seg, text, textWidth } from './pixel';
import type { Facade, Stage } from './stage';

export { WIDTH, HEIGHT } from './layout';

const FLASH = '#fff3ca';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Spark extends Effect { t: number; seed: number }

export class SideRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly c: CanvasRenderingContext2D;
  private readonly backdrops = new Map<Stage, Backdrop>();
  private readonly sky = bakeSky();
  private readonly clouds = bakeClouds();
  private elapsed = 0;
  private attract = 0;
  private fx: Spark[] = [];
  private trail: Array<{ x: number; y: number; z: number; facing: 1 | -1; t: number }> = [];
  private readonly lastWalk = new WeakMap<SideEnemy, number>();
  /** Left edge of the last frame drawn, in stage pixels. */
  view = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.c = context;
    context.imageSmoothingEnabled = false;
  }

  /** Restart the title screen's slow pan along the street. */
  resetCamera(): void { this.attract = 0; this.fx = []; this.trail = []; }

  private backdrop(stage: Stage): Backdrop {
    let b = this.backdrops.get(stage);
    if (!b) { b = new Backdrop(stage); this.backdrops.set(stage, b); }
    return b;
  }

  render(game: SideGame, dt: number): void {
    this.elapsed += dt;
    const stage = game.stage, bd = this.backdrop(stage), c = this.c;
    if (game.mode === 'title') this.attract = (this.attract + dt * 26) % Math.max(1, stage.length - WIDTH);
    const cam = Math.round(game.mode === 'title' ? this.attract : game.camera);
    const sx = game.shake > 0 ? Math.round((rand(this.elapsed * 97, 1) - 0.5) * game.shake * 2) : 0;
    const sy = game.shake > 0 ? Math.round((rand(this.elapsed * 89, 2) - 0.5) * game.shake * 1.4) : 0;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.sky, 0, 0);
    rect(c, 0, HORIZON, WIDTH, HEIGHT - HORIZON, '#6f9a4c');
    const drift = (cam * 0.06 + this.elapsed * 3) % (WIDTH * 2);
    c.drawImage(this.clouds, -Math.round(drift), 0);
    c.drawImage(this.clouds, WIDTH * 2 - Math.round(drift), 0);
    c.setTransform(1, 0, 0, 1, sx, sy);
    c.drawImage(bd.distant(), -Math.round(cam * DISTANT_PARALLAX), 0);
    const first = Math.floor(cam / CHUNK), last = Math.floor((cam + WIDTH) / CHUNK);
    for (let i = Math.max(0, first); i <= last; i++) c.drawImage(bd.chunk(i), i * CHUNK - cam, 0);
    // Bake the next chunk ahead of time so walking on never stalls.
    if ((last + 1) * CHUNK < stage.length && !bd.has(last + 1)) bd.chunk(last + 1);

    this.drawMarkers(game, cam);
    this.drawActors(game, cam, dt);
    this.drawEffects(game, cam, dt);
    for (const f of stage.furniture) {
      if (!f.near) continue;
      const x = (f.x - cam - WIDTH / 2) * 1.25 + WIDTH / 2;
      if (x > -30 && x < WIDTH + 30) drawNearLamp(c, x);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.drawAtmosphere();
    if (game.transition > 0) rect(c, 0, 0, WIDTH, HEIGHT, `rgba(12, 30, 35, ${game.transition / 0.35})`);
    if (game.mode === 'playing' || game.mode === 'paused') this.drawHud(game, cam);
    this.view = cam;
  }

  // ---------------------------------------------------------------- landmarks

  private landmark(stage: Stage, role: Facade['role']): Facade | undefined {
    return stage.facades.find(f => f.role === role);
  }

  private drawMarkers(game: SideGame, cam: number): void {
    const c = this.c, stage = game.stage;
    const bob = Math.round(Math.sin(this.elapsed * 3) * 2);
    for (const junction of stage.junctions) {
      const x = Math.round(junction.x - cam);
      if (x < -90 || x > WIDTH + 90) continue;
      const label = junction.id === 'romares' ? 'MARCUS A +' : 'KURIR LIVS +';
      const street = junction.id === 'romares' ? 'ROMARES VÄG' : 'KURIRGATAN';
      const w = Math.max(textWidth(label), textWidth(street)) + 17;
      rect(c, x - 1, 122, 3, 47, '#616e6b');
      rect(c, x, 122, 1, 47, '#c2c5b6');
      rect(c, x - w / 2, 122, w, 21, '#183f3b');
      rect(c, x - w / 2 + 1, 123, w - 2, 19, '#466f54');
      text(c, street, x - w / 2 + 4, 126, '#d5e0cc');
      text(c, label, x - w / 2 + 4, 135, '#f8e2aa');
      rect(c, x - 25, 146, 50, 11, '#eee6d0');
      text(c, 'HOME >', x - 17, 149, '#334b45');
      if (game.junctionAhead?.id === junction.id) this.hint(x, bob);
    }
    if (stage.shopX !== null) {
      // Beside the entrance: keep the ICA and Kurir Livs signs readable.
      const door = Math.round(stage.shopX - cam), x = door + 63, y = BAND_TOP - 25 + bob;
      if (x > -20 && x < WIDTH + 20) {
        rect(c, x - 7, y - 7, 15, 15, '#163f36');
        const col = game.shopHealed ? '#72897a' : '#a5e0a3';
        rect(c, x - 4, y - 1, 9, 3, col); rect(c, x - 1, y - 4, 3, 9, col);
        if (!game.shopHealed && game.hasPackage) this.hint(door, bob);
      }
    }
    if (!game.hasPackage) {
      const x = stage.package.x - cam, y = stage.package.y - 26 + bob;
      c.font = 'bold 20px Impact, "Arial Black", sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#10181f'; c.fillText('?', x + 1, y + 1);
      c.fillStyle = '#ef4e45'; c.fillText('?', x, y);
      c.textAlign = 'left';
    }
    const marcus = this.landmark(stage, 'marcus');
    if (marcus) {
      const b = facadeBox(marcus);
      // Above the roof, but never under the objective card.
      const ex = Math.round((b.x0 + b.x1) / 2 - cam), ey = Math.max(62, b.top - 12) + (game.healed ? 0 : bob);
      const p = game.player;
      const dx = p.x - cam - ex, dy = p.y - 28 - ey, len = Math.hypot(dx, dy) || 1;
      for (const off of [-5, 5]) {
        disc(c, ex + off, ey, 6, '#10181f');
        disc(c, ex + off, ey, 5, game.healed ? '#d8d4ca' : '#f6f4ee');
        const px = ex + off + Math.round(dx / len * 2.2), py = ey + Math.round(dy / len * 2.2);
        disc(c, px, py, 2.4, '#10181f');
        rect(c, px - 1, py - 1, 1, 1, '#ffffff');
      }
      if (game.marcusAhead && game.hasPackage && Math.abs(p.x - (stage.marcusX ?? 0)) < 170) this.hint(stage.marcusX! - cam, bob);
    }
    const home = this.landmark(stage, 'home');
    if (home) {
      const b = facadeBox(home);
      const x = Math.round(stage.homeX - cam) + 0.5, y = b.top - 16 + bob;
      const star = [0, -8, 2.4, -2.6, 8, -2.6, 3.6, 1.2, 5, 7, 0, 3.6, -5, 7, -3.6, 1.2, -8, -2.6, -2.4, -2.6];
      c.beginPath();
      for (let i = 0; i < star.length; i += 2) c.lineTo(x + star[i], y + star[i + 1]);
      c.closePath();
      c.fillStyle = '#f5c33b'; c.fill();
      c.strokeStyle = '#10181f'; c.lineWidth = 1.5; c.stroke();
      rect(c, x - 2, y - 3, 2, 2, '#fff3b0');
      if (game.homeCrewDown) this.hint(stage.homeX - cam, bob);
    }
  }

  /** A bouncing arrow on the pavement: step up here. */
  private hint(x: number, bob: number): void {
    const c = this.c, X = Math.round(x), Y = BAND_TOP - 12 - Math.abs(bob) * 2;
    c.fillStyle = '#10181f';
    c.beginPath(); c.moveTo(X - 7, Y + 7); c.lineTo(X, Y - 1); c.lineTo(X + 7, Y + 7); c.closePath(); c.fill();
    c.fillStyle = '#f3cc75';
    c.beginPath(); c.moveTo(X - 5, Y + 6); c.lineTo(X, Y + 1); c.lineTo(X + 5, Y + 6); c.closePath(); c.fill();
  }

  // ---------------------------------------------------------------- fighters

  private drawActors(game: SideGame, cam: number, dt: number): void {
    const c = this.c;
    const p = game.player;
    const enemies = game.enemies.filter(e => !e.gone && e.x > cam - 60 && e.x < cam + WIDTH + 60);
    // Shadows first, so nobody's shadow falls across someone standing in front.
    for (const e of enemies) this.shadow(e.x - cam, e.y, e.z, e.kind === 'boss' ? 13 : e.kind === 'bruiser' ? 11 : 9);
    const officers = game.police.filter(o => o.x > cam - 60 && o.x < cam + WIDTH + 60);
    for (const o of officers) this.shadow(o.x - cam, o.y, o.z, 9);
    this.shadow(p.x - cam, p.y, p.z, 9);
    if (!game.hasPackage) this.shadow(game.stage.package.x - cam, game.stage.package.y, 0, 8);

    this.trail = this.trail.filter(t => (t.t += dt) < 0.18);
    if (p.dodgeTimer > 0 && game.mode === 'playing') this.trail.push({ x: p.x, y: p.y, z: p.z, facing: p.facing, t: 0 });

    const actors: Array<{ y: number; x: number; draw: () => void }> = [];
    const dd = game.delivery;
    if (dd && dd.carId === null && dd.timer <= 0) {
      this.shadow(dd.x - cam, dd.y, 0, 9);
      actors.push({ y: dd.y, x: dd.x, draw: () => {
        drawFighter(c, dd.x - cam, dd.y, 0, dd.state === 'leaving' || dd.x > p.x ? -1 : 1, LOOKS.dd, dd.state === 'ready' ? POSES.loiter(this.elapsed) : POSES.walk(dd.walk));
        const label = 'D.D', x = Math.round(dd.x - cam) - 9;
        rect(c, x - 3, dd.y - 60, 25, 11, '#152b2b');
        text(c, label, x, dd.y - 57, '#d1df9a');
      } });
    }
    for (const e of enemies) actors.push({ y: e.y, x: e.x, draw: () => this.drawEnemy(e, cam) });
    for (const o of officers) actors.push({ y: o.y, x: o.x, draw: () => this.drawOfficer(o, cam) });
    // A car covers anyone standing behind its tyre line.
    for (const car of game.cars) if (car.x > cam - 90 && car.x < cam + WIDTH + 90) actors.push({ y: car.y + 0.5, x: car.x, draw: () => drawCar(c, car, car.x - cam, this.elapsed) });
    actors.push({ y: p.y + 0.1, x: p.x, draw: () => this.drawPlayer(game, p, cam) });
    if (!game.hasPackage) actors.push({ y: game.stage.package.y, x: game.stage.package.x, draw: () => this.drawPackage(game.stage.package.x - cam, game.stage.package.y) });
    actors.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const a of actors) a.draw();
    c.globalAlpha = 1;
  }

  private shadow(x: number, y: number, z: number, size: number): void {
    const k = 1 - Math.min(z, 70) / 140;
    ellipse(this.c, x, y, size * k, 2.5 * k, 'rgba(22, 30, 38, 0.36)');
  }

  private drawPlayer(game: SideGame, p: SidePlayer, cam: number): void {
    const c = this.c;
    const pose = this.playerPose(game, p);
    const opts = { parcel: game.hasPackage, satchel: true, gun: game.ammo > 0 };
    for (const t of this.trail) {
      c.globalAlpha = 0.35 * (1 - t.t / 0.18);
      drawFighter(c, t.x - cam, t.y, t.z, t.facing, LOOKS.player, POSES.dodge(), { ...opts, tint: '#86d5c7' });
    }
    c.globalAlpha = 1;
    const blink = p.invulnerable > 0 && p.dodgeTimer <= 0 && p.downTimer <= 0 && Math.floor(this.elapsed * 18) % 2 === 0;
    if (blink && game.mode === 'playing') return;
    drawFighter(c, p.x - cam, p.y, p.z, p.facing, LOOKS.player, pose, { ...opts, tint: p.flash > 0 ? FLASH : undefined });
    // A swish behind the big hits.
    if ((p.attackTimer > 0 && p.combo === 3) || (p.kick && p.z > 3)) {
      const x = p.x - cam + p.facing * (p.kick ? 20 : 16), y = p.y - p.z - (p.kick ? 20 : 30);
      c.strokeStyle = 'rgba(255, 241, 176, 0.8)'; c.lineWidth = 2;
      c.beginPath(); c.arc(x - p.facing * 6, y, 11, p.facing > 0 ? -1.2 : Math.PI - 0.6, p.facing > 0 ? 0.6 : Math.PI + 1.2); c.stroke();
    }
  }

  private playerPose(game: SideGame, p: SidePlayer): Pose {
    if (p.hp <= 0 || p.downTimer > 0) return POSES.down(this.fall(p.z, p.vz));
    if (p.cuffTimer > 0) return POSES.cuffed();
    if (p.riseTimer > 0) return POSES.rise(1 - p.riseTimer / 0.35);
    if (p.hurtTimer > 0) return POSES.hurt();
    if (p.dodgeTimer > 0) return POSES.dodge();
    if (p.z > 0) return p.kick ? POSES.kick() : POSES.jump();
    if (p.attackTimer > 0) return POSES.punch(p.combo, 1 - p.attackTimer / p.attackLength);
    if (p.aimTimer > 0) return POSES.aim();
    if (p.waveTimer > 0) return POSES.wave(this.elapsed);
    if (game.mode === 'victory') return POSES.cheer(this.elapsed);
    if (p.moving) return POSES.walk(p.walk);
    return POSES.idle(this.elapsed);
  }

  /** How far through a fall a body is, from its height and speed. */
  private fall(z: number, vz: number): number {
    return z > 0 ? clamp(0.3 + (160 - vz) / 320, 0.3, 0.95) : 1;
  }

  private drawEnemy(e: SideEnemy, cam: number): void {
    const c = this.c;
    const look: Look = LOOKS[e.kind];
    const moved = (this.lastWalk.get(e) ?? e.walk) !== e.walk;
    this.lastWalk.set(e, e.walk);
    let pose: Pose;
    switch (e.state) {
      case 'idle': pose = POSES.loiter(this.elapsed + e.id); break;
      case 'walk': pose = moved ? POSES.walk(e.walk) : POSES.idle(this.elapsed + e.id * 0.3); break;
      case 'windup': pose = POSES.windup(this.elapsed); break;
      case 'strike': pose = POSES.strike(); break;
      case 'recover': pose = POSES.idle(this.elapsed); break;
      case 'hurt': pose = POSES.hurt(); break;
      case 'down': pose = POSES.down(this.fall(e.z, e.vz)); break;
      case 'rise': pose = POSES.rise(1 - e.timer / 0.4); break;
      default: pose = POSES.down(1);
    }
    if (e.state === 'ko' && e.timer < 0.6 && Math.floor(this.elapsed * 14) % 2 === 0) return;
    const x = e.x - cam;
    drawFighter(c, x, e.y, e.z, e.facing, look, pose, { tint: e.flash > 0 ? FLASH : undefined });
    const top = e.y - e.z - look.height - 8;
    if (e.state === 'windup') {
      c.font = 'bold 12px monospace';
      c.fillStyle = '#10181f'; c.fillText('!', x - 2, top + 1);
      c.fillStyle = '#fff1b8'; c.fillText('!', x - 3, top);
    }
    if (e.hp > 0 && (e.hp < e.maxHp || e.kind === 'boss') && e.state !== 'idle') {
      const w = e.kind === 'boss' ? 24 : 18;
      rect(c, x - w / 2 - 1, top - 12, w + 2, 3, '#273942');
      rect(c, x - w / 2, top - 11, Math.max(0, Math.round(w * e.hp / e.maxHp)), 1, e.kind === 'boss' ? '#f2be64' : '#e36e61');
    }
  }

  private drawOfficer(o: Officer, cam: number): void {
    const c = this.c;
    let pose: Pose;
    switch (o.state) {
      case 'run': case 'leave': pose = POSES.walk(o.walk); break;
      case 'grab': pose = POSES.grab(); break;
      case 'hurt': pose = POSES.hurt(); break;
      case 'down': pose = POSES.down(this.fall(o.z, o.vz)); break;
      case 'rise': pose = POSES.rise(1 - o.timer / 0.4); break;
      default: pose = POSES.idle(this.elapsed + o.id);
    }
    const x = o.x - cam;
    drawFighter(c, x, o.y, o.z, o.facing, LOOKS.police, pose, { tint: o.flash > 0 ? FLASH : undefined });
    if (o.state === 'grab') {
      const top = o.y - o.z - LOOKS.police.height - 8;
      c.font = 'bold 12px monospace';
      c.fillStyle = '#10181f'; c.fillText('!', x - 2, top + 1);
      c.fillStyle = '#9cc4ff'; c.fillText('!', x - 3, top);
    }
  }

  private drawPackage(x: number, y: number): void {
    const c = this.c, X = Math.round(x), Y = Math.round(y);
    rect(c, X - 8, Y - 12, 16, 12, '#3a2a22');
    rect(c, X - 7, Y - 7, 14, 6, '#b97c3e');
    rect(c, X - 7, Y - 11, 14, 5, '#dfad59');
    rect(c, X - 1, Y - 11, 3, 10, '#fff0b0');
    rect(c, X - 7, Y - 5, 14, 1, '#ac6646');
  }

  // ---------------------------------------------------------------- hits and dust

  private drawEffects(game: SideGame, cam: number, dt: number): void {
    for (const e of game.effects.splice(0)) this.fx.push({ ...e, t: 0, seed: Math.floor(rand(e.x, this.elapsed * 100) * 1000) });
    const c = this.c;
    const life = { spark: 0.16, smash: 0.26, dust: 0.4, heal: 0.9, muzzle: 0.07, tracer: 0.07, toss: 0.45 };
    this.fx = this.fx.filter(f => (f.t += dt) < life[f.kind]);
    for (const f of this.fx) {
      const x = Math.round(f.x - cam), y = Math.round(f.y - f.z);
      const k = f.t / life[f.kind];
      if (f.kind === 'spark' || f.kind === 'smash') {
        const big = f.kind === 'smash';
        const rays = big ? 8 : 5, len = (big ? 15 : 8) * (0.4 + k);
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2 + f.seed;
          seg(c, x + Math.cos(a) * len * 0.35, y + Math.sin(a) * len * 0.35, x + Math.cos(a) * len, y + Math.sin(a) * len, 1, i % 2 ? '#ffd166' : '#fffbe8');
        }
        if (k < 0.5) disc(c, x, y, big ? 4 : 2.5, '#ffffff');
        if (big) {
          c.strokeStyle = `rgba(255, 170, 90, ${1 - k})`; c.lineWidth = 2;
          c.beginPath(); c.arc(x, y, 6 + k * 14, 0, Math.PI * 2); c.stroke();
        }
      } else if (f.kind === 'muzzle') {
        disc(c, x, y, 3, '#fff6c8');
        for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) seg(c, x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 4, 1, '#ffd166');
      } else if (f.kind === 'tracer') {
        c.globalAlpha = 1 - k;
        seg(c, x, y, Math.round((f.x1 ?? f.x) - cam), y, 1, '#fff2b0');
        c.globalAlpha = 1;
      } else if (f.kind === 'toss') {
        // The gun spins across in an arc from D.D's window to the courier.
        const tx = x + ((f.x1 ?? f.x) - f.x) * k, ty = y + ((f.y1 ?? f.y) - 30 - (f.y - f.z)) * k - Math.sin(k * Math.PI) * 26;
        const flip = Math.floor(k * 8) % 2;
        rect(c, tx - 4, ty - 2, flip ? 8 : 4, flip ? 4 : 7, '#141820');
        rect(c, tx - 3, ty - 1, flip ? 6 : 2, flip ? 2 : 5, '#3b4148');
      } else if (f.kind === 'dust') {
        for (const side of [-1, 1]) {
          const r = 3 + k * 5;
          c.globalAlpha = 0.6 * (1 - k);
          disc(c, x + side * (6 + k * 14), y - 3 - k * 4, r, '#cfc6b4');
        }
        c.globalAlpha = 1;
      } else {
        for (let i = 0; i < 6; i++) {
          const px = x + Math.round((rand(f.seed, i) - 0.5) * 26), py = Math.round(y - k * 26 - rand(f.seed, i + 9) * 14);
          c.globalAlpha = 1 - k;
          if (i % 2) { rect(c, px - 2, py, 5, 1, '#6fd08c'); rect(c, px, py - 2, 1, 5, '#6fd08c'); }
          else rect(c, px, py, 1, 1, '#fff3b0');
        }
        c.globalAlpha = 1;
      }
    }
  }

  // ---------------------------------------------------------------- overlays

  private drawAtmosphere(): void {
    const c = this.c;
    const haze = c.createLinearGradient(0, 0, 0, HEIGHT);
    haze.addColorStop(0, 'rgba(255, 214, 160, 0.14)');
    haze.addColorStop(0.5, 'rgba(255, 214, 160, 0.02)');
    haze.addColorStop(1, 'rgba(24, 40, 70, 0.12)');
    c.fillStyle = haze; c.fillRect(0, 0, WIDTH, HEIGHT);
    c.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let y = 0; y < HEIGHT; y += 3) c.fillRect(0, y, WIDTH, 1);
    const vignette = c.createRadialGradient(WIDTH / 2, HEIGHT / 2, 110, WIDTH / 2, HEIGHT / 2, 330);
    vignette.addColorStop(0, 'rgba(7, 20, 32, 0)'); vignette.addColorStop(1, 'rgba(7, 20, 32, 0.38)');
    c.fillStyle = vignette; c.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawHud(game: SideGame, cam: number): void {
    const c = this.c, stage = game.stage;
    if (game.goTimer > 0 && Math.floor(this.elapsed * 4) % 2 === 0) {
      const x = WIDTH - 74, y = 112;
      c.font = 'bold 26px Impact, "Arial Black", sans-serif';
      c.fillStyle = '#10181f'; c.fillText('GO', x + 2, y + 2);
      c.fillStyle = '#f3cc75'; c.fillText('GO', x, y);
      c.fillStyle = '#10181f';
      c.beginPath(); c.moveTo(x + 40, y - 20); c.lineTo(x + 58, y - 9); c.lineTo(x + 40, y + 2); c.closePath(); c.fill();
      c.fillStyle = '#ef7a58';
      c.beginPath(); c.moveTo(x + 39, y - 21); c.lineTo(x + 56, y - 10); c.lineTo(x + 39, y + 1); c.closePath(); c.fill();
    }
    if (game.messageTimer > 0 && game.mode === 'playing') {
      c.globalAlpha = Math.min(1, game.messageTimer * 2);
      c.font = 'bold 10px monospace';
      const width = Math.min(WIDTH - 24, c.measureText(game.message).width + 26);
      c.fillStyle = '#102c35e6'; c.fillRect((WIDTH - width) / 2, 40, width, 20);
      c.strokeStyle = '#eec36e'; c.lineWidth = 1; c.strokeRect((WIDTH - width) / 2 + 0.5, 40.5, width - 1, 19);
      c.fillStyle = '#f7e8c4'; c.textAlign = 'center'; c.fillText(game.message, WIDTH / 2, 53); c.textAlign = 'left';
      if (game.message.startsWith('D.D')) drawPortrait(c, Math.round((WIDTH - width) / 2) - 25, 38);
      c.globalAlpha = 1;
    }
    if (game.wanted) {
      // Flashing blue lights: the police are after you.
      const on = Math.floor(this.elapsed * 6) % 2;
      rect(c, 10, 64, 58, 14, '#101c33e6');
      rect(c, 10, 64, 58, 1, '#5aa2ff');
      rect(c, 14, 68, 6, 6, on ? '#5aa2ff' : '#1d3566');
      rect(c, 58, 68, 6, 6, on ? '#1d3566' : '#5aa2ff');
      text(c, 'POLIS', 29, 69, '#f2d31b');
    }
    const boss = game.enemies.find(e => e.kind === 'boss' && e.hp > 0 && e.state !== 'idle');
    if (boss) {
      const x0 = 120, w = 240;
      rect(c, x0 - 8, 253, w + 16, 15, 'rgba(16, 42, 53, 0.86)');
      text(c, 'THE RINGSTORPSVÄGEN BOSS', x0, 256, '#edc278');
      rect(c, x0, 263, w, 3, '#273942');
      rect(c, x0, 263, Math.round(w * boss.hp / boss.maxHp), 3, '#e36e61');
      rect(c, x0, 263, Math.round(w * boss.hp / boss.maxHp), 1, '#f5a08e');
      return;
    }
    // The route strip: where you are between the kiosk and home, and the crews along the way.
    const X0 = 64, X1 = WIDTH - 112, Y = 261;
    const toX = (x: number) => Math.round(X0 + (X1 - X0) * clamp(x / stage.homeX, 0, 1));
    rect(c, X0 - 8, 254, X1 - X0 + 74, 14, 'rgba(16, 42, 53, 0.78)');
    rect(c, X0, Y, X1 - X0, 1, '#58716d');
    rect(c, X0, Y, toX(game.player.x) - X0, 1, '#edc278');
    for (const e of stage.encounters) {
      if (e.home) continue;
      const state = game.encounterState(e.id);
      rect(c, toX(e.spawns[0].x) - 1, Y - 1, 3, 3, state === 'cleared' ? '#5b6b6b' : state === 'active' ? '#ffd166' : '#e36e61');
    }
    if (!game.hasPackage) rect(c, toX(stage.package.x) - 2, Y - 2, 5, 5, '#dfad59');
    if (stage.marcusX !== null) {
      const mx = toX(stage.marcusX), col = game.healed ? '#5b976f' : '#6fd08c';
      rect(c, mx - 2, Y, 5, 1, col); rect(c, mx, Y - 2, 1, 5, col);
    }
    if (stage.shopX !== null) {
      const sx = toX(stage.shopX), col = game.shopHealed ? '#5b976f' : '#a5e0a3';
      rect(c, sx - 2, Y, 5, 1, col); rect(c, sx, Y - 2, 1, 5, col);
    }
    for (const j of stage.junctions) if (!game.decisions.has(j.id)) {
      const x = toX(j.x);
      seg(c, x - 5, Y - 5, x, Y, 1, '#a5e0a3');
      rect(c, x - 6, Y - 6, 3, 3, '#a5e0a3');
    }
    rect(c, X1 - 2, Y - 2, 5, 5, '#f5c33b');
    const px = toX(game.player.x);
    c.fillStyle = '#86d5c7';
    c.beginPath(); c.moveTo(px - 3, Y - 6); c.lineTo(px + 3, Y - 6); c.lineTo(px, Y - 2); c.closePath(); c.fill();
    const label = `${Math.round(game.metresToHome)} M HOME`;
    text(c, label, X1 + 10, Y - 2, '#e7dabc');
  }
}
