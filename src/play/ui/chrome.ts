import Phaser from 'phaser';
import { isRetro } from '../../side/pixel';
import type { Session } from '../session';
import { COLOR, CSS, UI_H, UI_W, textStyle, fontPx } from '../theme';
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
  /** How many rows the key hints take (retro wraps them), so the route strip can sit clear of them. */
  stripRows = 1;
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
    const mark = scene.add.text(MARGIN + 21, 31, 'RR', { ...textStyle('display', CSS.night), fontSize: fontPx(24) }).setOrigin(0.5);
    this.brand = scene.add.text(MARGIN + 56, 8, '', { ...textStyle('display', CSS.paper), fontSize: fontPx(28) });
    this.sub = scene.add.text(MARGIN + 58, 38, '', { ...textStyle('small', CSS.dim), fontSize: fontPx(13) });

    this.dot = scene.add.graphics();
    this.streetLabel = scene.add.text(0, 0, '', { ...textStyle('label', CSS.dim), fontSize: fontPx(16) });
    this.street = scene.add.text(0, 0, '', { ...textStyle('label', CSS.paper), fontSize: fontPx(19) });
    this.level = scene.add.text(0, 0, '', { ...textStyle('label', CSS.gold), fontSize: fontPx(17) }).setOrigin(1, 0);
    this.lang = new Button(scene, { id: 'lang', label: '', kind: 'icon', height: 40 });
    this.sound = new Button(scene, { id: 'sound', label: '', kind: 'icon', height: 40 });
    this.lang.onPress = () => this.session.dispatch('lang');
    this.sound.onPress = () => this.session.dispatch('sound');
    this.chooser = new Button(scene, { id: 'chooser', label: familyText('menu'), kind: 'icon', height: 40 });
    this.chooser.setPosition(325, 10);
    this.chooser.onPress = () => this.session.dispatch('chooser');

    this.strip = scene.add.container(0, UI_H - 46);
    this.credit = scene.add.text(UI_W - MARGIN, UI_H - 5, '', { ...textStyle('small', CSS.dim), fontSize: fontPx(11) }).setOrigin(1, 1);
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
      // Retro: the pixel font leaves no room for the strapline beside the street line.
      this.sub.setText(head.sub).setVisible(!isRetro());
      this.chooser.set({ id: 'chooser', label: familyText('menu'), kind: 'icon', height: 40 });
      this.lang.set({ id: 'lang', label: head.lang.label, kind: 'icon', height: 40 });
      this.sound.set({ id: 'sound', label: head.sound.label, kind: 'icon', height: 40 });
      this.sound.setPosition(UI_W - MARGIN - this.sound.width, 10);
      this.lang.setPosition(this.sound.x - 12 - this.lang.width, 10);
      this.level.setText(hud.levelLine).setPosition(this.lang.x - 24, 22);
      this.streetLabel.setText(hud.streetLabel);
      this.street.setText(hud.streetLine);
      if (isRetro()) {
        // The pixel font is wider: the chooser moves clear of the brand, and the street line centres in the space that
        // is left, dropping its small label when that space is tight.
        this.chooser.setPosition(Math.max(250, MARGIN + 58 + Math.ceil(this.brand.width) + 24), 10);
      }
      const left = this.chooser.x + this.chooser.width + 24, right = this.level.x - this.level.width - 24;
      const tight = isRetro() && 22 + this.streetLabel.width + 10 + this.street.width > right - left;
      this.streetLabel.setVisible(!tight);
      const total = tight ? 22 + this.street.width : 22 + this.streetLabel.width + 10 + this.street.width;
      const x0 = isRetro() ? Math.round(left + (right - left - total) / 2) : Math.round((UI_W - total) / 2);
      this.dot.clear().fillStyle(COLOR.yellow, 1).fillCircle(x0 + 6, 31, 5);
      this.dot.fillStyle(COLOR.yellow, 0.25).fillCircle(x0 + 6, 31, 10);
      this.streetLabel.setPosition(x0 + 22, 22);
      this.street.setPosition(tight ? x0 + 22 : x0 + 22 + this.streetLabel.width + 10, isRetro() ? 19 : 20);
      // Retro: the pixel font is wide, so the footer keeps only the map credit and leaves the line to the key hints.
      this.credit.setText(isRetro() ? foot.attribution : `${foot.bestLabel} ${foot.best}  ·  ${foot.credit}`);
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
      const label = this.scene.add.text(x + chip.width + 8, 3, hint.label, { ...textStyle('small', CSS.paper), fontSize: fontPx(15) });
      this.strip.add([chip, label]);
      x += chip.width + 8 + label.width + 22;
    }
    const width = x - 22;
    if (isRetro()) { this.wrapStrip(); return; }
    // Long lists (level 2 has nine) shrink to fit rather than run off the screen.
    const fit = Math.min(1, (UI_W - MARGIN * 2) / width);
    this.strip.setScale(fit);
    this.strip.setPosition(MARGIN, UI_H - 52 + (1 - fit) * 12);
  }

  /** Retro: pixel text cannot be scaled, so a long list of hints moves onto a second row instead of shrinking. */
  private wrapStrip(): void {
    const items = this.strip.list as unknown as Array<KeyChip | Phaser.GameObjects.Text>;
    let x = 0, row = 0;
    for (let i = 0; i < items.length; i += 2) {
      const chip = items[i], label = items[i + 1], w = chip.width + 8 + label.width;
      if (x > 0 && x + w > this.credit.x - this.credit.width - MARGIN - 24) { row++; x = 0; }
      chip.setPosition(x, row * 36);
      label.setPosition(x + chip.width + 8, row * 36 + 2);
      x += w + 18;
    }
    this.strip.setScale(1).setPosition(MARGIN, UI_H - 4 - (row + 1) * 36);
    this.stripRows = row + 1;
  }
}
