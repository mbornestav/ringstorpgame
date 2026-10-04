import Phaser from 'phaser';
import { onLangChange } from '../../side/i18n';
import { RENDER_SCALE } from '../config';
import { FONT } from '../fonts';
import { fontPx } from '../theme';
import { isRetro } from '../../side/pixel';
import { keyGlyphs } from '../ui/text';
import { familyText } from './text';
import { CRT } from '../look';
import { addCrt } from '../crt';
import { sessionOf } from '../scenes/shared';
import { isTouch } from '../input/touch';

/** Shared canvas controls and their keyboard/screen-reader counterparts. */
export abstract class FamilySurface extends Phaser.Scene {
  protected layer!: Phaser.GameObjects.Container;
  protected root!: HTMLElement;
  private targets = new Map<string, { x: number; y: number; width: number; height: number }>();

  protected setup(): void {
    // The sound preference is shared with Ringstorp Run; apply it here too, since these scenes can open first.
    this.game.sound.mute = sessionOf(this).muted;
    this.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE / 3);
    if (isRetro()) this.cameras.main.setRoundPixels(true);
    if (CRT) addCrt(this);
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
    // New tap targets only join Phaser's hit testing at the start of the next frame, and the old ones are gone already, so
    // a quick tap right after a rebuild would land on nothing (on a tablet, touches arrive between frames). Take them in now.
    (this.input as unknown as { preUpdate(): void }).preUpdate();
    if (focus) this.root.querySelector<HTMLButtonElement>(`[data-family="${focus}"]`)?.focus({ preventScroll: true });
  }

  protected abstract build(): void;

  /** Sound on or off (music and effects), remembered with the rest of the collection's preferences. */
  protected toggleSound(): void {
    const session = sessionOf(this);
    session.setMuted(!session.muted);
    this.game.sound.mute = session.muted;
    this.rebuild();
  }
  protected get muted(): boolean { return sessionOf(this).muted; }
  /** Played with fingers: the keyboard hints are left out (the games are all playable by touch). */
  protected get touch(): boolean { return isTouch(); }

  /** The sound switch for the top bar: a tablet has no M key. */
  protected soundButton(id: string, x: number, y = 45, width = 140): void {
    this.button(id, this.muted ? familyText('soundOff') : familyText('soundOn'), x, y, width, () => this.toggleSound(), true);
  }

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
    const text = this.add.text(x, y, keyGlyphs(value), {
      fontFamily: isRetro() ? FONT.pixel : bold ? FONT.display : FONT.body, fontSize: fontPx(size), fontStyle: bold && !isRetro() ? '700' : '400', color,
      resolution: 2, ...(width ? { wordWrap: { width, useAdvancedWrap: true } } : {}), lineSpacing: 5,
    });
    this.layer.add(text); return text;
  }

  /**
   * Big touch targets in the lower right for walking left and right (Kurragömma, Filmkväll): a held arrow is in `touches`
   * under its pointer, as the arrow key it stands for. `pressed` runs when one is touched.
   */
  protected walkPad(touches: Map<number, string>, pressed?: () => void): void {
    for (const [key, glyph, x] of [['arrowleft', '◀', 1150], ['arrowright', '▶', 1320]] as const) {
      this.panel(x, 660, 80, 72, 0xfff8e5, 18, 0.93);
      this.label(glyph, x + 26, 676, 34, '#315846', undefined, true);
      const zone = this.add.zone(x, 660, 80, 72).setOrigin(0).setInteractive(); this.layer.add(zone);
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => { touches.set(p.id, key); pressed?.(); });
      zone.on('pointerout', (p: Phaser.Input.Pointer) => touches.delete(p.id));
    }
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
    if (!isRetro() && text.width > width - 36) text.setFontSize(Math.floor(25 * (width - 36) / text.width));
    this.target(id, label, x, y, width, height, 17, action, over => bg.setAlpha(over ? 0.85 : 1));
  }

  /**
   * An invisible control over part of the illustration (a room on the map, a thing in a room): a tap target with a DOM
   * button for the keyboard and screen readers, and a focus ring. `instant` acts as soon as a finger touches it (an egg
   * hops into the bowl whether it is tapped or a drag starts on it); `zone: false` leaves the canvas to the room's own
   * gestures (stirring, painting) and keeps only the DOM button and its ring.
   */
  protected hotspot(id: string, label: string, x: number, y: number, width: number, height: number, action: () => void, opts: { instant?: boolean; zone?: boolean } = {}): void {
    this.target(id, label, x, y, width, height, 12, action, undefined, opts);
  }

  private target(id: string, label: string, x: number, y: number, width: number, height: number, radius: number, action: () => void, hover?: (over: boolean) => void, opts: { instant?: boolean; zone?: boolean } = {}): void {
    const ring = this.add.graphics().lineStyle(3, 0xd98b47).strokeRoundedRect(x - 4, y - 4, width + 8, height + 8, radius).setVisible(false);
    this.layer.add(ring);
    if (opts.zone !== false) {
      const zone = this.add.zone(x, y, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
      this.layer.add(zone);
      let pressed = false;
      const run = () => { (document.activeElement as HTMLElement | null)?.blur(); action(); };
      zone.on('pointerover', () => hover?.(true));
      zone.on('pointerout', () => { hover?.(false); pressed = false; });
      zone.on('pointerdown', () => { if (opts.instant) run(); else pressed = true; });
      zone.on('pointerup', () => { if (pressed) { pressed = false; run(); } });
    }
    const proxy = document.createElement('button'); proxy.type = 'button'; proxy.textContent = label; proxy.dataset.family = id;
    proxy.addEventListener('click', action);
    proxy.addEventListener('focus', () => ring.setVisible(true));
    proxy.addEventListener('blur', () => ring.setVisible(false));
    proxy.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });
    // A button activates on Space when the key comes up; keep that keyup from Phaser, whose key capture would cancel it.
    proxy.addEventListener('keyup', e => { if (e.key === ' ') e.stopPropagation(); });
    this.root.append(proxy);
    this.targets.set(id, { x, y, width, height });
  }

  boundsOf(id: string): { x: number; y: number; width: number; height: number } | null {
    const b = this.targets.get(id), z = this.cameras.main.zoom;
    return b ? { x: b.x * z, y: b.y * z, width: b.width * z, height: b.height * z } : null;
  }
}
