import Phaser from 'phaser';
import type { UiAction } from '../actions';
import type { Session } from '../session';
import { COLOR, CSS, MOTION, RADIUS, UI_H, UI_W, textStyle, fontPx } from '../theme';
import { box } from './kit/draw';
import { Button } from './kit/button';
import { Chip, KeyChip } from './kit/chip';
import type { PanelAction, PanelModel } from './models';

type Kind = 'title' | 'briefing' | 'compact';
const kindOf = (m: PanelModel): Kind => m.kind === 'title' ? 'title' : m.kind === 'gods-briefing' || m.kind === 'heist-briefing' ? 'briefing' : 'compact';

const ACCENT: Record<NonNullable<PanelModel['titleAccent']>, string> = { gold: CSS.gold, red: CSS.red, blink: CSS.gold };

/** The overlay panels: the title screen, D.D's mission calls, the pause card and the results. */
export class PanelHost extends Phaser.GameObjects.Container {
  private readonly scrim: Phaser.GameObjects.Graphics;
  private card: Phaser.GameObjects.Container | null = null;
  private buttons: Button[] = [];
  private shownKey = '';
  private shown = false;

  constructor(scene: Phaser.Scene, private readonly session: Session) {
    super(scene, 0, 0);
    this.scrim = scene.add.graphics();
    this.add(this.scrim);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** The action buttons currently shown, in reading order. */
  get actions(): Button[] { return this.buttons; }

  setFocus(id: string | null): void { for (const b of this.buttons) b.setFocused(b.id === id); }

  update(model: PanelModel | null): void {
    if (!model) { this.hide(); return; }
    if (this.shown && model.key === this.shownKey) return;
    const rebuilt = this.shownKey !== '' && this.shown;
    this.shownKey = model.key;
    this.build(model, rebuilt);
  }

  private hide(): void {
    if (!this.shown) return;
    this.shown = false;
    this.shownKey = '';
    const card = this.card;
    this.scene.tweens.killTweensOf([this, card]);
    this.scene.tweens.add({ targets: this, alpha: 0, duration: MOTION.fast, onComplete: () => { if (!this.shown) { this.setVisible(false); this.clearCard(); } } });
  }

  private clearCard(): void {
    this.card?.destroy();
    this.card = null;
    this.buttons = [];
  }

  private build(model: PanelModel, replacing: boolean): void {
    this.clearCard();
    const kind = kindOf(model);
    this.scrim.clear();
    if (kind === 'title') {
      this.scrim.fillGradientStyle(COLOR.ink, COLOR.ink, COLOR.ink, COLOR.ink, 0.82, 0.05, 0.82, 0.05);
      this.scrim.fillRect(0, 0, UI_W, UI_H);
    } else if (!model.scenic) {
      this.scrim.fillStyle(COLOR.ink, 0.6).fillRect(0, 0, UI_W, UI_H);
    }
    const card = this.scene.add.container(0, 0);
    this.card = card;
    this.add(card);
    if (model.scenic) this.layoutArrival(card, model); else if (kind === 'title') this.layoutTitle(card, model); else if (kind === 'briefing') this.layoutBriefing(card, model); else this.layoutCompact(card, model);
    card.setY(replacing ? 0 : 24);
    this.setVisible(true);
    this.shown = true;
    this.scene.tweens.killTweensOf([this, card]);
    this.setAlpha(replacing ? 0.55 : 0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: MOTION.base });
    if (!replacing) this.scene.tweens.add({ targets: card, y: 0, duration: MOTION.slow, ease: 'Cubic.easeOut' });
    this.buttons.forEach((b, i) => b.reveal(60 + i * 50));
  }

  // ---------------------------------------------------------------- shared pieces

  private text(parent: Phaser.GameObjects.Container, kind: Parameters<typeof textStyle>[0], value: string, x: number, y: number, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, color: string = CSS.cream): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, value, { ...textStyle(kind, color), ...extra });
    parent.add(t);
    return t;
  }

  /** "01 · EYEBROW ———— 1994". Returns the y below it. */
  private eyebrow(card: Phaser.GameObjects.Container, m: PanelModel, x: number, y: number, width: number): number {
    let cx = x;
    if (m.chip) { const chip = new Chip(this.scene, m.chip); chip.setPosition(cx, y); card.add(chip); cx += chip.width + 14; }
    const label = this.text(card, 'label', m.eyebrow.toUpperCase(), cx, y + 1, { fontSize: fontPx(21) }, CSS.gold);
    cx += label.width + 16;
    const rule = this.scene.add.graphics();
    const end = m.eyebrowExtra ? x + width - 70 : x + width;
    rule.lineStyle(2, COLOR.gold, 0.5).lineBetween(cx, y + 14, end, y + 14);
    card.add(rule);
    if (m.eyebrowExtra) this.text(card, 'label', m.eyebrowExtra, end + 12, y + 1, { fontSize: fontPx(21) }, CSS.dim);
    return y + 48;
  }

  private titleWithAccent(card: Phaser.GameObjects.Container, m: PanelModel, x: number, y: number, size: number): number {
    const t = this.text(card, 'display', m.title.toUpperCase(), x, y, { fontSize: fontPx(size) }, CSS.paper);
    if (m.titleAccent) {
      const mark = this.text(card, 'display', m.titleAccent === 'blink' ? '_' : '.', x + t.width + 2, y, { fontSize: fontPx(size) }, ACCENT[m.titleAccent]);
      if (m.titleAccent === 'blink') this.scene.tweens.add({ targets: mark, alpha: 0.1, duration: 520, yoyo: true, repeat: -1 });
    }
    return y + t.height + 6;
  }

  private bullets(card: Phaser.GameObjects.Container, items: string[], x: number, y: number, width: number): number {
    let cy = y;
    for (const item of items) {
      const dot = this.scene.add.graphics().fillStyle(COLOR.gold, 1).fillCircle(x + 6, cy + 16, 5);
      card.add(dot);
      const t = this.text(card, 'body', item, x + 26, cy, { fontSize: fontPx(22), wordWrap: { width: width - 26, useAdvancedWrap: true } });
      cy += t.height + 8;
    }
    return cy;
  }

  private stats(card: Phaser.GameObjects.Container, stats: PanelModel['stats'], x: number, y: number, width: number): number {
    const gap = 16, w = Math.floor((width - gap * (stats.length - 1)) / stats.length);
    stats.forEach((s, i) => {
      const sx = x + i * (w + gap), g = this.scene.add.graphics();
      box(g, sx, y, w, 96, { fill: COLOR.ink, fillAlpha: 0.55, border: COLOR.line, borderAlpha: 0.7, borderWidth: 1.5, radius: RADIUS.button });
      card.add(g);
      this.text(card, 'label', s.label.toUpperCase(), sx + 18, y + 12, { fontSize: fontPx(16) }, CSS.dim);
      this.text(card, 'display', s.value, sx + 18, y + 38, { fontSize: fontPx(42) }, CSS.gold);
    });
    return y + 96 + 26;
  }

  /** Primary and plain buttons in a row with the key hint, then any level-pick buttons (the ones with a second line) below. */
  private actionRows(card: Phaser.GameObjects.Container, m: PanelModel, x: number, y: number, width: number, hintBelow = false): number {
    const plain = m.actions.filter(a => !a.sub), picks = m.actions.filter(a => a.sub);
    let cx = x, cy = y, rowH = 0;
    // More than two level picks (level files listed on the title screen) share the width in two columns.
    const grid = picks.length > 2 ? Math.floor((width - 16) / 2) : 0;
    const add = (a: PanelAction) => {
      const pick = grid > 0 && !!a.sub;
      const b = new Button(this.scene, { id: a.id, label: a.label, lead: a.lead === '▶' ? 'play' : a.lead === '↻' ? 'again' : a.lead === '✚' ? 'plus' : null, kind: a.kind, sub: a.sub, ...(pick && { width: grid, size: 'sm' as const }) });
      if (cx > x && cx + b.width > x + width) { cx = x; cy += rowH + 16; rowH = 0; }
      b.setPosition(cx, cy);
      b.onPress = () => this.session.dispatch(a.id as UiAction, 'pointer');
      card.add(b);
      this.buttons.push(b);
      cx += b.width + 16;
      rowH = Math.max(rowH, b.height);
    };
    plain.forEach(add);
    if (m.hint && plain.length) {
      if (hintBelow) { cy += rowH + 16; this.text(card, 'small', m.hint, x, cy, { fontSize: fontPx(16) }, CSS.dim); rowH = 24; }
      else this.text(card, 'small', m.hint, cx + 8, cy + Math.round(rowH / 2) - 10, { fontSize: fontPx(16), wordWrap: { width: Math.max(160, x + width - cx - 8) } }, CSS.dim);
    }
    // Clear space between the main buttons and the level picks, so neither is pressed for the other.
    if (picks.length) { cx = x; cy += rowH + 30; rowH = 0; picks.forEach(add); }
    return cy + rowH;
  }

  private finish(card: Phaser.GameObjects.Container, x: number, y: number, w: number, bottom: number, pad: number): void {
    const g = this.scene.add.graphics();
    box(g, x - pad, y - pad, w + pad * 2, bottom - y + pad * 2, { fill: COLOR.panel, fillAlpha: 0.94, border: COLOR.goldDeep, borderAlpha: 0.9, borderWidth: 2, radius: RADIUS.panel + 4, shadow: 30 });
    card.addAt(g, 0);
  }

  // ---------------------------------------------------------------- layouts

  private layoutTitle(card: Phaser.GameObjects.Container, m: PanelModel): void {
    if (m.actions.length > 3) {
      const x = 100, w = 1240, top = 100;
      let y = this.eyebrow(card, m, x, top, w);
      y = this.titleWithAccent(card, m, x, y - 8, 88) + 8;
      if (m.subtitle) y += this.text(card, 'label', m.subtitle, x, y, { fontSize: fontPx(24) }, CSS.gold).height + 12;
      y += this.text(card, 'body', m.body, x, y, { fontSize: fontPx(24), wordWrap: { width: w, useAdvancedWrap: true }, lineSpacing: 5 }).height + 4;
      y = this.actionRows(card, m, x, y, w);
      this.finish(card, x, top, w, y, 32);
      return;
    }
    // The bottom strip already lists the keys, so the controls grid of the old title screen is not repeated here.
    const x = 72, w = 900, top = 80;
    let y = this.eyebrow(card, m, x, top, w);
    const [first, second] = m.title.split(' ');
    const size = 104, step = 90;
    this.text(card, 'title', first, x - 4, y - 14, { fontSize: fontPx(size) }, CSS.paper);
    const b = this.text(card, 'title', second ?? '', x - 4, y - 14 + step, { fontSize: fontPx(size) }, CSS.gold);
    const mid = y - 14 + step + b.height * 0.52;
    const play = this.scene.add.graphics();
    play.fillStyle(COLOR.red, 1).fillTriangle(x + b.width + 26, mid - 32, x + b.width + 26, mid + 32, x + b.width + 78, mid);
    card.add(play);
    y += step + b.height - 24;
    if (m.subtitle) y += this.text(card, 'label', m.subtitle.toUpperCase(), x, y, { fontSize: fontPx(26) }, CSS.gold).height + 8;
    y += this.text(card, 'body', m.body, x, y, { fontSize: fontPx(22), wordWrap: { width: w, useAdvancedWrap: true }, lineSpacing: 5 }, CSS.cream).height + 24;
    y = this.actionRows(card, m, x, y, w);
    this.finish(card, x, top, w, y, 40);
  }

  private layoutBriefing(card: Phaser.GameObjects.Container, m: PanelModel): void {
    const w = 1080, x = Math.round((UI_W - w) / 2), top = 150;
    let y = this.eyebrow(card, m, x, top, w);
    const textX = m.portrait ? x + 200 : x, textW = w - (textX - x);
    if (m.portrait && this.scene.textures.exists('dd-portrait')) {
      const frame = this.scene.add.graphics();
      box(frame, x, y, 164, 184, { fill: COLOR.ink, fillAlpha: 0.7, border: COLOR.goldDeep, borderWidth: 2, radius: RADIUS.button });
      card.add(frame);
      card.add(this.scene.add.image(x + 82, y + 90, 'dd-portrait').setScale(2));
      this.text(card, 'display', m.portrait.name, x, y + 198, { fontSize: fontPx(30) }, CSS.paper);
      this.text(card, 'small', m.portrait.caption, x, y + 232, { fontSize: fontPx(17), wordWrap: { width: 180 } }, CSS.dim);
    }
    let ty = this.titleWithAccent(card, m, textX, y - 4, 64) + 10;
    ty += this.text(card, 'body', m.body, textX, ty, { fontSize: fontPx(23), wordWrap: { width: textW, useAdvancedWrap: true }, lineSpacing: 6 }).height + 18;
    ty = this.bullets(card, m.bullets, textX, ty, textW) + 22;
    ty = this.actionRows(card, m, textX, ty, textW);
    const bottom = Math.max(ty, y + 290);
    this.finish(card, x, top, w, bottom, 44);
  }

  private layoutCompact(card: Phaser.GameObjects.Container, m: PanelModel): void {
    const w = 860, x = Math.round((UI_W - w) / 2);
    const isPause = m.kind === 'pause';
    const top = isPause ? 262 : 258;
    let y = this.eyebrow(card, m, x, top, w);
    y = this.titleWithAccent(card, m, x, y - 4, isPause ? 72 : 68) + 10;
    y += this.text(card, 'body', m.body, x, y, { fontSize: fontPx(24), wordWrap: { width: w, useAdvancedWrap: true }, lineSpacing: 6 }).height + 22;
    if (m.stats.length) y = this.stats(card, m.stats, x, y, w);
    y = this.actionRows(card, m, x, y, w, isPause);
    this.finish(card, x, top, w, y, 44);
  }

  private layoutArrival(card: Phaser.GameObjects.Container, m: PanelModel): void {
    const x = 100, w = 1240, top = 72, copyWidth = 900;
    let y = this.eyebrow(card, m, x, top, copyWidth);
    y = this.titleWithAccent(card, m, x, y - 12, 48);
    y += this.text(card, 'body', m.body, x, y, { fontSize: fontPx(22), wordWrap: { width: copyWidth, useAdvancedWrap: true } }).height + 12;
    const stats = m.stats.map(s => `${s.label}  ${s.value}`).join('     ·     ');
    y += this.text(card, 'label', stats, x, y, { fontSize: fontPx(18) }, CSS.gold).height;
    m.actions.forEach((a, i) => {
      const b = new Button(this.scene, { id: a.id, label: a.label, kind: a.kind, width: 280, size: 'sm' });
      b.setPosition(x + w - 280, top + 18 + i * 70);
      b.onPress = () => this.session.dispatch(a.id, 'pointer');
      card.add(b); this.buttons.push(b);
    });
    this.finish(card, x, top, w, Math.max(y, top + 140), 24);
  }
}
