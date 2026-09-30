import Phaser from 'phaser';
import { COLOR, CSS, MOTION, RADIUS, textStyle, fontPx } from '../../theme';
import { box, glyph, type Glyph } from './draw';
import { keyGlyphs } from '../text';

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'icon';

export interface ButtonSpec {
  /** The action id this button performs; the ARIA proxy with the same id mirrors it. */
  id: string;
  label: string;
  lead?: Glyph | null;
  /** A key cap shown before the label, like the F on the phone launcher. */
  key?: string;
  kind?: ButtonKind;
  /** A smaller second line, for the level-pick buttons. */
  sub?: string;
  width?: number;
  height?: number;
  /** 'sm' sets the label smaller, for side panels where the full size would not fit. */
  size?: 'md' | 'sm';
}

const PAD_X = 30;

/**
 * A pointer- and keyboard-driven button drawn with Graphics. It activates on release, only if the press began on it, so
 * dragging off cancels. Keyboard focus is owned by the DOM proxy button that mirrors it; `setFocused` shows the ring.
 */
export class Button extends Phaser.GameObjects.Container {
  id: string;
  onPress: (() => void) | null = null;
  private spec: ButtonSpec;
  /** Everything visible, so a hover lift moves the look without moving the hit area. */
  private readonly face: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private readonly keycap: Phaser.GameObjects.Text;
  private hover = false;
  private down = false;
  private focused = false;
  private disabled = false;

  constructor(scene: Phaser.Scene, spec: ButtonSpec) {
    super(scene, 0, 0);
    this.id = spec.id;
    this.spec = spec;
    this.bg = scene.add.graphics();
    this.icon = scene.add.graphics();
    this.title = scene.add.text(0, 0, '', textStyle('display'));
    this.sub = scene.add.text(0, 0, '', textStyle('small', CSS.dim));
    this.keycap = scene.add.text(0, 0, '', textStyle('key', CSS.gold));
    this.face = scene.add.container(0, 0, [this.bg, this.icon, this.title, this.sub, this.keycap]);
    this.add(this.face);
    this.layout();
    this.on('pointerover', () => { this.hover = true; this.redraw(); });
    this.on('pointerout', () => { this.hover = false; this.down = false; this.redraw(); });
    this.on('pointerdown', () => { if (!this.disabled) { this.down = true; this.redraw(); } });
    this.on('pointerup', () => {
      const pressed = this.down && !this.disabled;
      this.down = false;
      this.redraw();
      if (pressed) this.onPress?.();
    });
    scene.add.existing(this);
  }

  /** Updates label and look in place; the id and size are recomputed. */
  set(spec: ButtonSpec): this {
    this.spec = spec;
    this.id = spec.id;
    this.layout();
    return this;
  }

  setDisabled(disabled: boolean): this {
    if (this.disabled === disabled) return this;
    this.disabled = disabled;
    this.redraw();
    return this;
  }

  setFocused(focused: boolean): this {
    if (this.focused === focused) return this;
    this.focused = focused;
    this.redraw();
    return this;
  }

  private layout(): void {
    const { label, lead, sub, key, kind = 'secondary' } = this.spec;
    const small = kind === 'icon';
    this.keycap.setText(key ?? '').setVisible(!!key);
    const keySpace = key ? Math.max(30, Math.ceil(this.keycap.width) + 16) + 12 : 0;
    this.title.setStyle({ ...textStyle(small ? 'label' : 'display', this.textColor()), ...(sub && { fontSize: fontPx(34) }), ...(this.spec.size === 'sm' && { fontSize: fontPx(27) }) }).setText(keyGlyphs(label.toUpperCase()));
    this.sub.setText(sub ?? '').setVisible(!!sub);
    const iconSpace = (lead ? 40 : 0) + keySpace;
    this.title.setScale(1);
    if (this.spec.width) {
      const room = this.spec.width - PAD_X * 2 - iconSpace;
      if (this.title.width > room) this.title.setScale(room / this.title.width);
    }
    // A fixed-width button shortens its second line to fit, word by word.
    if (sub && this.spec.width) {
      const room = this.spec.width - PAD_X * 2 - iconSpace;
      let words = sub.split(' ');
      while (this.sub.width > room && words.length > 1) { words = words.slice(0, -1); this.sub.setText(`${words.join(' ').replace(/[\s·,.-]+$/, '')}…`); }
    }
    const w = this.spec.width ?? Math.max(small ? 96 : this.spec.size === 'sm' ? 120 : 160, Math.ceil(Math.max(this.title.width + iconSpace, this.sub.width + iconSpace)) + PAD_X * 2);
    const h = this.spec.height ?? (sub ? 84 : small ? 48 : this.spec.size === 'sm' ? 52 : 68);
    this.setSize(w, h);
    this.title.setPosition(PAD_X + iconSpace, sub ? 10 : Math.round((h - this.title.height) / 2) - 1);
    this.sub.setPosition(PAD_X + iconSpace, 10 + this.title.displayHeight);
    this.keycap.setPosition(PAD_X + Math.round((keySpace - 12 - this.keycap.width) / 2), Math.round((h - this.keycap.height) / 2));
    // A Container tests its hit area from its centre (its display origin is half its size), while the button is laid out
    // from its top-left corner: offset the rectangle by half, or every button answers half a button up and to the left.
    if (this.input) (this.input.hitArea as Phaser.Geom.Rectangle).setTo(w / 2, h / 2, w, h);
    else this.setInteractive({ hitArea: new Phaser.Geom.Rectangle(w / 2, h / 2, w, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.redraw();
  }

  private textColor(): string {
    if (this.disabled) return CSS.dim;
    return this.spec.kind === 'primary' ? CSS.ink : this.spec.kind === 'ghost' ? CSS.cream : CSS.gold;
  }

  private redraw(): void {
    const { kind = 'secondary', lead } = this.spec;
    const w = this.width, h = this.height, g = this.bg;
    g.clear();
    this.face.y = this.down ? 2 : this.hover && !this.disabled ? -2 : 0;
    this.title.setColor(this.textColor());
    this.setAlpha(this.disabled ? 0.55 : 1);
    if (kind === 'primary') {
      box(g, 0, 0, w, h, { fill: this.hover ? 0xffd88f : COLOR.gold, fillAlpha: 1, border: 0xb98d3f, borderWidth: 2, radius: RADIUS.button, shadow: this.down ? 4 : 12 });
    } else if (kind === 'secondary') {
      box(g, 0, 0, w, h, { fill: this.hover ? COLOR.teal : COLOR.panelHi, fillAlpha: 0.96, border: COLOR.goldDeep, borderWidth: 2, radius: RADIUS.button, shadow: this.down ? 3 : 8 });
    } else if (kind === 'icon') {
      box(g, 0, 0, w, h, { fill: this.hover ? COLOR.teal : COLOR.panelHi, fillAlpha: 0.9, border: COLOR.line, borderWidth: 2, radius: RADIUS.button });
    } else if (this.hover) {
      box(g, 0, 0, w, h, { fill: COLOR.teal, fillAlpha: 0.6, radius: RADIUS.button });
    }
    if (this.focused) {
      g.lineStyle(4, 0xffe1a0, 1);
      g.strokeRoundedRect(-5, -5, w + 10, h + 10, RADIUS.button + 5);
    }
    this.icon.clear();
    if (this.spec.key) {
      const cap = Math.max(30, Math.ceil(this.keycap.width) + 16);
      box(this.icon, PAD_X, Math.round((h - 30) / 2), cap, 30, { fill: COLOR.ink, fillAlpha: 0.85, border: COLOR.goldDeep, borderWidth: 1.5, radius: RADIUS.chip });
    }
    if (lead) {
      const color = this.disabled ? COLOR.dim : kind === 'primary' ? COLOR.ink : COLOR.gold;
      glyph(this.icon, lead, PAD_X + 14, this.spec.sub ? 10 + this.title.height / 2 + 2 : h / 2, 24, color);
    }
  }

  /** Fades in; used when a panel appears. */
  reveal(delay = 0): this {
    const to = this.disabled ? 0.55 : 1;
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: to, duration: MOTION.base, delay });
    return this;
  }
}
