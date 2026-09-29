import Phaser from 'phaser';
import type { Session } from '../session';
import { COLOR, CSS, MOTION, RADIUS, UI_H, UI_W, textStyle } from '../theme';
import { FONT } from '../fonts';
import { box } from './kit/draw';
import { Button } from './kit/button';
import type { PhoneModel } from './models';

const W = 640, H = 520;
const X = UI_W - W - 20, Y = UI_H - H - 96;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const LCD_INK = '#31441c';

/** The Ericsson GH337 handset, drawn as vectors with its green LCD, and the buttons beside it. */
export class PhoneDrawer extends Phaser.GameObjects.Container {
  readonly launcher: Button;
  readonly action: Button;
  readonly cancel: Button;
  readonly pocket: Button;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly handset: Phaser.GameObjects.Container;
  private readonly handsetG: Phaser.GameObjects.Graphics;
  private readonly lcd: Phaser.GameObjects.Text[];
  private readonly yes: Phaser.GameObjects.Zone;
  private readonly no: Phaser.GameObjects.Zone;
  private readonly wallet: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly rounds: Phaser.GameObjects.Text;
  private open = false;
  private lastKey = '';
  private yesEnabled = true;

  constructor(scene: Phaser.Scene, private readonly session: Session) {
    super(scene, X, Y + H + 40);
    this.panel = scene.add.graphics();
    box(this.panel, 0, 0, W, H, { fill: COLOR.panel, fillAlpha: 0.96, border: COLOR.goldDeep, borderAlpha: 0.9, borderWidth: 2, radius: RADIUS.panel + 4, shadow: 26 });
    this.handsetG = scene.add.graphics();
    const mono = (size: number, color = LCD_INK) => scene.add.text(0, 0, '', { fontFamily: FONT.mono, fontSize: `${size}px`, color, resolution: 3 });
    this.lcd = [mono(30), mono(16), mono(16)];
    this.handset = scene.add.container(34, 36, [this.handsetG, ...this.lcd]);
    this.handset.setScale(0.96);
    this.yes = scene.add.zone(24, 258, 68, 34).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.no = scene.add.zone(104, 258, 68, 34).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.handset.add([this.yes, this.no]);
    this.yes.on('pointerup', () => { if (this.yesEnabled) this.session.dispatch('phone-call', 'pointer'); });
    this.no.on('pointerup', () => this.session.dispatch('phone-away', 'pointer'));

    const cx = 258;
    this.wallet = scene.add.text(cx, 40, '', { ...textStyle('label', CSS.gold), fontSize: '22px' });
    this.hint = scene.add.text(cx, 84, '', { ...textStyle('body', CSS.paper), fontSize: '23px', wordWrap: { width: W - cx - 36, useAdvancedWrap: true }, lineSpacing: 6 });
    this.action = new Button(scene, { id: 'phone-call', label: '', kind: 'primary', size: 'sm' });
    this.cancel = new Button(scene, { id: 'phone-cancel', label: '', kind: 'secondary', size: 'sm' });
    this.pocket = new Button(scene, { id: 'phone-away', label: '', kind: 'ghost', size: 'sm' });
    this.rounds = scene.add.text(cx, 0, '', { ...textStyle('small', CSS.dim), fontSize: '16px' });
    this.action.onPress = () => this.session.dispatch('phone-call', 'pointer');
    this.cancel.onPress = () => this.session.dispatch('phone-cancel', 'pointer');
    this.pocket.onPress = () => this.session.dispatch('phone-away', 'pointer');
    this.add([this.panel, this.handset, this.wallet, this.hint, this.action, this.cancel, this.pocket, this.rounds]);
    this.setVisible(false).setAlpha(0);

    this.launcher = new Button(scene, { id: 'phone', label: '', kind: 'secondary', height: 52 });
    this.launcher.onPress = () => this.session.dispatch('phone', 'pointer');
    this.launcher.setVisible(false);
    scene.add.existing(this);
  }

  /** Focus ring for whichever phone control the DOM proxy holds. */
  setFocus(id: string | null): void {
    this.launcher.setFocused(id === 'phone');
    this.action.setFocused(id === 'phone-call' && this.open);
    this.cancel.setFocused(id === 'phone-cancel');
    this.pocket.setFocused(id === 'phone-away');
  }

  update(m: PhoneModel): void {
    this.launcher.setVisible(m.launcher.visible && !m.visible);
    if (m.key !== this.lastKey) {
      this.lastKey = m.key;
      this.launcher.set({ id: 'phone', label: `${m.launcher.name}  ·  ${m.launcher.cash}`, key: m.launcher.keyLabel, kind: 'secondary', height: 52 });
      this.launcher.setPosition(UI_W - 20 - this.launcher.width, 200);
      this.fill(m);
    }
    if (m.visible !== this.open) this.slide(m.visible);
  }

  private slide(open: boolean): void {
    this.open = open;
    this.scene.tweens.killTweensOf(this);
    if (open) {
      this.setVisible(true);
      this.scene.tweens.add({ targets: this, y: Y, alpha: 1, duration: MOTION.slow, ease: 'Cubic.easeOut' });
    } else {
      this.scene.tweens.add({ targets: this, y: Y + H + 40, alpha: 0, duration: MOTION.base, onComplete: () => { if (!this.open) this.setVisible(false); } });
    }
  }

  private fill(m: PhoneModel): void {
    this.wallet.setText(m.wallet.toUpperCase());
    this.hint.setText(m.hint);
    this.rounds.setText(m.rounds);
    this.yesEnabled = !m.action.disabled;
    const cx = 258;
    // The hint runs down from the top; the buttons stack up from the bottom, so neither can overlap however long the text is.
    this.rounds.setPosition(cx, 84 + this.hint.height + 14);
    this.pocket.set({ id: 'phone-away', label: m.pocketLabel, kind: 'ghost', size: 'sm' });
    this.pocket.setPosition(cx - 10, H - 20 - this.pocket.height);
    let top = this.pocket.y - 12;
    this.cancel.setVisible(m.cancel.visible);
    if (m.cancel.visible) {
      this.cancel.set({ id: 'phone-cancel', label: m.cancel.label, kind: 'secondary', size: 'sm' });
      this.cancel.setPosition(cx, top - this.cancel.height);
      top = this.cancel.y - 12;
    }
    this.action.set({ id: 'phone-call', label: m.action.label, kind: 'primary', size: 'sm', height: 60 }).setDisabled(m.action.disabled);
    this.action.setPosition(cx, top - 60);
    this.drawHandset(m);
  }

  private drawHandset(m: PhoneModel): void {
    const g = this.handsetG;
    g.clear();
    // Aerial and body.
    g.fillStyle(0x141b1c, 1).fillRoundedRect(20, 0, 26, 78, 6);
    g.fillStyle(0x3c4645, 1).fillRoundedRect(25, 4, 6, 68, 3);
    g.fillStyle(0x294b8a, 1).fillRect(20, 56, 26, 9);
    g.fillStyle(0x121a18, 1).fillRoundedRect(0, 52, 190, 430, 30);
    g.fillStyle(0x59625a, 1).fillRoundedRect(4, 56, 176, 422, 27);
    g.fillStyle(0x3b443d, 1).fillRoundedRect(10, 62, 166, 410, 22);
    g.fillStyle(0x1d2620, 0.6).fillRoundedRect(160, 60, 22, 414, 12);
    // Earpiece and name.
    for (let i = 0; i < 3; i++) g.fillStyle(0x141b17, 1).fillRoundedRect(58, 82 + i * 10, 76, 4, 2);
    // LCD: dark blue bezel, green glass with a lighter top-left edge.
    g.fillStyle(0x1a3456, 1).fillRoundedRect(20, 116, 154, 112, 8);
    g.fillStyle(0x9fae42, 1).fillRoundedRect(25, 121, 144, 102, 5);
    g.fillStyle(0x839634, 1).fillRect(25, 121, 144, 3);
    g.fillStyle(0xb2c04f, 0.35).fillRoundedRect(29, 126, 136, 30, 4);
    // Signal bars and battery.
    for (let i = 0; i < 4; i++) g.fillStyle(0x31441c, 1).fillRect(31 + i * 5, 141 - i * 3, 3, 3 + i * 3);
    g.fillStyle(0x31441c, 1).fillRect(143, 130, 20, 8);
    [this.lcd[0].setText(m.lcd.contact).setPosition(97 - this.lcd[0].width / 2, 148),
      this.lcd[1].setText(m.lcd.number).setPosition(97 - this.lcd[1].width / 2, 186),
      this.lcd[2].setText(m.lcd.status).setPosition(97 - this.lcd[2].width / 2, 204)];
    // YES and NO, the navigation keys and the keypad.
    const key = (x: number, y: number, w: number, h: number, label: string) => {
      g.fillStyle(0x0a100c, 1).fillRoundedRect(x, y, w, h, 7);
      g.fillStyle(0xa1b52f, 1).fillRoundedRect(x, y, w, h - 2, 7);
      g.fillStyle(this.yesEnabled || label !== 'YES' ? 0x2b352c : 0x3a3f39, 1).fillRoundedRect(x + 2, y + 2, w - 4, h - 7, 5);
      const t = this.keyLabel(label, x + w / 2, y + (h - 2) / 2);
      t.setColor(this.yesEnabled || label !== 'YES' ? '#d5dbb7' : '#7c8175');
    };
    this.clearKeyLabels();
    key(24, 258, 68, 34, 'YES'); key(104, 258, 68, 34, 'NO');
    key(24, 302, 44, 26, '<'); key(76, 302, 44, 26, 'CLR'); key(128, 302, 44, 26, '>');
    KEYS.forEach((k, i) => key(24 + (i % 3) * 52, 340 + Math.floor(i / 3) * 34, 44, 28, k));
    this.keyLabel('ERICSSON', 97, 480).setColor('#bec6be');
  }

  private keyLabels: Phaser.GameObjects.Text[] = [];
  private keyLabel(label: string, x: number, y: number): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, label, { fontFamily: FONT.mono, fontSize: label.length > 3 ? '17px' : '15px', color: '#d5dbb7', resolution: 3 }).setOrigin(0.5);
    this.handset.add(t);
    this.keyLabels.push(t);
    return t;
  }
  private clearKeyLabels(): void { for (const t of this.keyLabels) t.destroy(); this.keyLabels = []; }
}
