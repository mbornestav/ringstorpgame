import Phaser from 'phaser';
import { getLang } from '../../side/i18n';
import type { Controls } from '../input/controls';
import type { Session } from '../session';
import { COLOR, CSS, textStyle, fontPx } from '../theme';
import { Button } from './kit/button';
import type { ControlHint } from './models';

// Ringstorp Run's controls for fingers (an iPad, a phone), shown only on touch screens while playing: a thumb stick on the
// left (it appears where the thumb lands) and round buttons on the right. The buttons are the level's own key hints (the
// same list the keyboard strip shows), so each level gets exactly the actions it has: jump, punch, dodge and shoot on the
// street, sneak and the lift in the office, sneak and work at the yard, and only the stick while driving. Everything goes
// through the keyboard's keymap (`Controls.press`), so a thumb on JUMP is exactly Space.

type Pt = [number, number];

/** The hint's keys (as the strip shows them), the key they stand for, and the button's short name. */
const ACTIONS: Array<{ keys: string; key: string; sv: string; en: string }> = [
  { keys: 'SPACE / L', key: ' ', sv: 'HOPPA', en: 'JUMP' },
  { keys: 'J', key: 'j', sv: 'SLÅ', en: 'PUNCH' },
  { keys: 'K', key: 'k', sv: 'VÄJ', en: 'DODGE' },
  { keys: 'E', key: 'e', sv: 'ANVÄND', en: 'USE' },
  { keys: 'I', key: 'i', sv: 'SKJUT', en: 'SHOOT' },
  { keys: 'SHIFT', key: 'shift', sv: 'SMYG', en: 'SNEAK' },
];
/** Where the buttons go, first (the biggest, under the right thumb) to last. */
const SLOTS: Array<[number, number, number]> = [[1322, 664, 72], [1188, 702, 58], [1322, 520, 58], [1190, 568, 54], [1322, 392, 52], [1186, 440, 50]];
/** The stick: where a thumb can land, where it rests, and how far the knob travels. */
const STICK_ZONE = { x: 0, y: 330, w: 600, h: 440 };
const STICK_REST: Pt = [190, 640];
const STICK_R = 110;
/** How far (a share of the reach) the knob must go before it counts as a direction. */
const DEAD = 0.35;

interface Pad { key: string; x: number; y: number; r: number; face: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone; pointer: number | null }

export class TouchPad extends Phaser.GameObjects.Container {
  readonly pause: Button;
  private readonly base: Phaser.GameObjects.Graphics;
  private readonly stickZone: Phaser.GameObjects.Zone;
  private pads: Pad[] = [];
  private shownKey = '';
  private stickId: number | null = null;
  private origin: Pt = STICK_REST;
  private knob: Pt = STICK_REST;
  /** Arrow keys the stick holds down right now. */
  private stickKeys = new Set<string>();
  private showStick = false;

  constructor(scene: Phaser.Scene, private readonly session: Session, private readonly controls: () => Controls | null) {
    super(scene, 0, 0);
    this.base = scene.add.graphics();
    this.stickZone = scene.add.zone(STICK_ZONE.x, STICK_ZONE.y, STICK_ZONE.w, STICK_ZONE.h).setOrigin(0).setInteractive();
    this.stickZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.stickId !== null || !this.showStick) return;
      this.stickId = p.id;
      this.origin = this.at(p); this.knob = this.origin;
      this.steer();
    });
    this.pause = new Button(scene, { id: 'touch-pause', label: getLang() === 'sv' ? 'PAUS' : 'PAUSE', kind: 'icon', height: 52 });
    this.pause.setPosition(30, 268);
    this.pause.onPress = () => this.session.dispatch('pause');
    this.add([this.base, this.stickZone, this.pause]);
    const move = (p: Phaser.Input.Pointer) => { if (p.id === this.stickId) { this.knob = this.at(p); this.steer(); } };
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickId) { this.stickId = null; this.origin = STICK_REST; this.knob = STICK_REST; this.steer(); }
      for (const pad of this.pads) if (pad.pointer === p.id) this.lift(pad);
    };
    scene.input.on('pointermove', move); scene.input.on('pointerup', up); scene.input.on('pointerupoutside', up);
    this.once(Phaser.GameObjects.Events.DESTROY, () => { scene.input.off('pointermove', move); scene.input.off('pointerup', up); scene.input.off('pointerupoutside', up); });
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** A pointer in this scene's 1440 × 810 space. */
  private at(p: Phaser.Input.Pointer): Pt { const z = this.scene.cameras.main.zoom; return [p.x / z, p.y / z]; }

  /** The stick's direction, as arrow keys held down. */
  private steer(): void {
    const dx = this.knob[0] - this.origin[0], dy = this.knob[1] - this.origin[1], d = Math.hypot(dx, dy);
    // The knob stays within reach of where the thumb landed.
    if (d > STICK_R) this.knob = [this.origin[0] + dx / d * STICK_R, this.origin[1] + dy / d * STICK_R];
    const want = new Set<string>();
    if (this.stickId !== null) {
      if (dx > DEAD * STICK_R) want.add('arrowright'); else if (dx < -DEAD * STICK_R) want.add('arrowleft');
      if (dy > DEAD * STICK_R) want.add('arrowdown'); else if (dy < -DEAD * STICK_R) want.add('arrowup');
    }
    const c = this.controls();
    for (const k of this.stickKeys) if (!want.has(k)) c?.release(k);
    for (const k of want) if (!this.stickKeys.has(k)) c?.press(k);
    this.stickKeys = want;
    this.draw();
  }

  private lift(pad: Pad): void { pad.pointer = null; this.controls()?.release(pad.key); this.drawPad(pad); }

  /** Lets go of everything (the pad is hidden, or the game stopped). */
  private releaseAll(): void {
    if (this.stickId !== null || this.stickKeys.size) { this.stickId = null; this.origin = STICK_REST; this.knob = STICK_REST; this.steer(); }
    for (const pad of this.pads) if (pad.pointer !== null) this.lift(pad);
  }

  /** The buttons for this level's hints: rebuilt only when they change. */
  private build(hints: ControlHint[]): void {
    const key = hints.map(h => h.keys).join('|') + getLang();
    if (key === this.shownKey) return;
    this.shownKey = key;
    for (const pad of this.pads) { pad.face.destroy(); pad.label.destroy(); pad.zone.destroy(); }
    this.showStick = hints.some(h => h.keys === 'A D / ← →' || h.keys === 'D');
    const wanted = ACTIONS.filter(a => hints.some(h => h.keys === a.keys));
    this.pads = wanted.slice(0, SLOTS.length).map((a, i) => {
      const [x, y, r] = SLOTS[i];
      const face = this.scene.add.graphics();
      const label = this.scene.add.text(x, y, getLang() === 'sv' ? a.sv : a.en, { ...textStyle('label', CSS.paper), fontSize: fontPx(i === 0 ? 20 : 16) }).setOrigin(0.5);
      const zone = this.scene.add.zone(x - r, y - r, r * 2, r * 2).setOrigin(0).setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
      const pad: Pad = { key: a.key, x, y, r, face, label, zone, pointer: null };
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => { if (pad.pointer !== null) return; pad.pointer = p.id; this.controls()?.press(pad.key); this.drawPad(pad); });
      this.add([face, label, zone]);
      this.drawPad(pad);
      return pad;
    });
    this.pause.set({ id: 'touch-pause', label: getLang() === 'sv' ? 'PAUS' : 'PAUSE', kind: 'icon', height: 52 });
    this.draw();
  }

  private drawPad(pad: Pad): void {
    const g = pad.face, down = pad.pointer !== null;
    g.clear();
    g.fillStyle(COLOR.ink, down ? 0.75 : 0.45).fillCircle(pad.x, pad.y + 4, pad.r);
    g.fillStyle(down ? COLOR.gold : COLOR.night, down ? 0.85 : 0.55).fillCircle(pad.x, pad.y, pad.r);
    g.lineStyle(3, COLOR.gold, down ? 1 : 0.75).strokeCircle(pad.x, pad.y, pad.r);
    pad.label.setColor(down ? CSS.night : CSS.paper);
  }

  private draw(): void {
    const g = this.base;
    g.clear();
    if (!this.showStick) return;
    const [ox, oy] = this.origin, [kx, ky] = this.knob, active = this.stickId !== null;
    // At rest it is faint, so it does not hide the courier at the start of a street.
    g.fillStyle(COLOR.ink, active ? 0.45 : 0.18).fillCircle(ox, oy, STICK_R + 14);
    g.lineStyle(3, COLOR.gold, active ? 0.8 : 0.3).strokeCircle(ox, oy, STICK_R + 14);
    // Little chevrons for the four directions.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) {
      const cx = ox + dx * (STICK_R - 8), cy = oy + dy * (STICK_R - 8), px = -dy * 10, py = dx * 10;
      g.fillStyle(COLOR.gold, active ? 0.6 : 0.35).fillTriangle(cx + dx * 10, cy + dy * 10, cx + px, cy + py, cx - px, cy - py);
    }
    g.fillStyle(COLOR.ink, active ? 0.5 : 0.25).fillCircle(kx, ky + 4, 48);
    g.fillStyle(COLOR.paper, active ? 0.95 : 0.5).fillCircle(kx, ky, 46);
    g.lineStyle(3, COLOR.gold, active ? 1 : 0.6).strokeCircle(kx, ky, 46);
  }

  /** Shown while a level is being played on a touch screen; the buttons follow the level's hints. */
  update(hints: ControlHint[], show: boolean): void {
    if (!show) { if (this.visible) { this.releaseAll(); this.setVisible(false); } return; }
    this.setVisible(true);
    this.build(hints);
  }

  /** Where a control is, in this scene's space (tests press it with a real touch): `touch-pause`, `touch-stick`, or `touch-<key>`. */
  boundsOf(id: string): { x: number; y: number; width: number; height: number } | null {
    if (!this.visible) return null;
    if (id === 'touch-stick') return this.showStick ? { x: STICK_REST[0] - STICK_R, y: STICK_REST[1] - STICK_R, width: STICK_R * 2, height: STICK_R * 2 } : null;
    const pad = this.pads.find(p => `touch-${p.key === ' ' ? 'jump' : p.key}` === id);
    return pad ? { x: pad.x - pad.r, y: pad.y - pad.r, width: pad.r * 2, height: pad.r * 2 } : null;
  }
}
