import Phaser from 'phaser';
import { getLang } from '../../side/i18n';
import { paletteFor } from '../../side/palettes';
import { isRetro } from '../../side/pixel';
import { Sfx } from '../audio/sfx';
import { FONT } from '../fonts';
import { fontPx } from '../theme';
import { formatTime } from '../ui/text';
import { addRetroImage } from '../world/retro-shader';
import { FRIENDS, PLACES, SURPRISES, TEACHER, type Words } from './games/kurragomma';
import { HideRun, type Spot } from './hide-run';
import { paintHead } from './kids';
import { FamilySurface } from './surface';
import { familyText as t } from './text';
import { GROUND, TEACHER_X, drawYard } from './yard-art';
import { musicOf } from '../audio/music';

// Carl-Ottos spel 2: Kurragömma. The yard is drawn like the ride (480 × 270 in the retro build, through the palette
// shader); the interface is canvas buttons with DOM counterparts, as everywhere in the collection. Speech bubbles float
// over the yard from a small pool of reusable objects, so a busy moment never creates new ones.

const DIV = isRetro() ? 3 : 1;
/** World pixels to interface pixels: the 960-wide world fills the 1440-wide interface. */
const K = 1.5;
const words = (w: Words) => w[getLang()];
const SURPRISE_SOUND: Record<string, string> = { cat: 'meow', hedgehog: 'snuffle', cushion: 'prrrt', glasses: 'twinkle', sock: 'boing', snail: 'boing' };

interface Bubble { text: string; x: number; y: number; until: number; tone: 'friend' | 'surprise' | 'teacher' | 'giggle' | 'look' }
interface Slot { g: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }

export class HideScene extends FamilySurface {
  run = new HideRun();
  frozen = false;
  private texture!: Phaser.Textures.CanvasTexture;
  private held = new Set<string>();
  private touches = new Map<number, string>();
  private bubbles: Bubble[] = [];
  private pool: Slot[] = [];
  private big!: Phaser.GameObjects.Text;
  private status!: HTMLElement;
  private sfx!: Sfx;
  private clock = 0;
  private cam = 0;
  private lastMode = '';
  private lastNear: Spot | null = null;
  private lastFound = 0;
  private autoLook: Spot | null = null;

  constructor() { super('Hide'); }

  create(): void {
    this.run = new HideRun(); this.frozen = false; this.held.clear(); this.touches.clear(); this.bubbles = [];
    this.lastMode = ''; this.lastNear = null; this.lastFound = 0; this.autoLook = null; this.clock = 0;
    this.sfx = new Sfx(this.game.sound);
    if (this.textures.exists('hide-world')) this.textures.remove('hide-world');
    this.texture = this.textures.createCanvas('hide-world', 1440 / DIV, 810 / DIV)!;
    if (isRetro()) addRetroImage(this, 'hide-world', 0, 0, 1440, 810, () => paletteFor('yard'));
    else this.add.image(0, 0, 'hide-world').setOrigin(0);
    this.makeFaces();
    this.pool = Array.from({ length: 10 }, () => ({ g: this.add.graphics().setDepth(40), text: this.add.text(0, 0, '', this.style(24, '#25473f')).setDepth(41) }));
    this.big = this.add.text(720, 300, '', { ...this.style(120, '#fff7df', true), stroke: '#25473f', strokeThickness: 12 }).setOrigin(0.5).setDepth(42);
    this.setup();
    musicOf(this.game).play('hide');

    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (!['a', 'd', 'e', 'm', 'arrowleft', 'arrowright', 'escape', 'enter', ' '].includes(key)) return;
      e.stopPropagation();
      if ((key === 'enter' || key === ' ') && document.activeElement instanceof HTMLButtonElement) return;
      if (e.repeat && key !== 'arrowleft' && key !== 'arrowright' && key !== 'a' && key !== 'd') return;
      if (key === 'm') { this.toggleSound(); return; }
      if (key === 'escape') { this.togglePause(); return; }
      if (key === 'enter' || key === ' ' || key === 'e') { this.primary(); return; }
      this.held.add(key); this.autoLook = null;
    };
    const up = (e: KeyboardEvent) => { e.stopPropagation(); this.held.delete(e.key.toLowerCase()); };
    const blur = () => { this.run.pause(); this.changed(); };
    const release = (p: Phaser.Input.Pointer) => this.touches.delete(p.id);
    const tap = (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (!over.length) this.tapWorld(p); };
    this.input.keyboard?.on('keydown', down); this.input.keyboard?.on('keyup', up);
    this.input.on('pointerup', release); this.input.on('pointerupoutside', release); this.input.on('pointerdown', tap);
    this.game.events.on(Phaser.Core.Events.BLUR, blur); this.game.events.on(Phaser.Core.Events.HIDDEN, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', down); this.input.keyboard?.off('keyup', up);
      this.input.off('pointerup', release); this.input.off('pointerupoutside', release); this.input.off('pointerdown', tap);
      this.game.events.off(Phaser.Core.Events.BLUR, blur); this.game.events.off(Phaser.Core.Events.HIDDEN, blur);
      this.held.clear(); this.touches.clear(); this.textures.remove('hide-world');
    });
    this.paint();
  }

  private style(size: number, color: string, title = false): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: isRetro() ? (title ? FONT.pixelTitle : FONT.pixel) : title ? FONT.display : FONT.body, fontSize: fontPx(size), fontStyle: isRetro() ? '400' : title ? '700' : '500', color, resolution: isRetro() ? 1 : 2, align: 'center' };
  }

  /** A small portrait of each friend for the top bar. */
  private makeFaces(): void {
    for (const f of FRIENDS) {
      const key = `face-${f.id}`;
      if (this.textures.exists(key)) continue;
      const tex = this.textures.createCanvas(key, 64, 64)!;
      const c = tex.context; c.save(); c.translate(30, 36); c.scale(1.45, 1.45); paintHead(c, 0, 0, f.look, { mouth: 'grin' }); c.restore(); tex.refresh();
    }
  }

  /** Space, Enter or E: whatever the big button does right now. */
  private primary(): void {
    const g = this.run;
    if (g.mode === 'ready' || g.mode === 'won') g.start();
    else if (g.mode === 'counting') g.skipCount();
    else if (g.mode === 'paused') g.resume();
    else if (g.mode === 'seeking') { g.look(); this.autoLook = null; }
    this.changed();
  }

  private togglePause(): void {
    if (this.run.mode === 'seeking' || this.run.mode === 'counting') this.run.pause(); else if (this.run.mode === 'paused') this.run.resume();
    this.changed();
  }

  /** A tap in the yard: walk to the hiding place there, and look once Carl-Otto arrives. */
  private tapWorld(p: Phaser.Input.Pointer): void {
    if (this.run.mode !== 'seeking') return;
    const ui = p.x / this.cameras.main.zoom, uy = p.y / this.cameras.main.zoom;
    if (uy < 130) return;
    const wx = this.cam + ui / K;
    const spot = this.run.spots.filter(s => !s.opened && Math.abs(s.x - wx) < 110).sort((a, b) => Math.abs(a.x - wx) - Math.abs(b.x - wx))[0];
    if (spot) { this.run.walkTo(spot); this.autoLook = spot; }
    else { this.run.target = Math.max(60, wx); this.autoLook = null; }
  }

  private changed(): void {
    this.held.clear(); this.touches.clear(); this.rebuild(); this.lastMode = this.run.mode; this.lastNear = this.run.near; this.lastFound = this.run.runners.length;
    const focus = this.run.mode === 'seeking' ? null : this.root.querySelector<HTMLButtonElement>('[data-family="hide-primary"]');
    focus?.focus({ preventScroll: true });
  }

  protected build(): void {
    const g = this.run;
    document.title = `${t('hideTitle')} · ${t('carl')}`; document.documentElement.lang = getLang();
    this.mirror('h1', `${t('carl')} · ${t('hideTitle')}`);
    this.panel(28, 24, 1384, 99, 0xfff8e5, 22, 0.96);
    this.label(t('carl'), 55, 39, 20, '#67715d', undefined, true);
    this.label(t('hideTitle'), 54, 67, 31, '#25473f', undefined, true);
    this.label(t('friends'), 370, 32, 16, '#67715d', undefined, true);
    FRIENDS.forEach((f, i) => {
      const found = g.found.some(x => x.id === f.id), x = 370 + i * 96;
      const img = this.add.image(x, 52, `face-${f.id}`).setOrigin(0).setDisplaySize(52, 52).setAlpha(found ? 1 : 0.28);
      this.layer.add(img);
      this.label(found ? f.name : '?', x + 26 - (found ? f.name.length * 5 : 5), 100, 16, found ? '#25473f' : '#8a8f80');
    });
    this.button('hide-menu', t('back'), 1170, 45, 217, () => this.scene.start('Hub'), true);
    if (g.mode === 'seeking') this.button('hide-pause', t('pause'), 1001, 45, 145, () => this.togglePause(), true);
    this.status = this.mirror('p', '', 'hide-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.mode === 'seeking') {
      this.panel(28, 739, 1000, 47, 0xfff8e5, 16, 0.92);
      this.label(t('seekKeys'), 49, 750, 20, '#3e5948', undefined, true);
      this.pad();
      if (g.near) this.button('hide-look', t('look'), 1150, 560, 250, () => { this.run.look(); this.changed(); });
    } else if (g.mode === 'counting') {
      this.panel(28, 739, 520, 47, 0xfff8e5, 16, 0.92);
      this.label(t('skipCount'), 49, 750, 20, '#3e5948', undefined, true);
      this.button('hide-primary', t('here'), 1040, 720, 360, () => { this.run.skipCount(); this.changed(); });
    } else this.overlay();
  }

  private overlay(): void {
    const g = this.run, won = g.mode === 'won', ready = g.mode === 'ready';
    const title = ready ? t('hideTitle') : won ? t('foundAll') : t('hidePaused');
    const body = ready ? t('hideInstructions') : won ? `${t('foundAllBody')} ${t('tookTime').replace('{time}', formatTime(g.elapsed))}` : t('hidePausedBody');
    const y = won ? 150 : 190, h = ready ? 370 : won ? 250 : 270;
    this.panel(330, y, 780, h, 0xfff7df, 28, 0.98);
    this.label(ready ? `${t('second')} · ${t('carl')}` : t('carl'), 373, y + 26, 20, '#8f653b', undefined, true);
    this.label(title, 372, y + 58, 51, '#294d3e', 690, true);
    this.label(body, 374, y + 128, 23, '#58674f', 684);
    if (ready) this.label(t('hideHint'), 374, y + 236, 20, '#946137', 670);
    this.button('hide-primary', ready ? t('countStart') : won ? t('seekAgain') : t('resume'), 374, y + h - 84, 300, () => this.primary());
    this.mirror('h2', title, 'hide-panel-title'); this.mirror('p', body);
    if (ready) this.mirror('p', t('hideHint'));
  }

  /** Big touch targets: walk left and right (a tap in the yard also works). */
  private pad(): void {
    for (const [key, glyph, x] of [['arrowleft', '◀', 1150], ['arrowright', '▶', 1320]] as const) {
      this.panel(x, 660, 80, 72, 0xfff8e5, 18, 0.93);
      this.label(glyph, x + 26, 676, 34, '#315846', undefined, true);
      const zone = this.add.zone(x, 660, 80, 72).setOrigin(0).setInteractive(); this.layer.add(zone);
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => { this.touches.set(p.id, key); this.autoLook = null; });
      zone.on('pointerout', (p: Phaser.Input.Pointer) => this.touches.delete(p.id));
    }
  }

  // ---------------------------------------------------------------- the running game

  private say(text: string, x: number, y: number, tone: Bubble['tone'], seconds = 2.6): void {
    this.bubbles = this.bubbles.filter(b => !(b.tone === tone && Math.abs(b.x - x) < 40));
    this.bubbles.push({ text, x, y, until: this.clock + seconds, tone });
  }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }

  private react(): void {
    const g = this.run;
    for (const e of g.events.splice(0)) {
      if (e === 'count') this.sfx.play('tick');
      else if (e === 'go') { this.sfx.play('ready'); this.say(t('here'), g.x, GROUND - 170, 'friend'); }
      else if (e === 'giggle') this.sfx.play('giggle');
      else if (e === 'cheer') this.sfx.play('cheer');
      else if (e === 'won') this.sfx.play('victory');
      else if (e.startsWith('found:')) {
        const spot = g.spots.find(s => s.friend?.id === e.slice(6))!, place = PLACES.find(p => p.kind === spot.kind)!;
        this.sfx.play('found');
        this.say(`${spot.friend!.name}: ${words(place.found)}`, spot.x + 40, GROUND - 190, 'friend', 3.2);
        this.announce((g.left ? t('foundStatus') : t('foundLast')).replace('{name}', spot.friend!.name).replace('{n}', String(g.left)));
      } else if (e.startsWith('surprise:')) {
        const kind = e.slice(9), spot = g.spots.find(s => s.surprise === kind && s.opened)!;
        this.sfx.play(SURPRISE_SOUND[kind] ?? 'boing');
        const line = words(SURPRISES.find(s => s.kind === kind)!.line);
        this.say(line, spot.x + 40, GROUND - 120, 'surprise', 3);
        this.announce(line);
      }
    }
  }

  step(dt: number): void {
    this.clock += dt;
    const g = this.run;
    const active = new Set([...this.held, ...this.touches.values()]);
    const dir = Number(active.has('d') || active.has('arrowright')) - Number(active.has('a') || active.has('arrowleft'));
    g.update(dt, dir);
    if (this.autoLook && g.near === this.autoLook && !g.walking && g.target === null) { g.look(); this.autoLook = null; }
    this.react();
    if (g.mode !== this.lastMode || g.near !== this.lastNear || g.runners.length !== this.lastFound) this.changed();
    this.paint();
    this.drawBubbles();
    musicOf(this.game).setDucked(g.mode === 'paused');
  }

  update(_time: number, delta: number): void { if (!this.frozen) this.step(Math.min(0.05, delta / 1000)); }

  private paint(): void {
    const c = this.texture.context;
    c.save(); c.scale(1.5 / DIV, 1.5 / DIV); this.cam = drawYard(c, this.run, this.clock); c.restore();
    this.texture.refresh();
  }

  /** Speech bubbles, the giggles, the teacher's hint and the "Titta!" marker, positioned over the yard. */
  private drawBubbles(): void {
    const g = this.run, live: Bubble[] = this.bubbles.filter(b => b.until > this.clock);
    this.bubbles = live;
    const extra: Bubble[] = [];
    if (g.mode === 'seeking') {
      for (const s of g.spots) if (s.giggling > 0) extra.push({ text: t('hihi'), x: s.x + 20, y: GROUND - 150, until: 0, tone: 'giggle' });
      if (g.hint) extra.push({ text: words(TEACHER.hint), x: TEACHER_X + 20, y: GROUND - 250, until: 0, tone: 'teacher' });
      if (g.near) extra.push({ text: t('look'), x: g.near.x, y: GROUND - 205, until: 0, tone: 'look' });
    }
    const shown = [...live, ...extra];
    this.big.setText(g.mode === 'counting' ? String(Math.max(1, g.count + 1)) : '').setVisible(g.mode === 'counting');
    this.pool.forEach((slot, i) => {
      const b = shown[i];
      slot.g.clear();
      if (!b) { slot.text.setVisible(false); return; }
      slot.text.setText(b.text).setVisible(true).setWordWrapWidth(360, true);
      const w = Math.ceil(slot.text.width) + 32, h = Math.ceil(slot.text.height) + 20;
      const cx = Math.round(Math.max(w / 2 + 10, Math.min(1430 - w / 2, (b.x - this.cam) * K))), top = Math.round(Math.max(130, b.y * K - h));
      const fill = b.tone === 'look' ? 0x2a5a4b : b.tone === 'teacher' ? 0xfff0b8 : 0xffffff;
      slot.g.fillStyle(0x1d3326, 0.25).fillRoundedRect(cx - w / 2 + 4, top + 5, w, h, 12);
      slot.g.fillStyle(fill, 1).fillRoundedRect(cx - w / 2, top, w, h, 12).lineStyle(3, 0x25473f, 1).strokeRoundedRect(cx - w / 2, top, w, h, 12);
      slot.g.fillStyle(fill, 1).fillTriangle(cx - 10, top + h - 2, cx + 10, top + h - 2, cx, top + h + 14);
      slot.text.setColor(b.tone === 'look' ? '#fff7df' : '#25473f').setPosition(Math.round(cx - slot.text.width / 2), top + 10);
    });
  }
}
