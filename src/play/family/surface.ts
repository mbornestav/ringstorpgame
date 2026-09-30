import Phaser from 'phaser';
import { onLangChange } from '../../side/i18n';
import { RENDER_SCALE } from '../config';
import { FONT } from '../fonts';

/** Shared canvas controls and their keyboard/screen-reader counterparts. */
export abstract class FamilySurface extends Phaser.Scene {
  protected layer!: Phaser.GameObjects.Container;
  protected root!: HTMLElement;
  private targets = new Map<string, { x: number; y: number; width: number; height: number }>();

  protected setup(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE / 3);
    this.root = document.getElementById('a11y')!;
    const offLang = onLangChange(() => this.rebuild());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { offLang(); this.root.replaceChildren(); this.targets.clear(); });
    this.rebuild();
  }

  protected rebuild(): void {
    const focus = (document.activeElement as HTMLElement | null)?.dataset.family;
    this.layer?.destroy();
    this.layer = this.add.container(0, 0);
    this.root.replaceChildren(); this.targets.clear();
    this.build();
    if (focus) this.root.querySelector<HTMLButtonElement>(`[data-family="${focus}"]`)?.focus({ preventScroll: true });
  }

  protected abstract build(): void;

  protected rect(x: number, y: number, w: number, h: number, color: number, radius = 0, alpha = 1): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().fillStyle(color, alpha);
    if (radius) g.fillRoundedRect(x, y, w, h, radius); else g.fillRect(x, y, w, h);
    this.layer.add(g); return g;
  }

  protected label(value: string, x: number, y: number, size = 22, color = '#25473f', width?: number, bold = false): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, value, {
      fontFamily: bold ? FONT.display : FONT.body, fontSize: `${size}px`, fontStyle: bold ? '700' : '400', color,
      resolution: 2, ...(width ? { wordWrap: { width, useAdvancedWrap: true } } : {}), lineSpacing: 5,
    });
    this.layer.add(text); return text;
  }

  protected mirror(tag: 'h1' | 'h2' | 'p', value: string, id?: string): HTMLElement {
    const el = document.createElement(tag); el.textContent = value;
    if (id) el.id = id;
    this.root.append(el); return el;
  }

  protected button(id: string, label: string, x: number, y: number, width: number, action: () => void, light = false): void {
    const height = 56;
    const bg = this.rect(x, y, width, height, light ? 0xe9e8d8 : 0x254b40, 14);
    const text = this.label(label, x + 22, y + 12, 25, light ? '#254b40' : '#fff7df', undefined, true);
    if (text.width > width - 36) text.setFontSize(Math.floor(25 * (width - 36) / text.width));
    const ring = this.add.graphics().lineStyle(3, 0xd98b47).strokeRoundedRect(x - 4, y - 4, width + 8, height + 8, 17).setVisible(false);
    this.layer.add(ring);
    const zone = this.add.zone(x, y, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
    this.layer.add(zone);
    let pressed = false;
    zone.on('pointerover', () => { bg.setAlpha(0.85); });
    zone.on('pointerout', () => { bg.setAlpha(1); pressed = false; });
    zone.on('pointerdown', () => { pressed = true; });
    zone.on('pointerup', () => { if (pressed) { pressed = false; (document.activeElement as HTMLElement | null)?.blur(); action(); } });
    const proxy = document.createElement('button'); proxy.type = 'button'; proxy.textContent = label; proxy.dataset.family = id;
    proxy.addEventListener('click', action);
    proxy.addEventListener('focus', () => ring.setVisible(true));
    proxy.addEventListener('blur', () => ring.setVisible(false));
    proxy.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });
    this.root.append(proxy);
    this.targets.set(id, { x, y, width, height });
  }

  boundsOf(id: string): { x: number; y: number; width: number; height: number } | null {
    const b = this.targets.get(id), z = this.cameras.main.zoom;
    return b ? { x: b.x * z, y: b.y * z, width: b.width * z, height: b.height * z } : null;
  }
}
