import Phaser from 'phaser';
import { t } from '../side/i18n';
import type { Message } from './session';

/** Native Phaser text stays sharp at the illustrated view's higher output resolution. */
export class IllustratedDialogue {
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image;
  private speaker: Phaser.GameObjects.Text;
  private line: Phaser.GameObjects.Text;
  private signature = '';
  constructor(scene: Phaser.Scene) {
    this.background = scene.add.graphics();
    this.portrait = scene.add.image(15, 12, 'dd-illustrated-portrait').setOrigin(0).setDisplaySize(32, 32);
    this.speaker = scene.add.text(60, 10, '', { fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '7px', fontStyle: 'bold', color: '#b5c9b8', resolution: 3 });
    this.line = scene.add.text(60, 23, '', { fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '10px', color: '#f5f1e6', lineSpacing: 3, resolution: 3, wordWrap: { width: 288 } });
    this.container = scene.add.container(58, 28, [this.background, this.portrait, this.speaker, this.line]).setVisible(false);
  }
  update(message: Message | null): void {
    if (!message || message.remaining <= 0) { this.container.setVisible(false); return; }
    this.container.setVisible(true).setAlpha(Math.min(1, message.remaining * 2));
    const full = t(message.key), signature = `${full}:${message.portrait ?? ''}`;
    if (signature === this.signature) return;
    this.signature = signature;
    const colon = full.indexOf(':'), name = colon < 0 ? '' : full.slice(0, colon), body = colon < 0 ? full : full.slice(colon + 1).trim();
    const left = message.portrait ? 60 : 17;
    this.portrait.setVisible(!!message.portrait);
    this.speaker.setPosition(left, 10).setText(name);
    this.line.setPosition(left, name ? 23 : 14).setWordWrapWidth(347 - left).setText(body);
    const height = Math.max(message.portrait ? 56 : 44, this.line.y + this.line.height + 13);
    this.background.clear();
    this.background.fillStyle(0x080f10, .2).fillRoundedRect(0, 3, 364, height, 5);
    this.background.fillStyle(0x1c2a2b, .97).fillRoundedRect(0, 0, 364, height, 5);
    this.background.lineStyle(.35, 0xccd4c4, .35).strokeRoundedRect(0, 0, 364, height, 5);
    this.background.fillStyle(0xd8ba84).fillRoundedRect(0, 9, 1.2, height - 18, .6);
  }
}
