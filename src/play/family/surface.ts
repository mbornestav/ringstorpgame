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

  /** A card with a soft shadow beneath it, so it floats over the illustration. */
  protected panel(x: number, y: number, w: number, h: number, color: number, radius = 0, alpha = 1): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    for (const [grow, dy, a] of [[6, 8, 0.05], [3, 5, 0.07], [0, 3, 0.1]] as const) g.fillStyle(0x1d3326, a * alpha).fillRoundedRect(x - grow, y + dy - grow / 2, w + grow * 2, h + grow, radius + grow);
    g.fillStyle(color, alpha).fillRoundedRect(x, y, w, h, radius);
    this.layer.add(g); return g;
  }

  /** Hearts drawn as shapes (no font has to supply them): `filled` of `max`, left to right. */
  protected hearts(g: Phaser.GameObjects.Graphics, x: number, y: number, filled: number, max: number, size = 30): void {
    g.clear();
    for (let i = 0; i < max; i++) {
      const cx = x + i * (size + 10) + size / 2, cy = y + size * 0.3, k = size / 30;
      const heart = (grow: number) => {
        const r = (8 + grow) * k;
        g.fillCircle(cx - 7 * k, cy, r); g.fillCircle(cx + 7 * k, cy, r);
        g.fillTriangle(cx - (14.6 + grow) * k, cy + 3 * k, cx + (14.6 + grow) * k, cy + 3 * k, cx, cy + (21 + grow * 1.4) * k);
      };
      if (i < filled) {
        g.fillStyle(0x7a2320, 1); heart(1.6);
        g.fillStyle(0xd9473c, 1); heart(0);
        g.fillStyle(0xffb3a0, 0.8); g.fillEllipse(cx + 7 * k, cy - 2.5 * k, 6 * k, 4 * k);
      } else {
        g.fillStyle(0xb9ae94, 1); heart(1.6);
        g.fillStyle(0xf1ead3, 1); heart(0);
      }
    }
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
    // A raised button: a darker lip below the face gives it depth.
    this.rect(x, y + 4, width, height, light ? 0xc9c6b0 : 0x14302a, 14, light ? 0.9 : 1);
    const bg = this.rect(x, y, width, height, light ? 0xf1efe1 : 0x2a5a4b, 14);
    this.rect(x + 3, y + 3, width - 6, height / 2 - 3, 0xffffff, 11, light ? 0.35 : 0.08);
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
