import Phaser from 'phaser';
import { isRetro } from '../../side/pixel';
import type { Session } from '../session';
import { COLOR, CSS, MOTION, RADIUS, UI_H, UI_W, textStyle, fontPx } from '../theme';
import { box } from './kit/draw';
import { Button } from './kit/button';
import { KeyChip } from './kit/chip';
import type { PromptModel } from './models';

const W = 900, H = 96;
const X = Math.round((UI_W - W) / 2);
const Y = UI_H - (isRetro() ? 250 : 214);

/** The bar above the street that says what E would do here, and lets you click it instead. */
export class PromptBar extends Phaser.GameObjects.Container {
  readonly button: Button;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly small: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private key: KeyChip;
  private shown = false;
  private lastKey = '';

  constructor(scene: Phaser.Scene, private readonly session: Session) {
    super(scene, X, Y);
    this.bg = scene.add.graphics();
    box(this.bg, 0, 0, W, H, { fill: COLOR.panel, fillAlpha: 0.94, border: COLOR.gold, borderAlpha: 0.85, borderWidth: 2, radius: RADIUS.panel, shadow: 18 });
    this.small = scene.add.text(28, 12, '', { ...textStyle('label', CSS.gold), fontSize: fontPx(16) });
    this.title = scene.add.text(28, 32, '', { ...textStyle('display', CSS.paper), fontSize: fontPx(32) });
    this.sub = scene.add.text(28, 70, '', { ...textStyle('small', CSS.dim), fontSize: fontPx(16) });
    this.button = new Button(scene, { id: 'interact', label: '', kind: 'primary', height: 60 });
    this.key = new KeyChip(scene, 'E');
    this.button.onPress = () => this.session.dispatch('interact', 'pointer');
    this.add([this.bg, this.small, this.title, this.sub, this.button, this.key]);
    this.setVisible(false).setAlpha(0);
    scene.add.existing(this);
  }

  setFocus(focused: boolean): void { this.button.setFocused(focused); }

  update(model: PromptModel | null): void {
    if (!model) {
      if (this.shown) {
        this.shown = false;
        this.scene.tweens.add({ targets: this, alpha: 0, duration: MOTION.fast, onComplete: () => { if (!this.shown) this.setVisible(false); } });
      }
      this.lastKey = '';
      return;
    }
    if (model.key !== this.lastKey) {
      this.lastKey = model.key;
      this.small.setText(model.small.toUpperCase());
      this.title.setText(model.title);
      this.sub.setText(model.sub);
      this.button.set({ id: 'interact', label: model.button.label, kind: 'primary', height: 60 });
      this.button.setDisabled(!model.button.enabled);
      this.key.setPosition(W - 24 - this.button.width - this.key.width - 10, Math.round((H - this.key.height) / 2));
      this.button.setPosition(W - 24 - this.button.width, Math.round((H - 60) / 2));
    }
    if (!this.shown) {
      this.shown = true;
      this.setVisible(true);
      this.scene.tweens.killTweensOf(this);
      this.setY(Y + 16);
      this.scene.tweens.add({ targets: this, alpha: 1, y: Y, duration: MOTION.base, ease: 'Cubic.easeOut' });
    }
  }
}
