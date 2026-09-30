import { Backdrop, CHUNK, CHUNK_PAD, DISTANT_PARALLAX, DISTANT_SEGMENT, HORIZON, bakeClouds, bakeSky, drawNearLamp, facadeBox } from './backdrop';
import { LOOKS, POSES, drawFighter, type Look, type Pose } from './fighters';
import type { Effect, Officer, SideEnemy, SideGame, SidePlayer } from './game';
import type { Buddy } from './yard';
import { PORTRAIT_H, PORTRAIT_W, drawCar, drawPortrait } from './vehicles';
import { BAND_TOP, HEIGHT, WIDTH } from './layout';
import { beginArt, disc, ellipse, isRetro, isSmooth, rand, rect, rgrad, seg, text, textWidth } from './pixel';
import { t } from './i18n';
import { drawProp, drawRoom } from './interior';
import { ARCHETYPE } from './gods-cast';
import { actorTint, bakeNightSky, drawBeams, drawLights, nightAtmosphere, nightTint } from './night';
import { drawTruck } from './vehicle-art';
import { paintAlert, paintCrossBadge, paintEyes, paintHint, paintPanel, paintParcel, paintPost, paintQuestionBadge, paintStar } from './package-art';
import { TRUCK_Y } from './yard';

import { SIGHT_RANGE, type Patrol } from './gods-run';
import type { Facade, Stage } from './stage';
import { drawLiljedalJourney } from './karlstad-art';

export { WIDTH, HEIGHT } from './layout';

const FLASH = '#fff3ca';
/** The retro sprite outline: the palettes' ink. */
const OUTLINE = '#1c2126';
function layer(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = HEIGHT;
  return canvas.getContext('2d')!;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Spark extends Effect { t: number; seed: number }

/**
 * Draws the side-scrolling world in logical 480x270 coordinates. With `scale` 1 in pixel mode it is the original
 * renderer; the Phaser build sets smooth mode and a scale of 3, so the same drawing lands on a 1440x810 canvas as
 * anti-aliased vector shapes.
 */
export class SideRenderer {
  readonly canvas: HTMLCanvasElement;
  /** Where the art goes: the frame, or the actor layer while the retro outline pass collects actors. */
  private c: CanvasRenderingContext2D;
  private readonly frame: CanvasRenderingContext2D;
  private layers: { actors: CanvasRenderingContext2D; ink: CanvasRenderingContext2D } | null = null;
  private readonly backdrops = new Map<Stage, Backdrop>();
  private readonly sky: HTMLCanvasElement;
  private readonly nightSky: HTMLCanvasElement;
  private readonly clouds: HTMLCanvasElement;
  private readonly S: number;
  private elapsed = 0;
  private attract = 0;
  private fx: Spark[] = [];
  private trail: Array<{ x: number; y: number; z: number; facing: 1 | -1; t: number }> = [];
  private readonly lastWalk = new WeakMap<SideEnemy, number>();
  /** Left edge of the last frame drawn, in stage pixels. */
  view = 0;
  /** The Phaser build draws its own HUD over this canvas and turns the in-canvas one off. */
  showHud = true;
  /** The light of the last frame drawn, which picks the retro palette. */
  lighting: 'day' | 'night' | 'interior' = 'day';

  constructor(canvas: HTMLCanvasElement, scale = 1) {
    this.canvas = canvas;
    this.S = isSmooth() ? scale : 1;
    canvas.width = WIDTH * this.S;
    canvas.height = HEIGHT * this.S;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.c = this.frame = context;
    context.imageSmoothingEnabled = isSmooth();
    if (isSmooth()) context.imageSmoothingQuality = 'high';
    beginArt(context, this.S);
    this.sky = bakeSky(this.S);
    this.nightSky = bakeNightSky(this.S);
    this.clouds = bakeClouds(this.S);
  }

  /** Restart the title screen's slow pan along the street. */
  resetCamera(): void { this.attract = 0; this.fx = []; this.trail = []; }

  private backdrop(stage: Stage): Backdrop {
    let b = this.backdrops.get(stage);
    if (!b) { b = new Backdrop(stage, this.S); this.backdrops.set(stage, b); }
    return b;
  }

  /** Snaps a logical distance to the device grid: whole pixels in pixel mode, thirds at 3x. */
  private snap(v: number): number { return Math.round(v * this.S) / this.S; }

  /** Sets the transform for drawing in logical pixels, shifted by (dx, dy) logical pixels (camera shake). */
  private place(dx = 0, dy = 0): void { this.c.setTransform(this.S, 0, 0, this.S, dx * this.S, dy * this.S); }

  /** Draws a baked canvas at a logical position, at its natural size (it was baked S times larger). */
  private blit(image: HTMLCanvasElement, x: number, y = 0): void { this.c.drawImage(image, x, y, image.width / this.S, image.height / this.S); }

  render(game: SideGame, dt: number): void {
    this.elapsed += dt;
    if (game.busRide !== null) {
      this.place(); this.lighting = 'day'; this.view = 0;
      drawLiljedalJourney(this.c, game.busRide);
      if (game.busRide >= 7) {
        drawFighter(this.c, 246, 218, 0, 1, LOOKS.player, POSES.loiter(this.elapsed));
        this.drawPackage(262, 218);
      }
      return;
    }
    if (game.level === 2 && game.gods.scene !== 'street' && game.mode !== 'title') { this.renderInterior(game); return; }
    const stage = game.stage, bd = this.backdrop(stage), c = this.c;
    if (game.mode === 'title') this.attract = (this.attract + dt * 26) % Math.max(1, stage.length - WIDTH);
    const cam = this.snap(game.mode === 'title' ? this.attract : game.camera);
    const sx = game.shake > 0 ? this.snap((rand(this.elapsed * 97, 1) - 0.5) * game.shake * 2) : 0;
    const sy = game.shake > 0 ? this.snap((rand(this.elapsed * 89, 2) - 0.5) * game.shake * 1.4) : 0;

    this.place();
    const night = !!stage.night;
    this.blit(night ? this.nightSky : this.sky, 0);
    rect(c, 0, HORIZON, WIDTH, HEIGHT - HORIZON, '#6f9a4c');
    if (!night) {
      const drift = this.snap((cam * 0.06 + this.elapsed * 3) % (WIDTH * 2));
      this.blit(this.clouds, -drift);
      this.blit(this.clouds, WIDTH * 2 - drift);
    }
    this.place(sx, sy);
    this.drawDistant(bd, cam);
    const first = Math.floor(cam / CHUNK), last = Math.floor((cam + WIDTH) / CHUNK), pad = isSmooth() ? CHUNK_PAD : 0;
    for (let i = Math.max(0, first); i <= last; i++) this.blit(bd.chunk(i), i * CHUNK - cam - pad);
    // In smooth mode chunks are large; keep only those the camera is near (pixel chunks are tiny, so they all stay).
    if (isSmooth()) bd.evict(first - 2, last + 4);
    // Bake the chunks ahead of time so walking, and driving, never stall: one a frame, the nearest first.
    for (let k = 1; k <= 3; k++) if ((last + k) * CHUNK < stage.length && !bd.has(last + k)) { bd.chunk(last + k); break; }
    if (night) { nightTint(c); drawLights(c, stage.lights ?? [], cam, this.elapsed); }

    this.drawMarkers(game, cam);
    this.drawActors(game, cam, dt);
    this.drawEffects(game, cam, dt);
    if (night) { actorTint(c); drawBeams(c, game.cars, cam); }
    for (const f of stage.furniture) {
      if (!f.near) continue;
      const x = (f.x - cam - WIDTH / 2) * 1.25 + WIDTH / 2;
      if (x > -30 && x < WIDTH + 30) drawNearLamp(c, x);
    }
    this.place();
    if (night) nightAtmosphere(c); else this.drawAtmosphere();
    if (game.transition > 0) rect(c, 0, 0, WIDTH, HEIGHT, `rgba(12, 30, 35, ${game.transition / 0.35})`);
    this.lighting = night ? 'night' : 'day';
    if (this.showHud && (game.mode === 'playing' || game.mode === 'paused')) this.drawHud(game, cam);
    this.view = cam;
  }

  /** The ridge and rooftops beyond the street: one strip in pixel mode, slices in smooth mode. */
  private drawDistant(bd: Backdrop, cam: number): void {
    const offset = cam * DISTANT_PARALLAX;
    if (!isSmooth()) { this.blit(bd.distant(), -Math.round(offset)); return; }
    const from = Math.max(0, Math.floor(offset / DISTANT_SEGMENT)), to = Math.min(bd.distantSegments - 1, Math.floor((offset + WIDTH) / DISTANT_SEGMENT));
    for (let i = from; i <= to; i++) this.blit(bd.distantSegment(i), i * DISTANT_SEGMENT - CHUNK_PAD - this.snap(offset));
  }

  // ---------------------------------------------------------------- landmarks

  private landmark(stage: Stage, role: Facade['role']): Facade | undefined {
    return stage.facades.find(f => f.role === role);
  }

  private drawMarkers(game: SideGame, cam: number): void {
    const c = this.c, stage = game.stage;
    const bob = Math.round(Math.sin(this.elapsed * 3) * 2);
    for (const stop of game.custom?.street.restStops ?? []) {
      const x = stop.x - cam;
      if (x < -30 || x > WIDTH + 30) continue;
      const used = game.rested.has(stop.x);
      if (isSmooth()) paintCrossBadge(c, x, 129 + bob, used);
      else { rect(c, x - 5, 129 + bob, 11, 3, used ? '#6a836f' : '#b9ec91'); rect(c, x - 1, 125 + bob, 3, 11, used ? '#6a836f' : '#b9ec91'); }
      if (!used && game.hasPackage) this.hint(x, bob);
    }
    for (const junction of stage.junctions) {
      const x = Math.round(junction.x - cam);
      if (x < -90 || x > WIDTH + 90) continue;
      const label = t(junction.id === 'romares' ? 'cv.marcus' : 'cv.kurir');
      const street = junction.id === 'romares' ? 'ROMARES VÄG' : 'KURIRGATAN';
      const w = Math.max(textWidth(label), textWidth(street)) + 17;
      if (isSmooth()) {
        paintPost(c, x + 0.5, 122, 169, 2.6);
        paintPanel(c, x - w / 2, 122, w, 21, '#3f6a50', '#cfe0c4', 1.8);
        text(c, street, x - w / 2 + 4, 126, '#e1ead9');
        text(c, label, x - w / 2 + 4, 135, '#fbe3a4');
        paintPanel(c, x - 25, 146, 50, 11, '#efe8d3', '#9aa39a', 1.4);
        text(c, t('cv.home'), x - 17, 149, '#334b45');
        if (game.junctionAhead?.id === junction.id) this.hint(x, bob);
        continue;
      }
      rect(c, x - 1, 122, 3, 47, '#616e6b');
      rect(c, x, 122, 1, 47, '#c2c5b6');
      rect(c, x - w / 2, 122, w, 21, '#183f3b');
      rect(c, x - w / 2 + 1, 123, w - 2, 19, '#466f54');
      text(c, street, x - w / 2 + 4, 126, '#d5e0cc');
      text(c, label, x - w / 2 + 4, 135, '#f8e2aa');
      rect(c, x - 25, 146, 50, 11, '#eee6d0');
      text(c, t('cv.home'), x - 17, 149, '#334b45');
      if (game.junctionAhead?.id === junction.id) this.hint(x, bob);
    }
    if (stage.shopX !== null && game.level === 1) {
      // Beside the entrance: keep the ICA and Kurir Livs signs readable.
      const door = Math.round(stage.shopX - cam), x = door + 63, y = BAND_TOP - 25 + bob;
      if (x > -20 && x < WIDTH + 20) {
        if (isSmooth()) paintCrossBadge(c, x + 0.5, y + 0.5, game.shopHealed);
        else {
        rect(c, x - 7, y - 7, 15, 15, '#163f36');
        const col = game.shopHealed ? '#72897a' : '#a5e0a3';
        rect(c, x - 4, y - 1, 9, 3, col); rect(c, x - 1, y - 4, 3, 9, col);
        }
        if (!game.shopHealed && game.hasPackage) this.hint(door, bob);
      }
    }
    if (!game.hasPackage) {
      const x = stage.package.x - cam, y = stage.package.y - 26 + bob;
      if (isSmooth()) paintQuestionBadge(c, x, y - 7, this.elapsed);
      else {
      c.font = 'bold 20px Impact, "Arial Black", sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#10181f'; c.fillText('?', x + 1, y + 1);
      c.fillStyle = '#ef4e45'; c.fillText('?', x, y);
      c.textAlign = 'left';
      }
    }
    const marcus = this.landmark(stage, 'marcus');
    if (marcus) {
      const b = facadeBox(marcus);
      // Above the roof, but never under the objective card.
      const ex = Math.round((b.x0 + b.x1) / 2 - cam), ey = Math.max(62, b.top - 12) + (game.healed ? 0 : bob);
      const p = game.player;
      const dx = p.x - cam - ex, dy = p.y - 28 - ey, len = Math.hypot(dx, dy) || 1;
      if (isSmooth()) paintEyes(c, ex + 0.5, ey + 0.5, dx / len, dy / len, game.healed);
      else for (const off of [-5, 5]) {
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
      if (isSmooth()) paintStar(c, x, y - 0.5, this.elapsed);
      else {
      const star = [0, -8, 2.4, -2.6, 8, -2.6, 3.6, 1.2, 5, 7, 0, 3.6, -5, 7, -3.6, 1.2, -8, -2.6, -2.4, -2.6];
      c.beginPath();
      for (let i = 0; i < star.length; i += 2) c.lineTo(x + star[i], y + star[i + 1]);
      c.closePath();
      c.fillStyle = '#f5c33b'; c.fill();
      c.strokeStyle = '#10181f'; c.lineWidth = 1.5; c.stroke();
      rect(c, x - 2, y - 3, 2, 2, '#fff3b0');
      }
      if (game.homeCrewDown) this.hint(stage.homeX - cam, bob);
    }
  }

  /** A bouncing arrow on the pavement: step up here. */
  private hint(x: number, bob: number): void {
    const c = this.c, X = Math.round(x), Y = BAND_TOP - 12 - Math.abs(bob) * 2;
    if (isSmooth()) { paintHint(c, X + 0.5, Y); return; }
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
    if (game.level === 1 && !game.hasPackage) this.shadow(game.stage.package.x - cam, game.stage.package.y, 0, 8);
    const watchers = game.level === 2 ? game.gods.patrols : game.level === 3 ? game.heist.yard.patrols : [];
    const patrols = watchers.filter(o => o.x > cam - 60 && o.x < cam + WIDTH + 60);
    const heist = game.level === 3 ? game.heist : null;
    for (const o of patrols) this.shadow(o.x - cam, o.y, 0, 9);

    this.trail = this.trail.filter(t => (t.t += dt) < 0.18);
    if (p.dodgeTimer > 0 && game.mode === 'playing') this.trail.push({ x: p.x, y: p.y, z: p.z, facing: p.facing, t: 0 });

    const actors: Array<{ y: number; x: number; draw: () => void }> = [];
    const dd = game.delivery;
    if (dd && dd.carId === null && dd.timer <= 0) {
      this.shadow(dd.x - cam, dd.y, 0, 9);
      actors.push({ y: dd.y, x: dd.x, draw: () => {
        drawFighter(this.c, dd.x - cam, dd.y, 0, dd.state === 'leaving' || dd.x > p.x ? -1 : 1, LOOKS.dd, dd.state === 'ready' ? POSES.loiter(this.elapsed) : POSES.walk(dd.walk));
        const label = 'D.D', x = Math.round(dd.x - cam) - 9;
        if (isSmooth()) paintPanel(this.c, x - 3, dd.y - 60, 25, 11, '#1d3a38', '#6f8f72', 2.5);
        else rect(this.c, x - 3, dd.y - 60, 25, 11, '#152b2b');
        text(this.c, label, x, dd.y - 57, '#d1df9a');
      } });
    }
    for (const e of enemies) actors.push({ y: e.y, x: e.x, draw: () => this.drawEnemy(e, cam) });
    for (const o of officers) actors.push({ y: o.y, x: o.x, draw: () => this.drawOfficer(o, cam) });
    for (const o of patrols) actors.push({ y: o.y, x: o.x, draw: () => this.drawPatrol(game, o, cam) });
    const run = game.gods;
    if (game.level === 2 && run.cargo === 'stashed' && run.stashX !== null) actors.push({ y: BAND_TOP + 1, x: run.stashX, draw: () => this.drawPackage(run.stashX! - cam, BAND_TOP + 8) });
    // A car covers anyone standing behind its tyre line.
    for (const car of game.cars) if (car.x > cam - 90 && car.x < cam + WIDTH + 90) actors.push({ y: car.y + 0.5, x: car.x, draw: () => drawCar(this.c, car, car.x - cam, this.elapsed) });
    if (heist && heist.phase === 'yard') {
      for (const tr of heist.yard.trucks) {
        if (tr.x + 110 < cam || tr.x - 120 > cam + WIDTH) continue;
        actors.push({ y: tr.y, x: tr.x, draw: () => drawTruck(this.c, { x: tr.x - cam, y: tr.y, facing: 1, tone: tr.tone, cut: tr.cut, crates: tr.crates, wheel: 0, moving: false, lights: false, elapsed: this.elapsed }) });
      }
      const b = heist.yard.goran;
      actors.push({ y: b.y, x: b.x, draw: () => this.drawBuddy(b, cam) });
    }
    if (heist && heist.phase === 'pickup') {
      const x = heist.pickupX;
      actors.push({ y: 252, x, draw: () => { this.shadow(x - cam, 252, 0, 9); drawFighter(this.c, x - cam, 252, 0, -1, LOOKS.goran, POSES.walk(this.elapsed * 8)); } });
    }
    if (!(heist && heist.driving)) actors.push({ y: p.y + 0.1, x: p.x, draw: () => this.drawPlayer(game, p, cam) });
    if (game.level === 1 && !game.hasPackage) actors.push({ y: game.stage.package.y, x: game.stage.package.x, draw: () => this.drawPackage(game.stage.package.x - cam, game.stage.package.y) });
    actors.sort((a, b) => a.y - b.y || a.x - b.x);
    this.outlined(() => { for (const a of actors) a.draw(); });
    c.globalAlpha = 1;
  }

  /**
   * Retro: draws the actors onto their own layer, then stamps a dark silhouette of that layer one pixel left, right, up and
   * down before putting the layer back on the frame, so every figure, car and parcel reads with a 1-pixel outline as sprites
   * do. Elsewhere it simply draws them.
   */
  private outlined(draw: () => void): void {
    if (!isRetro()) { draw(); return; }
    const frame = this.frame;
    this.layers ??= { actors: layer(), ink: layer() };
    const { actors, ink } = this.layers;
    actors.setTransform(1, 0, 0, 1, 0, 0); actors.clearRect(0, 0, WIDTH, HEIGHT);
    actors.setTransform(frame.getTransform());
    this.c = actors;
    try { draw(); } finally { this.c = frame; }
    ink.globalCompositeOperation = 'copy';
    ink.drawImage(actors.canvas, 0, 0);
    ink.globalCompositeOperation = 'source-in';
    ink.fillStyle = OUTLINE; ink.fillRect(0, 0, WIDTH, HEIGHT);
    ink.globalCompositeOperation = 'source-over';
    frame.save(); frame.setTransform(1, 0, 0, 1, 0, 0);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) frame.drawImage(ink.canvas, dx, dy);
    frame.drawImage(actors.canvas, 0, 0);
    frame.restore();
  }

  private shadow(x: number, y: number, z: number, size: number): void {
    const k = 1 - Math.min(z, 70) / 140;
    if (!isSmooth()) { ellipse(this.c, x, y, size * k, 2.5 * k, 'rgba(22, 30, 38, 0.36)'); return; }
    // A soft blob: dark at the feet, fading out at the edge.
    const c = this.c;
    c.save();
    c.translate(x, y);
    c.scale(size * k * 1.15, 2.9 * k);
    c.fillStyle = rgrad(c, 0, 0, 1, [[0, 'rgba(20, 28, 36, 0.5)'], [0.55, 'rgba(20, 28, 36, 0.26)'], [1, 'rgba(20, 28, 36, 0)']]);
    c.fillRect(-1, -1, 2, 2);
    c.restore();
  }

  private drawPlayer(game: SideGame, p: SidePlayer, cam: number): void {
    const c = this.c;
    const pose = this.playerPose(game, p);
    const look = LOOKS[game.playerLook];
    const opts = { parcel: game.hasPackage, satchel: game.level !== 3, gun: game.ammo > 0 };
    for (const t of this.trail) {
      c.globalAlpha = 0.35 * (1 - t.t / 0.18);
      drawFighter(c, t.x - cam, t.y, t.z, t.facing, look, POSES.dodge(), { ...opts, tint: '#86d5c7' });
    }
    c.globalAlpha = 1;
    if ((game.level === 2 && game.gods.hidden) || (game.level === 3 && game.heist.yard.hidden)) c.globalAlpha = 0.5;
    const blink = p.invulnerable > 0 && p.dodgeTimer <= 0 && p.downTimer <= 0 && Math.floor(this.elapsed * 18) % 2 === 0;
    if (blink && game.mode === 'playing') return;
    drawFighter(c, p.x - cam, p.y, p.z, p.facing, look, pose, { ...opts, tint: p.flash > 0 ? FLASH : undefined });
    c.globalAlpha = 1;
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
    if (e.state === 'windup' && isSmooth()) paintAlert(c, x - 0.5, top - 1, '!', '#fff1b8');
    else if (e.state === 'windup') {
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
    if (o.state === 'grab' && isSmooth()) paintAlert(c, x - 0.5, o.y - o.z - LOOKS.police.height - 9, '!', '#9cc4ff');
    else if (o.state === 'grab') {
      const top = o.y - o.z - LOOKS.police.height - 8;
      c.font = 'bold 12px monospace';
      c.fillStyle = '#10181f'; c.fillText('!', x - 2, top + 1);
      c.fillStyle = '#9cc4ff'; c.fillText('!', x - 3, top);
    }
  }

  /** A patrol officer: the watched cone in front of them, a question mark as they grow suspicious, an exclamation when they chase. */
  private drawPatrol(game: SideGame, o: Patrol, cam: number): void {
    const c = this.c, x = Math.round(o.x - cam);
    let pose: Pose;
    switch (o.state) {
      case 'walk': case 'chase': pose = POSES.walk(o.walk); break;
      case 'grab': pose = POSES.grab(); break;
      case 'wait': case 'alert': pose = POSES.loiter(this.elapsed + o.id); break;
      default: pose = POSES.idle(this.elapsed + o.id);
    }
    const watching = o.state === 'walk' || o.state === 'wait' || o.state === 'alert';
    if (watching) {
      const reach = (game.level === 3 ? 200 : SIGHT_RANGE) * (game.sneaking ? 0.55 : 1);
      c.fillStyle = `rgba(255, 236, 140, ${(game.stage.night ? 0.2 : 0.09) + Math.min(1, o.suspicion) * 0.22})`;
      c.beginPath();
      c.moveTo(x + o.facing * 6, o.y - 38); c.lineTo(x + o.facing * reach, o.y - 52); c.lineTo(x + o.facing * reach, o.y + 4); c.closePath(); c.fill();
    }
    drawFighter(c, x, o.y, 0, o.facing, LOOKS.police, pose, { tint: o.flash > 0 ? FLASH : undefined });
    const top = o.y - LOOKS.police.height - 8;
    if (o.state === 'alert' || o.state === 'search' || o.state === 'grab' || o.state === 'chase') {
      c.font = 'bold 12px monospace';
      const mark = o.state === 'alert' || o.state === 'search' ? '?' : '!';
      if (isSmooth()) paintAlert(c, x - 0.5, top - 1, mark, mark === '?' ? '#fff1b8' : '#ff7a6e');
      else {
      c.fillStyle = '#10181f'; c.fillText(mark, x - 2, top + 1);
      c.fillStyle = mark === '?' ? '#fff1b8' : '#ef4e45'; c.fillText(mark, x - 3, top);
      }
    }
    if (o.suspicion > 0.02 && watching) {
      rect(c, x - 10, top - 10, 21, 3, '#273942');
      rect(c, x - 9, top - 9, Math.round(19 * Math.min(1, o.suspicion)), 1, o.suspicion > 0.7 ? '#e36e61' : '#f2be64');
    }
  }

  /** Goran, D.D's partner in the yard. */
  private drawBuddy(b: Buddy, cam: number): void {
    const c = this.c, x = Math.round(b.x - cam);
    let pose: Pose;
    switch (b.state) {
      case 'cut': pose = POSES.aim(); break;
      case 'grab': pose = POSES.loiter(this.elapsed * 2); break;
      case 'cuffed': pose = POSES.cuffed(); break;
      case 'hide': pose = b.moving ? POSES.walk(b.walk) : POSES.idle(this.elapsed); break;
      default: pose = b.moving ? POSES.walk(b.walk) : POSES.idle(this.elapsed);
    }
    this.shadow(x, b.y, 0, 9);
    if (b.state === 'hide' && !b.moving) c.globalAlpha = 0.55;
    drawFighter(c, x, b.y, 0, b.facing, LOOKS.goran, pose, { parcel: b.carry > 0 });
    c.globalAlpha = 1;
    if (b.whistle > 5 && isSmooth()) paintAlert(c, x - 0.5, b.y - 62, '!', '#ffd166');
    else if (b.whistle > 5) {
      c.font = 'bold 12px monospace';
      c.fillStyle = '#10181f'; c.fillText('!', x - 2, b.y - 52);
      c.fillStyle = '#ffd166'; c.fillText('!', x - 3, b.y - 53);
    }
  }

  /** The lobby, the lift and the corridors of Kurirgatan 28. */
  private renderInterior(game: SideGame): void {
    const c = this.c, run = game.gods, p = game.player;
    const sx = run.ride ? this.snap((rand(this.elapsed * 60, 1) - 0.5) * 2) : 0;
    this.place(sx);
    drawRoom(c, run, this.elapsed);
    const actors: Array<{ y: number; draw: () => void }> = [];
    if (run.scene !== 'cabin') {
      run.npcs.forEach((n, i) => {
        const look = n.id === 'dd' ? LOOKS.dd : ARCHETYPE.get(n.id)!.look;
        this.shadow(n.x, n.y, 0, 9);
        actors.push({ y: n.y, draw: () => {
          drawFighter(this.c, n.x, n.y, 0, n.facing, look, POSES.loiter(this.elapsed + i * 1.7));
          const prop = ARCHETYPE.get(n.id)?.prop;
          if (prop) drawProp(this.c, prop, n.x, n.y, n.facing, this.elapsed);
          if (n.id === 'dd') { if (isSmooth()) paintPanel(this.c, n.x - 12, n.y - 60, 25, 11, '#1d3a38', '#6f8f72', 2.5); else rect(this.c, n.x - 12, n.y - 60, 25, 11, '#152b2b'); text(this.c, 'D.D', n.x - 9, n.y - 57, '#d1df9a'); }
        } });
      });
    }
    this.shadow(p.x, p.y, p.z, 9);
    actors.push({ y: p.y + 0.1, draw: () => this.drawPlayer(game, p, 0) });
    actors.sort((a, b) => a.y - b.y);
    this.outlined(() => { for (const a of actors) a.draw(); });
    this.place();
    this.drawAtmosphere();
    if (game.transition > 0) rect(c, 0, 0, WIDTH, HEIGHT, `rgba(12, 30, 35, ${game.transition / 0.35})`);
    this.lighting = 'interior';
    if (this.showHud && (game.mode === 'playing' || game.mode === 'paused')) this.drawHud(game, 0, true);
    this.view = 0;
  }

  private drawPackage(x: number, y: number): void {
    const c = this.c, X = Math.round(x), Y = Math.round(y);
    if (isSmooth()) { paintParcel(c, X + 0.5, Y, 16, 12, 1); return; }
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

  private grade: HTMLCanvasElement | null = null;

  /**
   * Smooth mode: the afternoon grade, baked once. Warm haze and sunlight from the upper right, cooler air low on the left
   * where the shadows fall, and a soft vignette, all in one overlay so it costs a single blit a frame.
   */
  private bakeGrade(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH * this.S; canvas.height = HEIGHT * this.S;
    const c = canvas.getContext('2d')!;
    beginArt(c, this.S);
    const haze = c.createLinearGradient(0, 0, 0, HEIGHT);
    haze.addColorStop(0, 'rgba(255, 214, 160, 0.13)'); haze.addColorStop(0.5, 'rgba(255, 214, 160, 0.02)'); haze.addColorStop(1, 'rgba(24, 40, 70, 0.1)');
    c.fillStyle = haze; c.fillRect(0, 0, WIDTH, HEIGHT);
    const sun = c.createRadialGradient(430, 40, 0, 430, 40, 380);
    sun.addColorStop(0, 'rgba(255, 228, 176, 0.16)'); sun.addColorStop(0.5, 'rgba(255, 228, 176, 0.05)'); sun.addColorStop(1, 'rgba(255, 228, 176, 0)');
    c.fillStyle = sun; c.fillRect(0, 0, WIDTH, HEIGHT);
    const cool = c.createLinearGradient(0, HEIGHT, WIDTH * 0.6, HEIGHT * 0.35);
    cool.addColorStop(0, 'rgba(34, 52, 96, 0.12)'); cool.addColorStop(1, 'rgba(34, 52, 96, 0)');
    c.fillStyle = cool; c.fillRect(0, 0, WIDTH, HEIGHT);
    const vignette = c.createRadialGradient(WIDTH / 2, HEIGHT / 2, 120, WIDTH / 2, HEIGHT / 2, 330);
    vignette.addColorStop(0, 'rgba(7, 20, 32, 0)'); vignette.addColorStop(1, 'rgba(7, 20, 32, 0.34)');
    c.fillStyle = vignette; c.fillRect(0, 0, WIDTH, HEIGHT);
    return canvas;
  }

  private drawAtmosphere(): void {
    const c = this.c;
    // Retro frames keep their colour flat: a full-screen wash would only turn into dither everywhere.
    if (isRetro()) return;
    if (isSmooth()) { this.blit(this.grade ??= this.bakeGrade(), 0, 0); return; }
    const haze = c.createLinearGradient(0, 0, 0, HEIGHT);
    haze.addColorStop(0, 'rgba(255, 214, 160, 0.14)');
    haze.addColorStop(0.5, 'rgba(255, 214, 160, 0.02)');
    haze.addColorStop(1, 'rgba(24, 40, 70, 0.12)');
    c.fillStyle = haze; c.fillRect(0, 0, WIDTH, HEIGHT);
    if (!isSmooth()) {
      c.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let y = 0; y < HEIGHT; y += 3) c.fillRect(0, y, WIDTH, 1);
    }
    const vignette = c.createRadialGradient(WIDTH / 2, HEIGHT / 2, 110, WIDTH / 2, HEIGHT / 2, 330);
    vignette.addColorStop(0, 'rgba(7, 20, 32, 0)'); vignette.addColorStop(1, 'rgba(7, 20, 32, 0.38)');
    c.fillStyle = vignette; c.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawHud(game: SideGame, cam: number, interior = false): void {
    const c = this.c, stage = game.stage;
    if (game.goTimer > 0 && Math.floor(this.elapsed * 4) % 2 === 0) {
      const x = WIDTH - 74, y = 112;
      c.font = 'bold 26px Impact, "Arial Black", sans-serif';
      c.fillStyle = '#10181f'; c.fillText(t('cv.go'), x + 2, y + 2);
      c.fillStyle = '#f3cc75'; c.fillText(t('cv.go'), x, y);
      c.fillStyle = '#10181f';
      c.beginPath(); c.moveTo(x + 40, y - 20); c.lineTo(x + 58, y - 9); c.lineTo(x + 40, y + 2); c.closePath(); c.fill();
      c.fillStyle = '#ef7a58';
      c.beginPath(); c.moveTo(x + 39, y - 21); c.lineTo(x + 56, y - 10); c.lineTo(x + 39, y + 1); c.closePath(); c.fill();
    }
    if (game.messageTimer > 0 && game.mode === 'playing') {
      c.globalAlpha = Math.min(1, game.messageTimer * 2);
      c.font = 'bold 10px monospace';
      // Long lines (Swedish runs longer) wrap onto a second row.
      const maxText = WIDTH - 64, words = game.message.split(' '), lines: string[] = [];
      for (const word of words) {
        const last = lines[lines.length - 1];
        if (last !== undefined && c.measureText(`${last} ${word}`).width <= maxText) lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
      }
      const width = Math.min(WIDTH - 24, Math.max(...lines.map(l => c.measureText(l).width)) + 26), height = 10 + lines.length * 12 - 2;
      c.fillStyle = '#102c35e6'; c.fillRect((WIDTH - width) / 2, 40, width, height);
      c.strokeStyle = '#eec36e'; c.lineWidth = 1; c.strokeRect((WIDTH - width) / 2 + 0.5, 40.5, width - 1, height - 1);
      c.fillStyle = '#f7e8c4'; c.textAlign = 'center';
      lines.forEach((l, i) => c.fillText(l, WIDTH / 2, 53 + i * 12));
      c.textAlign = 'left';
      if (game.messageFromDD) drawPortrait(c, Math.round((WIDTH - width) / 2) - PORTRAIT_W - 3, 40 + Math.round(height / 2) - PORTRAIT_H / 2);
      c.globalAlpha = 1;
    }
    if (interior) return;
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
      text(c, t('cv.boss'), x0, 256, '#edc278');
      rect(c, x0, 263, w, 3, '#273942');
      rect(c, x0, 263, Math.round(w * boss.hp / boss.maxHp), 3, '#e36e61');
      rect(c, x0, 263, Math.round(w * boss.hp / boss.maxHp), 1, '#f5a08e');
      return;
    }
    if (game.level === 3 && !game.heist.driving) return;
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
    const label = t('cv.metresHome', { m: Math.round(game.metresToHome) });
    text(c, label, X1 + 10, Y - 2, '#e7dabc');
  }
}
