import type Phaser from 'phaser';

// Speech bubbles for Carl-Otto's walking games (Kurragömma, Filmkväll). They float over the world from a small pool of
// reusable objects, so a busy moment never creates new ones. Positions are world pixels; `k` is world pixels to interface
// pixels (the 960-wide world fills the 1440-wide interface).

export type Tone = 'friend' | 'surprise' | 'teacher' | 'giggle' | 'look';
export interface Bubble { text: string; x: number; y: number; until: number; tone: Tone }
interface Slot { g: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }

export class Bubbles {
  private live: Bubble[] = [];
  private readonly pool: Slot[];

  constructor(scene: Phaser.Scene, style: Phaser.Types.GameObjects.Text.TextStyle, size = 10) {
    this.pool = Array.from({ length: size }, () => ({ g: scene.add.graphics().setDepth(40), text: scene.add.text(0, 0, '', style).setDepth(41) }));
  }

  /** Shows `text` until the clock reaches `until`, replacing a bubble of the same tone close by. */
  say(text: string, x: number, y: number, tone: Tone, until: number): void {
    this.live = this.live.filter(b => !(b.tone === tone && Math.abs(b.x - x) < 40));
    this.live.push({ text, x, y, until, tone });
  }

  /** Removes every bubble, or only those of one tone. */
  clear(tone?: Tone): void { this.live = tone ? this.live.filter(b => b.tone !== tone) : []; }

  /** Draws the bubbles still showing at `now`, then `extra` (this frame only), over a view whose left edge is at `cam`. */
  draw(now: number, extra: Bubble[], cam: number, k: number): void {
    this.live = this.live.filter(b => b.until > now);
    const shown = [...this.live, ...extra], taken: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
    this.pool.forEach((slot, i) => {
      const b = shown[i];
      slot.g.clear();
      if (!b) { slot.text.setVisible(false); return; }
      slot.text.setText(b.text).setVisible(true).setWordWrapWidth(360, true);
      const w = Math.ceil(slot.text.width) + 32, h = Math.ceil(slot.text.height) + 20;
      const cx = Math.round(Math.max(w / 2 + 10, Math.min(1430 - w / 2, (b.x - cam) * k)));
      // A bubble that would cover one already drawn moves up above it (or below, when there is no room above).
      let top = Math.round(Math.max(130, b.y * k - h));
      for (let tries = 0; tries < 6; tries++) {
        const hit = taken.find(r => cx - w / 2 < r.x1 && cx + w / 2 > r.x0 && top < r.y1 && top + h + 14 > r.y0);
        if (!hit) break;
        top = hit.y0 - h - 22 >= 130 ? hit.y0 - h - 22 : hit.y1 + 8;
      }
      taken.push({ x0: cx - w / 2, x1: cx + w / 2, y0: top, y1: top + h + 14 });
      const fill = b.tone === 'look' ? 0x2a5a4b : b.tone === 'teacher' ? 0xfff0b8 : 0xffffff;
      slot.g.fillStyle(0x1d3326, 0.25).fillRoundedRect(cx - w / 2 + 4, top + 5, w, h, 12);
      slot.g.fillStyle(fill, 1).fillRoundedRect(cx - w / 2, top, w, h, 12).lineStyle(3, 0x25473f, 1).strokeRoundedRect(cx - w / 2, top, w, h, 12);
      slot.g.fillStyle(fill, 1).fillTriangle(cx - 10, top + h - 2, cx + 10, top + h - 2, cx, top + h + 14);
      slot.text.setColor(b.tone === 'look' ? '#fff7df' : '#25473f').setPosition(Math.round(cx - slot.text.width / 2), top + 10);
    });
  }
}
