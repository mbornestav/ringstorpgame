import { distance, iso, normalize, type Vec2 } from './geometry';
import type { Enemy, Game, Player } from './game';
import { BOUNDS, DROPOFF, PROPS, groundKind, type Prop } from './world';

export const WIDTH = 480;
export const HEIGHT = 270;

type Point = { x: number; y: number };
const PALETTE = {
  outline: '#172b34', road: '#687580', roadAlt: '#717e88', walk: '#b8afa0',
  walkAlt: '#c7bbab', grass: '#6e9a69', grassAlt: '#769f6b', paver: '#a59d91',
  cream: '#e0cb9f', brick: '#a96b58', shadow: '#314950', gold: '#f6c75b',
};

function hash(x: number, y: number): number {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private camera: Point = { x: 0, y: 0 };
  private initialized = false;
  private elapsed = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.ctx = context;
    context.imageSmoothingEnabled = false;
  }

  resetCamera(): void { this.initialized = false; }

  private pt(x: number, y: number, z = 0): Point {
    const p = iso(x, y);
    return { x: Math.round(p.x - this.camera.x), y: Math.round(p.y - this.camera.y - z) };
  }

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

  render(game: Game, dt: number): void {
    this.elapsed += dt;
    const c = this.ctx;
    const focus = iso(game.player.pos.x, game.player.pos.y);
    const target = { x: focus.x - WIDTH * 0.45, y: focus.y - HEIGHT * 0.56 };
    if (!this.initialized || game.mode === 'title') {
      this.camera = target;
      this.initialized = true;
    } else {
      const t = Math.min(1, dt * 6);
      this.camera.x += (target.x - this.camera.x) * t;
      this.camera.y += (target.y - this.camera.y) * t;
    }
    c.fillStyle = '#486b69';
    c.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawGround();
    this.drawRoadDetails();
    this.drawRoute(game);

    const drawables: Array<{ depth: number; draw: () => void }> = [];
    for (const prop of PROPS) {
      if (!this.visible(prop.x, prop.y, prop.w, prop.h, prop.height || 0)) continue;
      drawables.push({ depth: prop.x + prop.y + prop.w + prop.h, draw: () => this.drawProp(prop) });
    }
    for (let i = 0; i < game.parcels.length; i++) {
      const parcel = game.parcels[i];
      if (parcel.recovered) continue;
      drawables.push({ depth: parcel.x + parcel.y, draw: () => this.drawParcel(parcel.x, parcel.y, i, game) });
    }
    for (const pickup of game.pickups) {
      if (!pickup.taken) drawables.push({ depth: pickup.x + pickup.y, draw: () => this.drawPickup(pickup.x, pickup.y) });
    }
    drawables.push({ depth: game.player.pos.x + game.player.pos.y, draw: () => this.drawPlayer(game.player) });
    for (const enemy of game.enemies) drawables.push({ depth: enemy.pos.x + enemy.pos.y, draw: () => this.drawEnemy(enemy) });
    drawables.sort((a, b) => a.depth - b.depth);
    for (const item of drawables) item.draw();

    this.drawAtmosphere();
    this.drawTargetArrow(game);
    if (game.messageTimer > 0 && game.mode === 'playing') this.drawMessage(game.message, game.messageTimer);
  }

  private visible(x: number, y: number, w = 0, h = 0, z = 0): boolean {
    const p = this.pt(x + w / 2, y + h / 2);
    return p.x > -180 && p.x < WIDTH + 180 && p.y > -z - 100 && p.y < HEIGHT + z + 100;
  }

  private drawGround(): void {
    for (let x = -20; x < BOUNDS.w + 20; x++) {
      for (let y = -10; y < BOUNDS.h + 12; y++) {
        if (!this.visible(x, y, 1, 1)) continue;
        const kind = groundKind(x, y);
        const n = hash(x, y);
        let fill = PALETTE.grass;
        if (kind === 'road') fill = n % 7 === 0 ? PALETTE.roadAlt : PALETTE.road;
        if (kind === 'walk') fill = n % 5 === 0 ? PALETTE.walkAlt : PALETTE.walk;
        if (kind === 'paver') fill = n % 4 === 0 ? '#afa69a' : PALETTE.paver;
        if (kind === 'grass') fill = n % 4 === 0 ? PALETTE.grassAlt : PALETTE.grass;
        const points = [this.pt(x, y), this.pt(x + 1, y), this.pt(x + 1, y + 1), this.pt(x, y + 1)];
        this.poly(points, fill);
        if (kind === 'walk' && (x + y) % 3 === 0) {
          this.ctx.strokeStyle = '#9e9e91';
          this.ctx.lineWidth = 0.5;
          const a = this.pt(x + 0.5, y), b = this.pt(x + 0.5, y + 1);
          this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
        }
        if (kind === 'grass' && n % 11 === 0) {
          const p = this.pt(x + 0.5, y + 0.5);
          this.ctx.fillStyle = n % 3 ? '#42785a' : '#e8cd77';
          this.ctx.fillRect(p.x, p.y - 2, 2, 2);
        }
      }
    }
  }

  private drawRoadDetails(): void {
    for (let x = 0; x < BOUNDS.w; x++) {
      if (!this.visible(x, 12, 1, 1)) continue;
      if (x % 5 < 3) this.poly([this.pt(x, 12), this.pt(x + 0.75, 12), this.pt(x + 0.75, 12.08), this.pt(x, 12.08)], '#d3c9af');
      if (x % 17 === 0) {
        for (let i = 0; i < 4; i++) this.poly([this.pt(x + i * 0.42, 9.25), this.pt(x + i * 0.42 + 0.25, 9.25), this.pt(x + i * 0.42 + 0.25, 10.3), this.pt(x + i * 0.42, 10.3)], '#c7c5b9');
      }
      if (x % 9 === 3) {
        const p = this.pt(x + 0.5, 7.7);
        this.ctx.fillStyle = '#799b72'; this.ctx.fillRect(p.x, p.y, 2, 1);
      }
    }
    for (const y of [9, 16]) {
      const a = this.pt(0, y), b = this.pt(BOUNDS.w, y);
      this.ctx.strokeStyle = '#e0d3b3'; this.ctx.lineWidth = 1;
      this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
    }
  }

  private drawRoute(game: Game): void {
    const target = game.target;
    const p = this.pt(target.x, target.y);
    if (p.x < -15 || p.x > WIDTH + 15 || p.y < -15 || p.y > HEIGHT + 15) return;
    const pulse = Math.sin(this.elapsed * 5) * 2;
    this.ctx.globalAlpha = 0.25;
    this.poly([this.pt(target.x - 0.8, target.y), this.pt(target.x, target.y - 0.8), this.pt(target.x + 0.8, target.y), this.pt(target.x, target.y + 0.8)], '#f8e6a4');
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = '#f8d36a'; this.ctx.lineWidth = 2;
    this.ctx.beginPath(); this.ctx.ellipse(p.x, p.y + 1, 10 + pulse, 5 + pulse * 0.4, 0, 0, Math.PI * 2); this.ctx.stroke();
  }

  private drawBox(prop: Prop, walls: [string, string], roof: string): void {
    const { x, y, w, h } = prop;
    const z = prop.height || 20;
    const a = this.pt(x, y), b = this.pt(x + w, y), d = this.pt(x, y + h), e = this.pt(x + w, y + h);
    const at = this.pt(x, y, z), bt = this.pt(x + w, y, z), dt = this.pt(x, y + h, z), et = this.pt(x + w, y + h, z);
    this.poly([b, e, et, bt], walls[0], PALETTE.outline);
    this.poly([d, e, et, dt], walls[1], PALETTE.outline);
    this.poly([at, bt, et, dt], roof, PALETTE.outline);
    // Repeated windows and doors sit on the two visible facades.
    const countX = Math.max(1, Math.floor(w / 1.5));
    const countY = Math.max(1, Math.floor(h / 1.5));
    const floors = z > 33 ? 3 : 2;
    for (let floor = 0; floor < floors; floor++) {
      const rise = (floor + 0.6) * (z / (floors + 0.6));
      for (let i = 0; i < countX; i++) {
        const p = this.pt(x + (i + 0.6) * w / countX, y + h, rise);
        this.window(p.x, p.y, floor === 0 && i === 0 ? '#38444b' : '#94b7b4');
      }
      for (let i = 0; i < countY; i++) {
        const p = this.pt(x + w, y + (i + 0.55) * h / countY, rise);
        this.window(p.x, p.y, '#789c9e');
      }
    }
    if (prop.kind !== 'tower') {
      const r = this.pt(x + w * 0.32, y + h * 0.31, z);
      this.ctx.fillStyle = '#564e49'; this.ctx.fillRect(r.x, r.y - 8, 5, 8);
      this.ctx.fillStyle = '#8e6556'; this.ctx.fillRect(r.x - 1, r.y - 9, 7, 2);
      this.ctx.fillStyle = '#ffffff22';
      for (let i = 0; i < Math.floor(w); i++) {
        const t = this.pt(x + i + 0.3, y + h * 0.72, z);
        this.ctx.fillRect(t.x, t.y, 5, 1);
      }
    }
  }

  private window(x: number, y: number, pane: string): void {
    const c = this.ctx;
    c.fillStyle = '#344651'; c.fillRect(x - 4, y - 5, 8, 7);
    c.fillStyle = pane; c.fillRect(x - 3, y - 4, 6, 5);
    c.fillStyle = '#dbe5ce'; c.fillRect(x - 1, y - 4, 1, 5);
    c.fillStyle = '#e8d8b6'; c.fillRect(x - 4, y + 2, 9, 2);
  }

  private drawProp(prop: Prop): void {
    const { kind, x, y, w, h } = prop;
    if (kind === 'house') {
      const roofs = ['#b98d61', '#c59b5e', '#a87958'];
      this.drawBox(prop, ['#c9b995', '#e4d4ad'], roofs[prop.variant || 0]);
    } else if (kind === 'block') {
      this.drawBox(prop, prop.variant ? ['#8e6157', '#b98470'] : ['#866259', '#a86e5c'], '#777d79');
    } else if (kind === 'villa') {
      this.drawBox(prop, ['#aa7468', '#d2a393'], ['#a36450', '#955f4f', '#b46c56'][prop.variant || 0]);
    } else if (kind === 'tower') {
      this.drawBox(prop, ['#aa8c74', '#d2b393'], '#688780');
      const p = this.pt(x + w * 0.5, y + h * 0.5, (prop.height || 60) + 12);
      this.ctx.fillStyle = '#5e7777'; this.ctx.fillRect(p.x - 4, p.y, 8, 13);
      this.ctx.fillStyle = '#e0be83'; this.ctx.fillRect(p.x - 6, p.y - 2, 12, 3);
      this.ctx.fillStyle = '#314a52'; this.ctx.fillRect(p.x - 2, p.y + 4, 4, 5);
    } else if (kind === 'tree') this.drawTree(prop);
    else if (kind === 'car') this.drawCar(prop);
    else if (kind === 'hedge') {
      const a = this.pt(x, y, 4), b = this.pt(x + w, y, 4), d = this.pt(x, y + h, 4), e = this.pt(x + w, y + h, 4);
      this.poly([a, b, e, d], '#416c50');
      for (let i = 0; i < w; i++) { const p = this.pt(x + i + 0.3, y + 0.2, 6); this.ctx.fillStyle = i % 2 ? '#5c9160' : '#8caf6c'; this.ctx.fillRect(p.x, p.y, 4, 3); }
    } else if (kind === 'lamp') {
      const p = this.pt(x, y);
      this.ctx.fillStyle = '#263d44'; this.ctx.fillRect(p.x - 1, p.y - 24, 3, 25);
      this.ctx.fillStyle = '#f6df9d'; this.ctx.fillRect(p.x - 4, p.y - 26, 9, 3);
      this.ctx.fillStyle = '#fff2b14a'; this.ctx.fillRect(p.x - 6, p.y - 23, 13, 3);
    } else if (kind === 'bench') {
      const p = this.pt(x, y);
      this.ctx.fillStyle = '#513e39'; this.ctx.fillRect(p.x - 8, p.y - 4, 16, 3);
      this.ctx.fillStyle = '#a9764c'; this.ctx.fillRect(p.x - 9, p.y - 7, 18, 3);
      this.ctx.fillRect(p.x - 7, p.y, 3, 3); this.ctx.fillRect(p.x + 5, p.y, 3, 3);
    } else if (kind === 'sign') {
      const p = this.pt(x, y);
      this.ctx.fillStyle = '#263d44'; this.ctx.fillRect(p.x - 1, p.y - 18, 2, 18);
      this.ctx.fillStyle = '#247b7e'; this.ctx.fillRect(p.x - 4, p.y - 22, 8, 7);
      this.ctx.fillStyle = '#f7e8bc'; this.ctx.fillRect(p.x - 2, p.y - 20, 5, 2);
    }
  }

  private drawTree(prop: Prop): void {
    const p = this.pt(prop.x + 0.4, prop.y + 0.4);
    const c = this.ctx;
    c.fillStyle = '#344e45'; c.fillRect(p.x - 2, p.y - 15, 5, 16);
    const tones = [['#315d4d', '#51805a', '#7ca469'], ['#3e6850', '#6e925b', '#a9b86f'], ['#2c5d58', '#4f8870', '#7fa77a']][prop.variant || 0];
    c.fillStyle = tones[0]; c.fillRect(p.x - 12, p.y - 30, 24, 20);
    c.fillRect(p.x - 9, p.y - 35, 18, 8);
    c.fillStyle = tones[1]; c.fillRect(p.x - 10, p.y - 32, 18, 12);
    c.fillRect(p.x - 5, p.y - 37, 11, 7);
    c.fillStyle = tones[2]; c.fillRect(p.x - 7, p.y - 32, 8, 5);
    c.fillRect(p.x + 2, p.y - 26, 7, 4);
  }

  private drawCar(prop: Prop): void {
    const p = this.pt(prop.x + prop.w / 2, prop.y + prop.h / 2);
    const c = this.ctx;
    const colors = ['#b95243', '#e0c7a2', '#4c7b83'];
    c.fillStyle = '#283940'; c.fillRect(p.x - 17, p.y - 3, 34, 10);
    c.fillStyle = colors[prop.variant || 0]; c.fillRect(p.x - 16, p.y - 9, 32, 12);
    c.fillRect(p.x - 8, p.y - 15, 16, 6);
    c.fillStyle = '#6b939c'; c.fillRect(p.x - 6, p.y - 14, 12, 5);
    c.fillStyle = '#eed49c'; c.fillRect(p.x + 14, p.y - 4, 3, 3);
    c.fillStyle = '#d47762'; c.fillRect(p.x - 17, p.y - 4, 3, 3);
    c.fillStyle = '#1e303a'; c.fillRect(p.x - 11, p.y + 4, 5, 3); c.fillRect(p.x + 7, p.y + 4, 5, 3);
  }

  private drawShadow(x: number, y: number, size = 7): void {
    const p = this.pt(x, y);
    this.ctx.fillStyle = '#1d353766';
    this.ctx.beginPath(); this.ctx.ellipse(p.x, p.y + 1, size, size * 0.42, 0, 0, Math.PI * 2); this.ctx.fill();
  }

  private drawPerson(pos: Vec2, facing: Vec2, color: string, kind: 'player' | 'runner' | 'bruiser' | 'boss', walk: number, flash: number): void {
    const c = this.ctx;
    const p = this.pt(pos.x, pos.y);
    this.drawShadow(pos.x, pos.y, kind === 'boss' ? 9 : 7);
    const step = Math.sin(walk) * 2;
    const broad = kind === 'boss' ? 5 : kind === 'bruiser' ? 4 : 3;
    c.fillStyle = '#20343b';
    c.fillRect(p.x - 4, p.y - 5 + step, 3, 6);
    c.fillRect(p.x + 1, p.y - 5 - step, 3, 6);
    c.fillStyle = flash > 0 ? '#fff3ca' : color;
    c.fillRect(p.x - broad - 1, p.y - 16, (broad + 1) * 2, 11);
    c.fillStyle = kind === 'player' ? '#edbd59' : '#2c303c';
    c.fillRect(p.x - broad - 3, p.y - 14, 3, 8);
    c.fillRect(p.x + broad, p.y - 14, 3, 8);
    c.fillStyle = '#d5a783'; c.fillRect(p.x - 3, p.y - 21, 6, 6);
    c.fillStyle = kind === 'player' ? '#263d45' : '#312e32';
    c.fillRect(p.x - 4, p.y - 22, 8, 3);
    if (kind === 'player') {
      c.fillStyle = '#f2be64'; c.fillRect(p.x + (facing.x > 0 ? -5 : 4), p.y - 13, 5, 6);
      c.fillStyle = '#f8e6a6'; c.fillRect(p.x - 2, p.y - 17, 4, 1);
    }
  }

  private drawPlayer(player: Player): void {
    if (player.invulnerable > 0 && Math.floor(this.elapsed * 18) % 2 === 0 && player.dodgeTimer <= 0) return;
    if (player.dodgeTimer > 0) {
      const p = this.pt(player.pos.x - player.facing.x * 0.7, player.pos.y - player.facing.y * 0.7);
      this.ctx.fillStyle = '#86d5c766'; this.ctx.fillRect(p.x - 5, p.y - 17, 10, 13);
    }
    this.drawPerson(player.pos, player.facing, '#298f9d', 'player', player.walk, player.flash);
    if (player.attackTimer > 0) {
      const p = this.pt(player.pos.x + player.facing.x * 0.9, player.pos.y + player.facing.y * 0.9, 9);
      const size = player.combo === 3 ? 15 : 11;
      const screenDirection = normalize({ x: player.facing.x - player.facing.y, y: (player.facing.x + player.facing.y) * 0.5 });
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
      this.ctx.fillStyle = e.kind === 'boss' ? '#794748' : '#694a50';
      this.ctx.fillRect(p.x - 8, p.y - 5, 16, 5);
      this.ctx.fillStyle = '#c29b83'; this.ctx.fillRect(p.x + 5, p.y - 5, 4, 4);
      return;
    }
    if (e.state === 'windup') {
      const p = this.pt(e.pos.x, e.pos.y);
      this.ctx.strokeStyle = '#e96c5d'; this.ctx.lineWidth = 2;
      this.ctx.beginPath(); this.ctx.ellipse(p.x, p.y, 11, 5, 0, 0, Math.PI * 2); this.ctx.stroke();
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

  private drawParcel(x: number, y: number, index: number, game: Game): void {
    const p = this.pt(x, y);
    this.drawShadow(x, y, 8);
    const bob = Math.round(Math.sin(this.elapsed * 4 + index) * 2);
    this.ctx.fillStyle = '#5a4438'; this.ctx.fillRect(p.x - 7, p.y - 9 + bob, 14, 10);
    this.ctx.fillStyle = '#dfad59'; this.ctx.fillRect(p.x - 6, p.y - 11 + bob, 12, 9);
    this.ctx.fillStyle = '#fff0b0'; this.ctx.fillRect(p.x - 1, p.y - 11 + bob, 3, 9);
    this.ctx.fillStyle = '#ac6646'; this.ctx.fillRect(p.x - 6, p.y - 4 + bob, 12, 2);
    if (index === game.recoveredCount) {
      this.ctx.fillStyle = '#fff0be'; this.ctx.font = 'bold 9px monospace';
      this.ctx.textAlign = 'center'; this.ctx.fillText(game.enemies.some(e => e.group === index && e.state !== 'ko') ? 'GUARDED' : 'PICK UP', p.x, p.y - 18); this.ctx.textAlign = 'left';
    }
  }

  private drawPickup(x: number, y: number): void {
    const p = this.pt(x, y);
    this.drawShadow(x, y, 6);
    this.ctx.fillStyle = '#e9f1db'; this.ctx.fillRect(p.x - 5, p.y - 8, 10, 8);
    this.ctx.fillStyle = '#c75456'; this.ctx.fillRect(p.x - 1, p.y - 7, 3, 6); this.ctx.fillRect(p.x - 3, p.y - 5, 7, 2);
  }

  private drawAtmosphere(): void {
    const c = this.ctx;
    const gradient = c.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, '#f5c58d10'); gradient.addColorStop(1, '#17334436');
    c.fillStyle = gradient; c.fillRect(0, 0, WIDTH, HEIGHT);
    c.fillStyle = '#ffffff0c';
    for (let y = 0; y < HEIGHT; y += 3) c.fillRect(0, y, WIDTH, 1);
    const vignette = c.createRadialGradient(WIDTH / 2, HEIGHT / 2, 70, WIDTH / 2, HEIGHT / 2, 320);
    vignette.addColorStop(0, '#071c2400'); vignette.addColorStop(1, '#071c2470');
    c.fillStyle = vignette; c.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawTargetArrow(game: Game): void {
    if (game.mode !== 'playing') return;
    const target = game.target;
    const d = distance(game.player.pos, target);
    if (d < 2) return;
    const direction = normalize({ x: target.x - game.player.pos.x, y: target.y - game.player.pos.y });
    const screenDir = normalize({ x: direction.x - direction.y, y: (direction.x + direction.y) * 0.5 });
    const c = this.ctx;
    const x = WIDTH - 27, y = 72;
    c.fillStyle = '#102a35ce'; c.fillRect(x - 17, y - 16, 34, 34);
    c.strokeStyle = '#d6b66d'; c.strokeRect(x - 17.5, y - 16.5, 35, 35);
    c.save(); c.translate(x, y); c.rotate(Math.atan2(screenDir.y, screenDir.x));
    this.poly([{ x: 11, y: 0 }, { x: -6, y: -7 }, { x: -3, y: 0 }, { x: -6, y: 7 }], '#f3cc75');
    c.restore();
    c.font = 'bold 8px monospace'; c.textAlign = 'center'; c.fillStyle = '#e7dabc';
    c.fillText(`${Math.round(d)} m`, x, y + 29); c.textAlign = 'left';
  }

  private drawMessage(message: string, timer: number): void {
    const c = this.ctx;
    c.globalAlpha = Math.min(1, timer * 2);
    c.font = 'bold 10px monospace';
    const width = Math.min(WIDTH - 24, c.measureText(message).width + 26);
    c.fillStyle = '#102c35e6'; c.fillRect((WIDTH - width) / 2, HEIGHT - 36, width, 24);
    c.strokeStyle = '#eec36e'; c.strokeRect((WIDTH - width) / 2 + 0.5, HEIGHT - 35.5, width - 1, 23);
    c.fillStyle = '#f7e8c4'; c.textAlign = 'center'; c.fillText(message, WIDTH / 2, HEIGHT - 20); c.textAlign = 'left';
    c.globalAlpha = 1;
  }
}
