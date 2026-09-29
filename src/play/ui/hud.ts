import Phaser from 'phaser';
import { COLOR, CSS, RADIUS, textStyle } from '../theme';
import { box, glyph, heart } from './kit/draw';
import { KeyChip } from './kit/chip';
import type { HudModel, HudStep, LifeCard, Meter } from './models';

const TOP = 72;
const CARD_H = 108;

const STEP_COLOR: Record<HudStep['state'], number> = { active: COLOR.gold, done: COLOR.green, optional: COLOR.dim, '': COLOR.line };

/** The three cards along the top of the screen: what keeps you going, what to do next, and the clock. */
export class HudCards extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly lifeG: Phaser.GameObjects.Graphics;
  private readonly lifeLabel: Phaser.GameObjects.Text;
  private readonly lifeText: Phaser.GameObjects.Text;
  private readonly lifeNote: Phaser.GameObjects.Text;
  private readonly lifeExtra: Phaser.GameObjects.Text;
  private readonly lifeExtra2: Phaser.GameObjects.Text;
  private readonly ammoChip: KeyChip;
  private readonly objLabel: Phaser.GameObjects.Text;
  private readonly objText: Phaser.GameObjects.Text;
  private readonly route: Phaser.GameObjects.Text;
  private readonly stepsG: Phaser.GameObjects.Graphics;
  private readonly scoreLabel: Phaser.GameObjects.Text;
  private readonly time: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text;
  private lifeKey = '';
  private objKey = '';
  private frameKey = '';

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const label = (c: string = CSS.gold) => scene.add.text(0, 0, '', { ...textStyle('label', c), fontSize: '17px' });
    this.frame = scene.add.graphics();
    this.lifeG = scene.add.graphics();
    this.lifeLabel = label();
    this.lifeText = scene.add.text(0, 0, '', { ...textStyle('display', CSS.paper), fontSize: '30px' });
    this.lifeNote = scene.add.text(0, 0, '', { ...textStyle('small', CSS.dim), fontSize: '15px' });
    this.lifeExtra = scene.add.text(0, 0, '', { ...textStyle('label', CSS.paper), fontSize: '19px' });
    this.lifeExtra2 = scene.add.text(0, 0, '', { ...textStyle('label', CSS.paper), fontSize: '19px' });
    this.ammoChip = new KeyChip(scene, 'I');
    this.objLabel = label();
    this.objText = scene.add.text(0, 0, '', { ...textStyle('display', CSS.paper), fontSize: '30px', wordWrap: { width: 560 } });
    this.route = scene.add.text(0, 0, '', { ...textStyle('small', CSS.dim), fontSize: '15px' });
    this.stepsG = scene.add.graphics();
    this.scoreLabel = label();
    this.time = scene.add.text(0, 0, '', { ...textStyle('display', CSS.paper), fontSize: '40px' });
    this.score = scene.add.text(0, 0, '', { ...textStyle('display', CSS.gold), fontSize: '40px' });
    this.add([this.frame, this.lifeG, this.lifeLabel, this.lifeText, this.lifeNote, this.lifeExtra, this.lifeExtra2, this.ammoChip, this.objLabel, this.objText, this.route, this.stepsG, this.scoreLabel, this.time, this.score]);
    scene.add.existing(this);
  }

  update(model: HudModel, width: number): void {
    this.setVisible(model.visible);
    if (!model.visible) return;
    const left = 20, right = width - 20, cw = 320, mid = Math.round((width - 620) / 2);
    const frameKey = `${width}`;
    if (frameKey !== this.frameKey) {
      this.frameKey = frameKey;
      this.frame.clear();
      for (const [x, w, h] of [[left, cw, CARD_H], [mid, 620, CARD_H + 8], [right - 300, 300, CARD_H]] as const) {
        box(this.frame, x, TOP, w, h, { fill: COLOR.panel, fillAlpha: 0.9, border: COLOR.goldDeep, borderAlpha: 0.7, borderWidth: 1.5, radius: RADIUS.panel, shadow: 14 });
      }
    }
    this.drawLife(model.life, left + 20, TOP);
    this.drawObjective(model, mid + 22, TOP);
    this.scoreLabel.setText(model.score.label).setPosition(right - 300 + 22, TOP + 14);
    this.time.setText(model.score.time).setPosition(right - 300 + 22, TOP + 44);
    this.score.setText(model.score.value).setPosition(right - 300 + 22 + this.time.width + 22, TOP + 44);
  }

  private drawLife(life: LifeCard, x: number, y: number): void {
    const key = JSON.stringify(life);
    if (key === this.lifeKey) return;
    this.lifeKey = key;
    const g = this.lifeG;
    g.clear();
    this.lifeLabel.setText(life.label).setPosition(x, y + 14);
    for (const t of [this.lifeText, this.lifeNote, this.lifeExtra, this.lifeExtra2]) t.setText('');
    this.ammoChip.setVisible(false);
    if (life.kind === 'health') {
      for (let i = 0; i < life.hearts.max; i++) {
        const full = i < life.hearts.filled;
        heart(g, x + 16 + i * 40, y + 56, 15, full ? COLOR.red : COLOR.line, full ? 1 : 0.55);
      }
      if (life.ammo) {
        this.ammoChip.setVisible(true).setPosition(x, y + 78);
        pips(g, x + this.ammoChip.width + 12, y + 80, life.ammo.rounds, COLOR.gold, 12, 20, 6);
        if (life.ammo.callHint) this.lifeNote.setText(life.ammo.callHint).setPosition(x + this.ammoChip.width + 12 + life.ammo.rounds.max * 18 + 8, y + 82);
      }
    } else if (life.kind === 'cargo') {
      const color = life.cargo === 'carried' ? COLOR.gold : life.cargo === 'stashed' ? COLOR.greenHi : COLOR.dim;
      this.lifeText.setText(life.status).setColor(`#${color.toString(16).padStart(6, '0')}`).setPosition(x, y + 40);
      if (life.sneak) this.lifeNote.setText(life.sneak).setPosition(x, y + 78);
    } else {
      this.lifeText.setText(life.crates).setColor(CSS.paper).setPosition(x, y + 38);
      if (life.carrying) this.lifeNote.setText(life.carrying).setPosition(x + this.lifeText.width + 12, y + 50);
      this.lifeExtra.setText(life.car.label).setPosition(x, y + 78);
      pips(g, x + this.lifeExtra.width + 10, y + 80, life.car, COLOR.greenHi, 9, 16, 4);
      if (life.noise) {
        const nx = x + this.lifeExtra.width + 10 + life.car.max * 13 + 22;
        this.lifeExtra2.setText(life.noise.label).setPosition(nx, y + 78);
        pips(g, nx + this.lifeExtra2.width + 10, y + 80, life.noise, COLOR.red, 9, 16, 4);
      }
    }
  }

  private drawObjective(model: HudModel, x: number, y: number): void {
    const key = JSON.stringify(model.objective);
    if (key === this.objKey) return;
    this.objKey = key;
    const o = model.objective;
    this.objLabel.setText(o.label).setPosition(x, y + 14);
    this.objText.setText(o.text).setPosition(x, y + 38);
    const g = this.stepsG;
    g.clear();
    const rowY = y + 88;
    o.steps.forEach((step, i) => {
      const cx = x + 14 + i * 58;
      if (i > 0) { g.lineStyle(3, STEP_COLOR[o.steps[i - 1].state === 'done' ? 'done' : ''], 0.7); g.lineBetween(cx - 58 + 16, rowY, cx - 16, rowY); }
      const color = STEP_COLOR[step.state];
      g.fillStyle(color, step.state === '' ? 0.25 : 0.28); g.fillCircle(cx, rowY, 15);
      g.lineStyle(2.5, color, step.state === '' ? 0.6 : 1); g.strokeCircle(cx, rowY, 15);
      glyph(g, step.icon === '✓' ? 'check' : step.icon === '★' ? 'star' : step.icon === '✚' ? 'plus' : 'ask', cx, rowY, 15, color);
    });
    this.route.setText(o.routeName).setPosition(x + 14 + o.steps.length * 58 + 4, rowY - 9);
  }
}

/** A row of `filled` lit pips out of `max`. */
function pips(g: Phaser.GameObjects.Graphics, x: number, y: number, m: Meter, color: number, w: number, h: number, gap: number): void {
  for (let i = 0; i < m.max; i++) {
    const lit = i < m.filled;
    g.fillStyle(lit ? color : COLOR.line, lit ? 1 : 0.4);
    g.fillRoundedRect(x + i * (w + gap), y, w, h, 3);
  }
}
