import Phaser from 'phaser';
import { COLOR, CSS, RADIUS, textStyle } from '../../theme';
import { box } from './draw';
import { keyGlyphs } from '../text';

/** A small rounded tag: the "01" before a title screen's eyebrow, a level number. */
export class Chip extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, label: string, fill: number = COLOR.gold, ink: string = CSS.ink) {
    super(scene, 0, 0);
    const text = scene.add.text(0, 0, label, textStyle('key', ink));
    const w = Math.ceil(text.width) + 18, h = Math.ceil(text.height) + 6;
    const bg = scene.add.graphics();
    box(bg, 0, 0, w, h, { fill, fillAlpha: 1, radius: RADIUS.chip });
    text.setPosition(9, 3);
    this.add([bg, text]);
    this.setSize(w, h);
    scene.add.existing(this);
  }
}

/** A keycap: the "E" beside an action, the "F" on the phone launcher. */
export class KeyChip extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, keys: string) {
    super(scene, 0, 0);
    const text = scene.add.text(0, 0, keyGlyphs(keys), textStyle('key', CSS.gold));
    const w = Math.max(30, Math.ceil(text.width) + 22), h = Math.ceil(text.height) + 6;
    const bg = scene.add.graphics();
    box(bg, 0, 0, w, h, { fill: COLOR.ink, fillAlpha: 0.85, border: COLOR.goldDeep, borderWidth: 1.5, radius: RADIUS.chip });
    text.setPosition(Math.round((w - text.width) / 2), 3);
    this.add([bg, text]);
    this.setSize(w, h);
    scene.add.existing(this);
  }
}
