import Phaser from 'phaser';
import { drawFighter, LOOKS, POSES } from '../side/fighters';
import { ARCHETYPE } from '../side/gods-cast';
import { ceiling, drawProp, drawRoom } from '../side/interior';
import { ellipse, rect, text } from '../side/pixel';
import { t } from '../side/i18n';
import type { EnvironmentDefinition, Point } from './content/types';
import type { MotionState } from './movement';
import type { ActorState, Message } from './session';
import { drawIllustratedActor, drawIllustratedProp } from './illustrated-actors';
import { renderScale, type Presentation } from './presentation';

export function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, smooth = false): Phaser.Textures.CanvasTexture {
  const texture = scene.textures.createCanvas(key, w, h);
  if (!texture) throw new Error(`Cannot create texture: ${key}`);
  texture.context.imageSmoothingEnabled = smooth;
  texture.setFilter(smooth ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
  return texture;
}
export function bakeEnvironment(scene: Phaser.Scene, e: EnvironmentDefinition, presentation: Presentation): void {
  if (presentation === 'illustrated') {
    const glow = canvasTexture(scene, 'lamp-glow', 128, 128, true), g = glow.context;
    const light = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    light.addColorStop(0, 'rgba(255,235,188,.48)'); light.addColorStop(.4, 'rgba(255,226,167,.16)'); light.addColorStop(1, 'rgba(255,224,166,0)');
    g.fillStyle = light; g.fillRect(0, 0, 128, 128); glow.refresh();
    const portrait = canvasTexture(scene, 'dd-illustrated-portrait', 192, 192, true);
    portrait.context.fillStyle = '#b5bbab'; portrait.context.fillRect(0, 0, 192, 192);
    portrait.context.save(); portrait.context.scale(8, 8);
    drawIllustratedActor(portrait.context, 12, 56, 1, LOOKS.dd, POSES.loiter(0));
    portrait.context.restore(); portrait.refresh();
    return;
  }
  const room = canvasTexture(scene, e.id, e.size.width, e.size.height);
  drawRoom(room.context, { scene: 'floor', floor: e.artwork.floor, ride: null }, 0); room.refresh();
  const atmosphere = canvasTexture(scene, `${e.id}:atmosphere`, e.size.width, e.size.height), c = atmosphere.context;
  const haze = c.createLinearGradient(0, 0, 0, 270);
  haze.addColorStop(0, 'rgba(255,214,160,0.14)'); haze.addColorStop(0.5, 'rgba(255,214,160,0.02)'); haze.addColorStop(1, 'rgba(24,40,70,0.12)');
  c.fillStyle = haze; c.fillRect(0, 0, 480, 270);
  c.fillStyle = 'rgba(255,255,255,0.025)'; for (let y = 0; y < 270; y += 3) c.fillRect(0, y, 480, 1);
  const vignette = c.createRadialGradient(240, 135, 110, 240, 135, 330);
  vignette.addColorStop(0, 'rgba(7,20,32,0)'); vignette.addColorStop(1, 'rgba(7,20,32,0.38)');
  c.fillStyle = vignette; c.fillRect(0, 0, 480, 270); atmosphere.refresh();
}

/** A bounded pixel producer, not a renderer: Phaser owns images, depth and lifecycle. */
export class ActorArt {
  private texture: Phaser.Textures.CanvasTexture;
  private shadowTexture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private scale: number;
  constructor(private scene: Phaser.Scene, id: string, private presentation: Presentation) {
    this.scale = renderScale(presentation);
    const smooth = presentation === 'illustrated';
    this.texture = canvasTexture(scene, `actor:${id}`, 128 * this.scale, 96 * this.scale, smooth);
    this.shadowTexture = canvasTexture(scene, `shadow:${id}`, 32 * this.scale, 8 * this.scale, smooth);
    this.image = scene.add.image(0, 0, this.texture.key).setOrigin(0).setScale(1 / this.scale);
    this.shadow = scene.add.image(0, 0, this.shadowTexture.key).setOrigin(0).setDepth(1).setScale(1 / this.scale);
  }
  private begin(p: Point, z: number, depth: number): { c: CanvasRenderingContext2D; x: number; y: number } {
    if (this.presentation === 'illustrated') {
      const c = this.texture.context, s = this.shadowTexture.context;
      c.setTransform(this.scale, 0, 0, this.scale, 0, 0); c.clearRect(0, 0, 128, 96);
      s.setTransform(this.scale, 0, 0, this.scale, 0, 0); s.clearRect(0, 0, 32, 8);
      const k = 1 - Math.min(z, 70) / 140;
      s.save(); s.translate(16, 4); s.scale(10 * k, 2.8 * k);
      const shadow = s.createRadialGradient(0, 0, .1, 0, 0, 1); shadow.addColorStop(0, 'rgba(29,32,28,.34)'); shadow.addColorStop(1, 'rgba(29,32,28,0)');
      s.fillStyle = shadow; s.fillRect(-1, -1, 2, 2); s.restore(); this.shadowTexture.refresh();
      this.shadow.setPosition(p.x - 16, p.y - 4);
      this.image.setPosition(p.x - 64, p.y - z - 80).setDepth(10 + depth).setVisible(true);
      return { c, x: 64, y: 80 };
    }
    const x = 64 + p.x - Math.floor(p.x), y = 80 + p.y - z - Math.floor(p.y - z);
    this.texture.context.clearRect(0, 0, 128, 96);
    this.image.setPosition(Math.floor(p.x) - 64, Math.floor(p.y - z) - 80).setDepth(10 + depth).setVisible(true);
    const s = this.shadowTexture.context, k = 1 - Math.min(z, 70) / 140;
    s.clearRect(0, 0, 32, 8);
    ellipse(s, 16 + p.x - Math.floor(p.x), 4 + p.y - Math.floor(p.y), 9 * k, 2.5 * k, 'rgba(22,30,38,0.36)');
    this.shadowTexture.refresh(); this.shadow.setPosition(Math.floor(p.x) - 16, Math.floor(p.y) - 4);
    return { c: this.texture.context, x, y };
  }
  player(p: Point & MotionState, cargo: boolean, time: number, playing: boolean): void {
    const { c, x, y } = this.begin(p, p.z, p.y + 0.1);
    const pose = p.dodgeTimer > 0 ? POSES.dodge() : p.z > 0 ? POSES.jump() : p.moving ? POSES.walk(p.walk) : POSES.idle(time);
    const blink = p.invulnerable > 0 && p.dodgeTimer <= 0 && Math.floor(time * 18) % 2 === 0;
    if (this.presentation === 'illustrated') drawIllustratedActor(c, x, y, p.facing, LOOKS.player, pose, cargo, true);
    else drawFighter(c, x, y, 0, p.facing, LOOKS.player, pose, { satchel: true, parcel: cargo });
    this.texture.refresh(); this.image.setVisible(!(blink && playing));
  }
  npc(n: ActorState, time: number, index: number): void {
    const { c, x, y } = this.begin(n, 0, n.y), archetype = ARCHETYPE.get(n.appearance);
    if (this.presentation === 'illustrated') {
      drawIllustratedActor(c, x, y, n.facing, n.appearance === 'dd' ? LOOKS.dd : archetype!.look, POSES.loiter(time + index * 1.7));
      if (archetype?.prop) drawIllustratedProp(c, archetype.prop, x, y, n.facing, time);
      this.texture.refresh(); return;
    }
    drawFighter(c, x, y, 0, n.facing, n.appearance === 'dd' ? LOOKS.dd : archetype!.look, POSES.loiter(time + index * 1.7));
    if (archetype?.prop) drawProp(c, archetype.prop, x, y, n.facing, time);
    if (n.appearance === 'dd') { rect(c, x - 12, y - 60, 25, 11, '#152b2b'); text(c, 'D.D', x - 9, y - 57, '#d1df9a'); }
    this.texture.refresh();
  }
  destroy(): void {
    this.image.destroy(); this.shadow.destroy();
    this.scene.textures.remove(this.texture.key); this.scene.textures.remove(this.shadowTexture.key);
  }
}
export function paintCeiling(texture: Phaser.Textures.CanvasTexture, time: number): void { ceiling(texture.context, time); texture.refresh(); }
export function paintMessage(texture: Phaser.Textures.CanvasTexture, message: Message | null, portrait: CanvasImageSource): void {
  const c = texture.context;
  c.clearRect(0, 0, 480, 100);
  if (message && message.remaining > 0) {
    c.globalAlpha = Math.min(1, message.remaining * 2);
    c.font = 'bold 10px monospace';
    const lines: string[] = [];
    for (const word of t(message.key).split(' ')) {
      const last = lines[lines.length - 1];
      if (last !== undefined && c.measureText(`${last} ${word}`).width <= 416) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    const width = Math.min(456, Math.max(...lines.map(l => c.measureText(l).width)) + 26), height = 8 + lines.length * 12;
    c.fillStyle = '#102c35e6'; c.fillRect((480 - width) / 2, 40, width, height);
    c.strokeStyle = '#eec36e'; c.lineWidth = 1; c.strokeRect((480 - width) / 2 + 0.5, 40.5, width - 1, height - 1);
    c.fillStyle = '#f7e8c4'; c.textAlign = 'center'; lines.forEach((l, i) => c.fillText(l, 240, 53 + i * 12)); c.textAlign = 'left';
    if (message.portrait) {
      const x = Math.round((480 - width) / 2) - 37, y = 40 + Math.round(height / 2) - 19;
      rect(c, x, y, 34, 38, '#141820'); rect(c, x + 1, y + 1, 32, 36, '#c9ab74'); c.drawImage(portrait, x + 2, y + 2, 30, 34);
    }
    c.globalAlpha = 1;
  }
  texture.refresh();
}
