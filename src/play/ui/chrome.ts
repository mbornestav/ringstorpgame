import Phaser from 'phaser';
import type { Session } from '../session';
import { COLOR, CSS, UI_H, UI_W, textStyle } from '../theme';
import { box } from './kit/draw';
import { Button } from './kit/button';
import { KeyChip } from './kit/chip';
import { familyText } from '../family/text';
import type { ControlHint, FooterModel, HudModel, MastheadModel } from './models';

const TOP = 60;
const MARGIN = 20;

/** The frame around the game: brand and switches along the top, the controls strip and credit along the bottom. */
export class Chrome extends Phaser.GameObjects.Container {
  private readonly backdrop: Phaser.GameObjects.Graphics;
  private readonly brandMark: Phaser.GameObjects.Graphics;
  private readonly brand: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private readonly dot: Phaser.GameObjects.Graphics;
  private readonly streetLabel: Phaser.GameObjects.Text;
  private readonly street: Phaser.GameObjects.Text;
  private readonly level: Phaser.GameObjects.Text;
  readonly lang: Button;
  readonly sound: Button;
  readonly chooser: Button;
  private readonly strip: Phaser.GameObjects.Container;
  private readonly credit: Phaser.GameObjects.Text;
  private stripKey = '';
  private mastheadKey = '';

  constructor(scene: Phaser.Scene, private readonly session: Session) {
    super(scene, 0, 0);
    this.backdrop = scene.add.graphics();
    this.backdrop.fillGradientStyle(COLOR.ink, COLOR.ink, COLOR.ink, COLOR.ink, 0.86, 0.86, 0, 0);
    this.backdrop.fillRect(0, 0, UI_W, TOP + 18);
    this.backdrop.fillGradientStyle(COLOR.ink, COLOR.ink, COLOR.ink, COLOR.ink, 0, 0, 0.84, 0.84);
    this.backdrop.fillRect(0, UI_H - 78, UI_W, 78);

    this.brandMark = scene.add.graphics();
    box(this.brandMark, MARGIN, 10, 42, 42, { fill: COLOR.gold, fillAlpha: 1, radius: 8, shadow: 6 });
    const mark = scene.add.text(MARGIN + 21, 31, 'RR', { ...textStyle('display', CSS.night), fontSize: '24px' }).setOrigin(0.5);
    this.brand = scene.add.text(MARGIN + 56, 8, '', { ...textStyle('display', CSS.paper), fontSize: '28px' });
    this.sub = scene.add.text(MARGIN + 58, 38, '', { ...textStyle('small', CSS.dim), fontSize: '13px' });

    this.dot = scene.add.graphics();
    this.streetLabel = scene.add.text(0, 0, '', { ...textStyle('label', CSS.dim), fontSize: '16px' });
    this.street = scene.add.text(0, 0, '', { ...textStyle('label', CSS.paper), fontSize: '19px' });
    this.level = scene.add.text(0, 0, '', { ...textStyle('label', CSS.gold), fontSize: '17px' }).setOrigin(1, 0);
    this.lang = new Button(scene, { id: 'lang', label: '', kind: 'icon', height: 40 });
    this.sound = new Button(scene, { id: 'sound', label: '', kind: 'icon', height: 40 });
    this.lang.onPress = () => this.session.dispatch('lang');
    this.sound.onPress = () => this.session.dispatch('sound');
    this.chooser = new Button(scene, { id: 'chooser', label: familyText('menu'), kind: 'icon', height: 40 });
    this.chooser.setPosition(325, 10);
    this.chooser.onPress = () => this.session.dispatch('chooser');

    this.strip = scene.add.container(0, UI_H - 46);
    this.credit = scene.add.text(UI_W - MARGIN, UI_H - 5, '', { ...textStyle('small', CSS.dim), fontSize: '11px' }).setOrigin(1, 1);
    this.add([this.backdrop, this.brandMark, mark, this.brand, this.sub, this.dot, this.streetLabel, this.street, this.level, this.lang, this.sound, this.chooser, this.strip, this.credit]);
    scene.add.existing(this);
  }

  /** Focus ring for the button the DOM proxy currently holds. */
  setFocus(id: string | null): void {
    this.lang.setFocused(id === 'lang');
    this.sound.setFocused(id === 'sound');
    this.chooser.setFocused(id === 'chooser');
  }

  update(head: MastheadModel, hud: HudModel, foot: FooterModel, controls: ControlHint[]): void {
    const key = `${head.brand}|${head.sub}|${head.lang.label}|${head.sound.label}|${hud.streetLabel}|${hud.streetLine}|${hud.levelLine}|${foot.bestLabel}|${foot.best}`;
    if (key !== this.mastheadKey) {
      this.mastheadKey = key;
      this.brand.setText(head.brand);
      this.sub.setText(head.sub);
      this.chooser.set({ id: 'chooser', label: familyText('menu'), kind: 'icon', height: 40 });
      this.lang.set({ id: 'lang', label: head.lang.label, kind: 'icon', height: 40 });
      this.sound.set({ id: 'sound', label: head.sound.label, kind: 'icon', height: 40 });
      this.sound.setPosition(UI_W - MARGIN - this.sound.width, 10);
      this.lang.setPosition(this.sound.x - 12 - this.lang.width, 10);
      this.level.setText(hud.levelLine).setPosition(this.lang.x - 24, 22);
      this.streetLabel.setText(hud.streetLabel);
      this.street.setText(hud.streetLine);
      const total = 22 + this.streetLabel.width + 10 + this.street.width;
      const x0 = Math.round((UI_W - total) / 2);
      this.dot.clear().fillStyle(COLOR.yellow, 1).fillCircle(x0 + 6, 31, 5);
      this.dot.fillStyle(COLOR.yellow, 0.25).fillCircle(x0 + 6, 31, 10);
      this.streetLabel.setPosition(x0 + 22, 22);
      this.street.setPosition(x0 + 22 + this.streetLabel.width + 10, 20);
      this.credit.setText(`${foot.bestLabel} ${foot.best}  ·  ${foot.credit}`);
    }
    this.layoutStrip(controls);
  }

  private layoutStrip(hints: ControlHint[]): void {
    const key = hints.map(h => `${h.keys}:${h.label}`).join('|');
    if (key === this.stripKey) return;
    this.stripKey = key;
    this.strip.removeAll(true);
    let x = 0;
    for (const hint of hints) {
      const chip = new KeyChip(this.scene, hint.keys);
      chip.setPosition(x, 0);
      const label = this.scene.add.text(x + chip.width + 8, 3, hint.label, { ...textStyle('small', CSS.paper), fontSize: '15px' });
      this.strip.add([chip, label]);
      x += chip.width + 8 + label.width + 22;
    }
    const width = x - 22;
    // Long lists (level 2 has nine) shrink to fit rather than run off the screen.
    const fit = Math.min(1, (UI_W - MARGIN * 2) / width);
    this.strip.setScale(fit);
    this.strip.setPosition(MARGIN, UI_H - 52 + (1 - fit) * 12);
  }
}
