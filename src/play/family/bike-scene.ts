import Phaser from 'phaser';
import { getLang } from '../../side/i18n';
import { drawRide } from './art';
import { BikeRun } from './bike-run';
import { FamilySurface } from './surface';
import { familyText as t } from './text';

export class BikeScene extends FamilySurface {
  run = new BikeRun();
  frozen = false;
  private texture!: Phaser.Textures.CanvasTexture;
  private held = new Set<string>();
  private touches = new Map<number, string>();
  private heartText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private status!: HTMLElement;
  private statusKey = '';
  private lastMode = '';

  constructor() { super('Bike'); }

  create(): void {
    this.run = new BikeRun(); this.frozen = false; this.held.clear(); this.touches.clear(); this.lastMode = ''; this.statusKey = '';
    if (this.textures.exists('bike-world')) this.textures.remove('bike-world');
    this.texture = this.textures.createCanvas('bike-world', 1440, 810)!;
    this.add.image(0, 0, 'bike-world').setOrigin(0);
    this.setup();
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape', 'enter', ' '].includes(key)) return;
      e.stopPropagation();
      if ((key === 'enter' || key === ' ') && document.activeElement instanceof HTMLButtonElement) return;
      if (!e.repeat && key === 'escape') {
        if (this.run.mode === 'riding') this.run.pause(); else if (this.run.mode === 'paused') this.run.resume();
        this.changed();
      } else if (!e.repeat && (key === 'enter' || key === ' ') && this.run.mode !== 'riding') {
        if (this.run.mode === 'paused') this.run.resume(); else this.run.start();
        this.changed();
      } else this.held.add(key);
    };
    const up = (e: KeyboardEvent) => { e.stopPropagation(); this.held.delete(e.key.toLowerCase()); };
    const blur = () => { this.run.pause(); this.changed(); };
    const release = (p: Phaser.Input.Pointer) => this.touches.delete(p.id);
    this.input.keyboard?.on('keydown', down); this.input.keyboard?.on('keyup', up);
    this.input.on('pointerup', release); this.input.on('pointerupoutside', release);
    this.game.events.on(Phaser.Core.Events.BLUR, blur); this.game.events.on(Phaser.Core.Events.HIDDEN, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', down); this.input.keyboard?.off('keyup', up);
      this.input.off('pointerup', release); this.input.off('pointerupoutside', release);
      this.game.events.off(Phaser.Core.Events.BLUR, blur); this.game.events.off(Phaser.Core.Events.HIDDEN, blur);
      this.held.clear(); this.touches.clear(); this.textures.remove('bike-world');
    });
    this.paint();
  }

  private changed(): void {
    this.held.clear(); this.touches.clear(); this.rebuild(); this.lastMode = this.run.mode;
    const focus = this.run.mode === 'riding' ? null : this.root.querySelector<HTMLButtonElement>('[data-family="ride-primary"]');
    focus?.focus({ preventScroll: true });
  }

  protected build(): void {
    document.title = `${t('bikeTitle')} · ${t('carl')}`; document.documentElement.lang = getLang();
    this.mirror('h1', `${t('carl')} · ${t('bikeTitle')}`);
    this.rect(28, 24, 1384, 99, 0xfff8e5, 22, 0.96);
    this.label(t('carl'), 55, 39, 20, '#67715d', undefined, true);
    this.label(t('bikeTitle'), 54, 67, 31, '#25473f', undefined, true);
    this.heartText = this.label('', 402, 47, 30, '#b24838', undefined, true);
    this.label(t('home'), 590, 40, 17, '#67715d'); this.label(t('preschool'), 869, 40, 17, '#67715d');
    this.rect(590, 75, 383, 12, 0xe1ddc3, 6);
    this.progressBar = this.add.graphics(); this.layer.add(this.progressBar);
    this.distanceText = this.label('', 590, 93, 16, '#52644c');
    this.button('bike-menu', t('back'), 1170, 45, 217, () => this.scene.start('Hub'), true);
    if (this.run.mode === 'riding') this.button('bike-pause', t('pause'), 1001, 45, 145, () => { this.run.pause(); this.changed(); }, true);
    this.status = this.mirror('p', '', 'bike-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    this.statusKey = '';
    if (this.run.mode === 'riding') {
      this.rect(28, 739, 690, 47, 0xfff8e5, 16, 0.92);
      this.label(`${t('steer')}  ↑ ↓ ← → / WASD     ${t('pauseHint')}`, 49, 750, 20, '#3e5948', undefined, true);
      this.pad();
    } else this.overlay();
    this.updateHud();
  }

  private overlay(): void {
    const mode = this.run.mode;
    this.rect(0, 135, 1440, 675, 0x264d3d, 0, mode === 'won' ? 0.10 : 0.15);
    const won = mode === 'won', ready = mode === 'ready', paused = mode === 'paused';
    const title = ready ? t('bikeTitle') : paused ? t('paused') : won ? t('won') : t('lost');
    const body = ready ? t('bikeInstructions') : paused ? t('pausedBody') : won ? t('wonBody') : t('lostBody');
    // The arrival card stays above the low red preschool, leaving the destination visible.
    const y = won ? 145 : 187;
    this.rect(330, y, 780, ready ? 365 : won ? 245 : 285, 0xfff7df, 28, 0.98);
    this.label(ready ? `${t('first')} · ${t('carl')}` : t('carl'), 373, y + (won ? 16 : 29), 20, '#8f653b', undefined, true);
    this.label(title, 372, y + (won ? 49 : 63), won ? 45 : 51, '#294d3e', 690, true);
    this.label(body, 374, y + (won ? 108 : 132), won ? 21 : 23, '#58674f', 684);
    if (ready) this.label(t('bikeHint'), 374, y + 232, 20, '#946137', 670);
    this.button('ride-primary', paused ? t('resume') : ready ? t('start') : t('again'), 374, y + (ready ? 288 : won ? 172 : 207), 265, () => {
      if (this.run.mode === 'paused') this.run.resume(); else this.run.start(); this.changed();
    });
    if (won) this.label(`${this.run.dodged} ${t('avoided')}`, 674, y + 185, 22, '#657b51');
    this.mirror('h2', title, 'bike-panel-title'); this.mirror('p', body);
    if (ready) this.mirror('p', t('bikeHint'));
  }

  /** Large pointer targets, separate from the road. Multiple held arrows work together. */
  private pad(): void {
    const keys = [
      ['arrowleft', '←', t('moveLeft'), 1070, 718], ['arrowright', '→', t('moveRight'), 1244, 718],
      ['arrowup', '↑', t('up'), 1157, 631], ['arrowdown', '↓', t('down'), 1157, 718],
    ] as const;
    for (const [key, glyph, label, x, y] of keys) {
      this.rect(x, y, 77, 69, 0xfff8e5, 18, 0.93);
      this.label(glyph, x + 21, y + 8, 37, '#315846', undefined, true);
      const zone = this.add.zone(x, y, 77, 69).setOrigin(0).setInteractive(); this.layer.add(zone);
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.touches.set(p.id, key));
      zone.on('pointerout', (p: Phaser.Input.Pointer) => this.touches.delete(p.id));
      const proxy = document.createElement('button'); proxy.type = 'button'; proxy.textContent = label;
      proxy.addEventListener('click', () => {
        if (this.run.mode !== 'riding') return;
        this.run.x = Math.max(80, Math.min(650, this.run.x + (key === 'arrowleft' ? -35 : key === 'arrowright' ? 35 : 0)));
        this.run.y = Math.max(396, Math.min(475, this.run.y + (key === 'arrowup' ? -24 : key === 'arrowdown' ? 24 : 0)));
      });
      this.root.append(proxy);
    }
  }

  private updateHud(): void {
    this.heartText.setText('♥ '.repeat(this.run.hearts) + '♡ '.repeat(3 - this.run.hearts));
    this.distanceText.setText(`${this.run.metresLeft} ${t('left')}`);
    this.progressBar.clear().fillStyle(0x749052).fillRoundedRect(590, 75, Math.max(12, 383 * this.run.progress), 12, 6);
    const statusKey = `${this.run.mode}|${this.run.hearts}|${Math.ceil(this.run.metresLeft / 25)}`;
    if (statusKey !== this.statusKey) {
      this.statusKey = statusKey;
      this.status.textContent = `${t('hearts')}: ${this.run.hearts}/3. ${this.run.metresLeft} ${t('left')}.`;
    }
  }

  private paint(): void {
    const c = this.texture.context; c.save(); c.scale(1.5, 1.5); drawRide(c, this.run); c.restore(); this.texture.refresh();
  }

  step(dt: number): void {
    const active = new Set([...this.held, ...this.touches.values()]);
    const x = Number(active.has('d') || active.has('arrowright')) - Number(active.has('a') || active.has('arrowleft'));
    const y = Number(active.has('s') || active.has('arrowdown')) - Number(active.has('w') || active.has('arrowup'));
    this.run.update(dt, x, y);
    if (this.run.mode !== this.lastMode) this.changed();
    this.updateHud(); this.paint();
  }

  update(_time: number, delta: number): void { if (!this.frozen) this.step(Math.min(0.05, delta / 1000)); }
}
