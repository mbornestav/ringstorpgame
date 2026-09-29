import Phaser from 'phaser';
import ddPortrait from '../../side/dd-portrait.png';

/** Loads what the other scenes need, then starts the world and the UI side by side. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.load.image('dd-portrait', ddPortrait);
  }

  create(): void {
    this.scene.start('World');
    this.scene.launch('UI');
  }
}
