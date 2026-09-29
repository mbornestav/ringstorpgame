import Phaser from 'phaser';
import { COLOR, CSS, RADIUS, UI_H, UI_W, textStyle } from '../theme';
import { box, glyph } from './kit/draw';
import type { RouteMarker, WorldHudModel } from './models';

const MARKER_COLOR: Record<RouteMarker['kind'], Record<RouteMarker['state'], number>> = {
  crew: { open: COLOR.red, active: 0xffd166, done: 0x5b6b6b },
  package: { open: 0xdfad59, active: 0xdfad59, done: 0xdfad59 },
  marcus: { open: 0x6fd08c, active: 0x6fd08c, done: COLOR.green },
  shop: { open: COLOR.greenHi, active: COLOR.greenHi, done: COLOR.green },
  junction: { open: COLOR.greenHi, active: COLOR.greenHi, done: COLOR.greenHi },
  home: { open: COLOR.yellow, active: COLOR.yellow, done: COLOR.yellow },
};

const STRIP_W = 820;
const STRIP_X = Math.round((UI_W - STRIP_W) / 2);
// The walking lanes end at y 744, so the strip is slim and sits as low as the controls row below it allows.
const STRIP_Y = UI_H - 84;

/** What the old canvas drew over the game: the message toast, GO arrow, POLIS badge, boss bar and route strip. */
export class WorldHud extends Phaser.GameObjects.Container {
  private readonly toastG: Phaser.GameObjects.Graphics;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly portrait: Phaser.GameObjects.Image | null;
  private readonly goG: Phaser.GameObjects.Graphics;
  private readonly goText: Phaser.GameObjects.Text;
  private readonly polis: Phaser.GameObjects.Container;
  private readonly polisLights: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly barLabel: Phaser.GameObjects.Text;
  private readonly routeLabel: Phaser.GameObjects.Text;
  private toastKey = '';

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.toastG = scene.add.graphics();
    this.toastText = scene.add.text(0, 0, '', { ...textStyle('body', CSS.paper), fontSize: '25px', align: 'center', wordWrap: { width: 760, useAdvancedWrap: true } }).setOrigin(0.5, 0);
    this.portrait = scene.textures.exists('dd-portrait') ? scene.add.image(0, 0, 'dd-portrait').setOrigin(0, 0.5) : null;
    this.goG = scene.add.graphics();
    this.goText = scene.add.text(UI_W - 230, 300, '', { ...textStyle('title', CSS.gold), fontSize: '92px' });
    this.polisLights = scene.add.graphics();
    const polisBox = scene.add.graphics();
    box(polisBox, 0, 0, 200, 56, { fill: 0x101c33, fillAlpha: 0.92, border: 0x5aa2ff, borderWidth: 2, radius: RADIUS.button, shadow: 8 });
    const polisText = scene.add.text(100, 28, 'POLIS', { ...textStyle('display', '#f2d31b'), fontSize: '30px' }).setOrigin(0.5, 0.5);
    this.polis = scene.add.container(20, 214, [polisBox, this.polisLights, polisText]);
    this.bar = scene.add.graphics();
    this.barLabel = scene.add.text(STRIP_X + 24, STRIP_Y - 4, '', { ...textStyle('label', CSS.gold), fontSize: '19px' });
    this.routeLabel = scene.add.text(STRIP_X + STRIP_W - 24, STRIP_Y + 18, '', { ...textStyle('small', CSS.paper), fontSize: '16px' }).setOrigin(1, 0.5);
    this.add([this.toastG, this.toastText, ...(this.portrait ? [this.portrait] : []), this.goG, this.goText, this.polis, this.bar, this.barLabel, this.routeLabel]);
    scene.add.existing(this);
  }

  /** `seconds` is the scene's own running clock, for blinking; the models leave animation to us. */
  update(m: WorldHudModel, seconds: number): void {
    this.drawToast(m);
    const on = m.go !== null && Math.floor(seconds * 4) % 2 === 0;
    this.goText.setText(on ? m.go!.label : '');
    this.goG.clear();
    if (on) {
      this.goG.fillStyle(COLOR.ink, 1).fillTriangle(UI_W - 74, 316, UI_W - 30, 346, UI_W - 74, 378);
      this.goG.fillStyle(0xef7a58, 1).fillTriangle(UI_W - 80, 310, UI_W - 38, 340, UI_W - 80, 372);
    }
    this.polis.setVisible(m.polis);
    if (m.polis) {
      const phase = Math.floor(seconds * 6) % 2;
      this.polisLights.clear();
      this.polisLights.fillStyle(phase ? 0x5aa2ff : 0x1d3566, 1).fillCircle(24, 28, 9);
      this.polisLights.fillStyle(phase ? 0x1d3566 : 0x5aa2ff, 1).fillCircle(176, 28, 9);
    }
    this.drawBottom(m);
  }

  private drawToast(m: WorldHudModel): void {
    const toast = m.toast;
    this.toastText.setVisible(!!toast);
    this.toastG.setVisible(!!toast);
    this.portrait?.setVisible(!!toast && toast.fromDD);
    if (!toast) { this.toastKey = ''; return; }
    const key = `${toast.text}|${toast.fromDD}`;
    if (key !== this.toastKey) {
      this.toastKey = key;
      this.toastText.setText(toast.text);
      const w = Math.min(UI_W - 60, this.toastText.width + 64), h = this.toastText.height + 34;
      const x = Math.round((UI_W - w) / 2), y = 212;
      this.toastG.clear();
      box(this.toastG, x, y, w, h, { fill: COLOR.panel, fillAlpha: 0.94, border: COLOR.gold, borderWidth: 2, radius: RADIUS.panel, shadow: 16 });
      this.toastText.setPosition(UI_W / 2, y + 17);
      if (this.portrait) {
        this.portrait.setPosition(x - 106, y + h / 2).setScale(1.25);
        this.portrait.setVisible(toast.fromDD);
      }
    }
    this.setAlphaOf(toast.alpha);
  }

  private setAlphaOf(alpha: number): void {
    this.toastG.setAlpha(alpha);
    this.toastText.setAlpha(alpha);
    this.portrait?.setAlpha(alpha);
  }

  /** The boss bar or the route strip, whichever applies; they share the same place. */
  private drawBottom(m: WorldHudModel): void {
    const g = this.bar;
    g.clear();
    this.barLabel.setText('');
    this.routeLabel.setText('');
    if (m.boss) {
      box(g, STRIP_X, STRIP_Y - 14, STRIP_W, 60, { fill: COLOR.panel, fillAlpha: 0.9, border: COLOR.goldDeep, borderAlpha: 0.7, borderWidth: 1.5, radius: RADIUS.panel, shadow: 12 });
      this.barLabel.setText(m.boss.label);
      const x = STRIP_X + 24, w = STRIP_W - 48, y = STRIP_Y + 24;
      g.fillStyle(0x273942, 1).fillRoundedRect(x, y, w, 10, 5);
      g.fillStyle(COLOR.red, 1).fillRoundedRect(x, y, Math.max(6, w * m.boss.ratio), 10, 5);
      g.fillStyle(0xf5a08e, 0.9).fillRoundedRect(x, y, Math.max(6, w * m.boss.ratio), 4, 2);
      return;
    }
    if (!m.route) return;
    const r = m.route, x0 = STRIP_X + 26, x1 = STRIP_X + STRIP_W - 250, y = STRIP_Y + 19;
    box(g, STRIP_X, STRIP_Y, STRIP_W, 38, { fill: COLOR.panel, fillAlpha: 0.88, border: COLOR.goldDeep, borderAlpha: 0.6, borderWidth: 1.5, radius: RADIUS.panel, shadow: 12 });
    g.lineStyle(3, 0x58716d, 1).lineBetween(x0, y, x1, y);
    g.lineStyle(3, 0xedc278, 1).lineBetween(x0, y, x0 + (x1 - x0) * r.player, y);
    for (const marker of r.markers) {
      const mx = x0 + (x1 - x0) * marker.at, color = MARKER_COLOR[marker.kind][marker.state];
      if (marker.kind === 'crew') { g.fillStyle(color, 1).fillRoundedRect(mx - 5, y - 5, 10, 10, 2); }
      else if (marker.kind === 'package') { g.fillStyle(color, 1).fillRoundedRect(mx - 7, y - 7, 14, 14, 3); }
      else if (marker.kind === 'marcus' || marker.kind === 'shop') glyph(g, 'plus', mx, y, 16, color);
      else if (marker.kind === 'junction') { g.lineStyle(3, color, 1).lineBetween(mx - 9, y - 12, mx, y); g.fillStyle(color, 1).fillRoundedRect(mx - 12, y - 15, 8, 8, 2); }
      else { glyph(g, 'star', mx, y, 20, color); }
    }
    const px = x0 + (x1 - x0) * r.player;
    g.fillStyle(COLOR.sky, 1).fillTriangle(px - 8, y - 20, px + 8, y - 20, px, y - 8);
    this.routeLabel.setText(r.label);
  }
}
