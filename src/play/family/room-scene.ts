import Phaser from 'phaser';
import { getLang } from '../../side/i18n';
import { paletteFor, type Lighting } from '../../side/palettes';
import { isRetro } from '../../side/pixel';
import { Sfx } from '../audio/sfx';
import { musicOf } from '../audio/music';
import type { TrackId } from '../audio/songs';
import { addRetroImage } from '../world/retro-shader';
import { FONT } from '../fonts';
import { fontPx } from '../theme';
import { Bubbles, type Bubble, type Tone } from './seek-ui';
import type { C, Pt } from './art';
import type { RoomId } from './games/hemma';
import { FamilySurface } from './surface';
import { familyText as t } from './text';

// The rooms of the house (Hemma) share this: one screen of illustrated world (960 × 540, 480 × 270 in the retro build,
// through that room's palette), a top bar with the way back to the map, M for sound and Escape for the map, and the world's
// pointer turned into world pixels for whatever the room does with it. Rules live in a `*-run.ts` beside each room, without
// Phaser, as in Filmkväll and Kurragömma.

const DIV = isRetro() ? 3 : 1;
/** World pixels to interface pixels: the 960-wide world fills the 1440-wide interface. */
export const K = 1.5;

export abstract class RoomScene extends FamilySurface {
  frozen = false;
  protected sfx!: Sfx;
  protected clock = 0;
  /** Keys held down right now (lower case). */
  protected held = new Set<string>();
  /** Speech bubbles over the world (Carl-Otto's lines, labels over things). */
  protected bubbles!: Bubbles;
  private texture!: Phaser.Textures.CanvasTexture;
  private pointerId: number | null = null;

  constructor(key: string, protected readonly room: RoomId, private readonly lighting: Lighting, private readonly track: TrackId) { super(key); }

  /** A fresh round, called as the scene starts. */
  protected abstract reset(): void;
  /** Advances the rules. */
  protected abstract tick(dt: number): void;
  /** One frame of the world, in world units. `scale` is canvas pixels per world unit. */
  protected abstract paintWorld(c: C, scale: number): void;
  /** A key the room uses (lower case). Returns true when it was used. */
  protected keyDown(_key: string, _repeat: boolean): boolean { return false; }
  /** The world was pressed (not on a control), dragged or let go: world pixels. */
  protected pointer(_kind: 'down' | 'move' | 'up', _at: Pt): void {}
  /** The window lost focus. */
  protected blurred(): void {}
  /** Bubbles shown this frame only (a label over the thing to tap): world pixels. */
  protected marks(): Bubble[] { return []; }

  /** Carl-Otto (or someone) says something over (x, y), world pixels. */
  protected say(text: string, x: number, y: number, tone: Tone = 'friend', seconds = 2.6): void { this.bubbles.say(text, x, y, tone, this.clock + seconds); }

  create(): void {
    this.frozen = false; this.clock = 0; this.held.clear(); this.pointerId = null;
    this.reset();
    this.sfx = new Sfx(this.game.sound);
    const key = `${this.scene.key.toLowerCase()}-world`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.texture = this.textures.createCanvas(key, 1440 / DIV, 810 / DIV)!;
    if (isRetro()) addRetroImage(this, key, 0, 0, 1440, 810, () => paletteFor(this.lighting));
    else this.add.image(0, 0, key).setOrigin(0);
    this.bubbles = new Bubbles(this, {
      fontFamily: isRetro() ? FONT.pixel : FONT.body, fontSize: fontPx(24), fontStyle: isRetro() ? '400' : '500', color: '#25473f', resolution: isRetro() ? 1 : 2, align: 'center',
    });
    this.setup();
    musicOf(this.game).play(this.track);

    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if ((k === 'enter' || k === ' ') && document.activeElement instanceof HTMLButtonElement) return;
      if (this.keyDown(k, e.repeat)) { e.stopPropagation(); e.preventDefault(); if (!e.repeat) this.held.add(k); return; }
      if (e.repeat) return;
      if (k === 'm') { e.stopPropagation(); this.toggleSound(); }
      else if (k === 'escape') { e.stopPropagation(); this.toMap(); }
    };
    const up = (e: KeyboardEvent) => this.held.delete(e.key.toLowerCase());
    const world = (p: Phaser.Input.Pointer): Pt => [p.x / this.cameras.main.zoom / K, p.y / this.cameras.main.zoom / K];
    const press = (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || this.pointerId !== null) return;
      this.pointerId = p.id; this.pointer('down', world(p));
    };
    const move = (p: Phaser.Input.Pointer) => { if (p.id === this.pointerId) this.pointer('move', world(p)); };
    const release = (p: Phaser.Input.Pointer) => { if (p.id === this.pointerId) { this.pointerId = null; this.pointer('up', world(p)); } };
    const blur = () => { this.held.clear(); if (this.pointerId !== null) { this.pointerId = null; this.pointer('up', [0, 0]); } this.blurred(); };
    this.input.keyboard?.on('keydown', down); this.input.keyboard?.on('keyup', up);
    this.input.on('pointerdown', press); this.input.on('pointermove', move);
    this.input.on('pointerup', release); this.input.on('pointerupoutside', release);
    this.game.events.on(Phaser.Core.Events.BLUR, blur); this.game.events.on(Phaser.Core.Events.HIDDEN, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', down); this.input.keyboard?.off('keyup', up);
      this.input.off('pointerdown', press); this.input.off('pointermove', move);
      this.input.off('pointerup', release); this.input.off('pointerupoutside', release);
      this.game.events.off(Phaser.Core.Events.BLUR, blur); this.game.events.off(Phaser.Core.Events.HIDDEN, blur);
      this.held.clear(); this.textures.remove(key);
    });
    this.paint();
  }

  /** Back to the map of the house, with this room chosen. */
  protected toMap(): void { this.scene.start('House', { room: this.room }); }

  /**
   * The bar along the top: whose game, the room's title, the sound (there is no M key on a tablet) and the way back to the
   * map. Room buttons go between x = 480 and 1000.
   */
  protected topBar(title: string, id: string): void {
    document.title = `${title} · ${t('carl')}`; document.documentElement.lang = getLang();
    this.mirror('h1', `${t('carl')} · ${title}`);
    this.panel(28, 24, 1384, 99, 0xfff8e5, 22, 0.96);
    this.label(t('carl'), 55, 39, 20, '#67715d', undefined, true);
    this.label(title, 54, 67, 31, '#25473f', undefined, true);
    this.soundButton(`${id.split('-')[0]}-sound`, 1016);
    this.button(id, t('toMap'), 1170, 45, 217, () => this.toMap(), true);
  }

  step(dt: number): void {
    this.clock += dt;
    this.tick(dt);
    this.paint();
    this.bubbles.draw(this.clock, this.marks(), 0, K);
  }

  update(_time: number, delta: number): void { if (!this.frozen) this.step(Math.min(0.05, delta / 1000)); }

  private paint(): void {
    const c = this.texture.context, scale = K / DIV;
    c.save(); c.scale(scale, scale); this.paintWorld(c, scale); c.restore();
    this.texture.refresh();
  }
}
