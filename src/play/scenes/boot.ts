import Phaser from 'phaser';
import ddPortrait from '../../side/dd-portrait.png';

/** Loads what the other scenes need, then starts the world and the UI side by side. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.load.image('dd-portrait', ddPortrait);
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    if (params.get('game') === 'ringstorp' || params.has('level') || ['1', '2', '3'].includes(params.get('start') ?? '')) {
      this.scene.start('World');
      this.scene.launch('UI');
    } else if (params.get('game') === 'carl-otto') this.scene.start('Bike');
    else if (params.get('game') === 'kurragomma') this.scene.start('Hide');
    else if (params.get('game') === 'filmkvall') this.scene.start('Movie');
    else if (params.get('game') === 'hemma') this.scene.start('House');
    else if (params.get('game') === 'pyssel') this.scene.start('Craft');
    else if (params.get('game') === 'pannkakor') this.scene.start('Pancake');
    else if (params.get('game') === 'godnatt') this.scene.start('Goodnight');
    else if (params.get('game') === 'godmorgon') this.scene.start('Morning');
    else if (params.get('game') === 'hemkomst') this.scene.start('Homecoming');
    else this.scene.start('Hub');
  }
}
