import Phaser from 'phaser';
import { getLang } from '../../side/i18n';
import { paletteFor } from '../../side/palettes';
import { isRetro } from '../../side/pixel';
import { Sfx } from '../audio/sfx';
import { musicOf } from '../audio/music';
import { FONT } from '../fonts';
import { fontPx } from '../theme';
import { formatTime } from '../ui/text';
import { addRetroImage } from '../world/retro-shader';
import { DINING, ITEMS, SOFA_X, SURPRISES, type SurpriseKind } from './games/filmkvall';
import type { Words } from './games/kurragomma';
import { GROUND, drawHome, paintIcon, topOf } from './home-art';
import { MovieRun, type Spot } from './movie-run';
import { Bubbles, type Bubble } from './seek-ui';
import { hungIn, markDone, readProgress } from './house';
import { wallPicture } from './wall-picture';
import { FamilySurface } from './surface';
import { familyText as t } from './text';

// Carl-Ottos spel 3: Filmkväll. The living room is drawn like the yard (480 × 270 in the retro build, through the palette
// shader); the interface is canvas buttons with DOM counterparts, as everywhere in the collection, and the speech bubbles
// are the ones Kurragömma uses.

const DIV = isRetro() ? 3 : 1;
/** World pixels to interface pixels: the 960-wide world fills the 1440-wide interface. */
const K = 1.5;
const words = (w: Words) => w[getLang()];
const SURPRISE_SOUND: Record<SurpriseKind, string> = { dustbunny: 'atjoo', sock: 'boing', puzzle: 'twinkle', dino: 'rawr', crayon: 'boing', dining: 'doors' };

export class MovieScene extends FamilySurface {
  run = new MovieRun();
  frozen = false;
  private texture!: Phaser.Textures.CanvasTexture;
  private held = new Set<string>();
  private touches = new Map<number, string>();
  private bubbles!: Bubbles;
  private status!: HTMLElement;
  private sfx!: Sfx;
  private clock = 0;
  private cam = 0;
  private lastMode = '';
  private lastNear: Spot | null = null;
  private lastThings = '';
  private autoLook: Spot | null = null;
  /** The picture Carl-Otto has chosen for the wall over the sofa (the newest, unless he chose another in the gallery). */
  private drawing: string | undefined;

  constructor() { super('Movie'); }

  create(): void {
    this.run = new MovieRun(); this.frozen = false; this.held.clear(); this.touches.clear();
    this.drawing = hungIn(readProgress(), 'living');
    this.lastMode = ''; this.lastNear = null; this.lastThings = ''; this.autoLook = null; this.clock = 0;
    this.sfx = new Sfx(this.game.sound);
    if (this.textures.exists('movie-world')) this.textures.remove('movie-world');
    this.texture = this.textures.createCanvas('movie-world', 1440 / DIV, 810 / DIV)!;
    if (isRetro()) addRetroImage(this, 'movie-world', 0, 0, 1440, 810, () => paletteFor('home'));
    else this.add.image(0, 0, 'movie-world').setOrigin(0);
    this.makeIcons();
    this.bubbles = new Bubbles(this, this.style(24, '#25473f'));
    this.setup();
    musicOf(this.game).play('movie');

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
      this.held.clear(); this.touches.clear(); this.textures.remove('movie-world');
    });
    this.paint();
  }

  private style(size: number, color: string, title = false): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: isRetro() ? (title ? FONT.pixelTitle : FONT.pixel) : title ? FONT.display : FONT.body, fontSize: fontPx(size), fontStyle: isRetro() ? '400' : title ? '700' : '500', color, resolution: isRetro() ? 1 : 2, align: 'center' };
  }

  /** A small picture of each thing for the top bar. */
  private makeIcons(): void {
    for (const item of ITEMS) {
      const key = `movie-icon-${item.id}`;
      if (this.textures.exists(key)) continue;
      const tex = this.textures.createCanvas(key, 64, 64)!;
      paintIcon(tex.context, item.id); tex.refresh();
    }
  }

  /** Space, Enter or E: whatever the big button does right now. */
  private primary(): void {
    const g = this.run;
    if (g.mode === 'ready' || g.mode === 'won') { g.start(); this.bubbles.clear(); }
    else if (g.mode === 'paused') g.resume();
    else if (g.mode === 'gathering') { g.look(); this.autoLook = null; }
    this.changed();
  }

  private togglePause(): void {
    if (this.run.mode === 'gathering') this.run.pause(); else if (this.run.mode === 'paused') this.run.resume();
    this.changed();
  }

  /** A tap in the room: walk to the hiding place there and look once Carl-Otto arrives, or walk to the sofa or the spot. */
  private tapWorld(p: Phaser.Input.Pointer): void {
    if (this.run.mode !== 'gathering') return;
    const ui = p.x / this.cameras.main.zoom, uy = p.y / this.cameras.main.zoom;
    if (uy < 130) return;
    const wx = this.cam + ui / K;
    const spot = this.run.spots.filter(s => !s.opened && Math.abs(s.x - wx) < 110).sort((a, b) => Math.abs(a.x - wx) - Math.abs(b.x - wx))[0];
    if (spot) { this.run.walkTo(spot.x); this.autoLook = spot; }
    else { this.run.walkTo(Math.abs(wx - SOFA_X) < 140 ? SOFA_X : wx); this.autoLook = null; }
  }

  /** What has been found and placed: when it changes, the top bar is redrawn. */
  private get things(): string { return `${this.run.carrying.map(c => c.item.id).join()}|${this.run.placed.map(p => p.item.id).join()}`; }

  private changed(): void {
    this.held.clear(); this.touches.clear(); this.rebuild();
    this.lastMode = this.run.mode; this.lastNear = this.run.near; this.lastThings = this.things;
    const focus = this.run.mode === 'gathering' || this.run.mode === 'watching' ? null : this.root.querySelector<HTMLButtonElement>('[data-family="movie-primary"]');
    focus?.focus({ preventScroll: true });
  }

  protected build(): void {
    const g = this.run;
    document.title = `${t('movieTitle')} · ${t('carl')}`; document.documentElement.lang = getLang();
    this.mirror('h1', `${t('carl')} · ${t('movieTitle')}`);
    this.panel(28, 24, 1384, 99, 0xfff8e5, 22, 0.96);
    this.label(t('carl'), 55, 39, 20, '#67715d', undefined, true);
    this.label(t('movieTitle'), 54, 67, 31, '#25473f', undefined, true);
    this.label(t('toSofa'), 370, 32, 16, '#67715d', undefined, true);
    // The five things: grey until found, brighter in his arms, full colour on the sofa.
    ITEMS.forEach((item, i) => {
      const placed = g.placed.some(p => p.item === item), carried = g.carrying.some(c => c.item === item), x = 370 + i * 100;
      const img = this.add.image(x, 52, `movie-icon-${item.id}`).setOrigin(0).setDisplaySize(52, 52).setAlpha(placed ? 1 : carried ? 0.7 : 0.25);
      this.layer.add(img);
      const name = placed || carried ? words(item.short) : '?';
      this.label(name, x + 26 - name.length * 5, 100, 16, placed ? '#25473f' : '#8a8f80');
    });
    this.button('movie-menu', t('toMap'), 1170, 45, 217, () => this.scene.start('House', { room: 'living' }), true);
    this.soundButton('movie-sound', 846);
    if (g.mode === 'gathering') this.button('movie-pause', t('pause'), 1001, 45, 145, () => this.togglePause(), true);
    this.status = this.mirror('p', '', 'movie-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.mode === 'gathering') {
      if (!this.touch) {
        this.panel(28, 739, 1000, 47, 0xfff8e5, 16, 0.92);
        this.label(t('seekKeys'), 49, 750, 20, '#3e5948', undefined, true);
      }
      this.walkPad(this.touches, () => { this.autoLook = null; });
      if (g.near) this.button('movie-look', t('look'), 1150, 560, 250, () => { this.run.look(); this.changed(); });
    } else if (g.mode !== 'watching') this.overlay();
  }

  private overlay(): void {
    const g = this.run, won = g.mode === 'won', ready = g.mode === 'ready';
    const title = ready ? t('movieTitle') : won ? t('movieDone') : t('moviePaused');
    const body = ready ? t('movieInstructions') : won ? `${t('movieDoneBody')} ${t('tookTime').replace('{time}', formatTime(g.elapsed))}` : t('moviePausedBody');
    // When the film is on, the panel sits low, under the TV and the sofa.
    const y = won ? 548 : ready ? 140 : 190, h = ready ? 450 : won ? 236 : 270;
    this.panel(330, y, 780, h, 0xfff7df, 28, 0.98);
    this.label(ready ? `${t('third')} · ${t('carl')}` : t('carl'), 373, y + 26, 20, '#8f653b', undefined, true);
    this.label(title, 372, y + 58, won ? 42 : 51, '#294d3e', 690, true);
    this.label(body, 374, won ? y + 112 : y + 128, won ? 21 : 23, '#58674f', 684);
    if (ready) this.label(t('movieHint'), 374, y + 296, 20, '#946137', 670);
    this.button('movie-primary', ready ? t('movieStart') : won ? t('lookAgain') : t('resume'), 374, y + h - 80, 300, () => this.primary());
    this.mirror('h2', title, 'movie-panel-title'); this.mirror('p', body);
    if (ready) this.mirror('p', t('movieHint'));
  }

  // ---------------------------------------------------------------- the running game

  private say(text: string, x: number, y: number, tone: Bubble['tone'], seconds = 2.6): void { this.bubbles.say(text, x, y, tone, this.clock + seconds); }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }

  private react(): void {
    const g = this.run;
    for (const e of g.events.splice(0)) {
      if (e === 'start') this.sfx.play('ready');
      else if (e === 'watch') { this.sfx.play('cheer'); this.bubbles.clear(); this.say(t('filmStarts'), SOFA_X, GROUND - 200, 'friend', 3); }
      else if (e === 'tv') this.sfx.play('tvon');
      else if (e === 'won') { this.sfx.play('victory'); markDone('filmkvall'); }
      else if (e.startsWith('found:')) {
        const item = ITEMS.find(i => i.id === e.slice(6))!;
        // Carl-Otto says one thing at a time: a new find replaces what he said last.
        this.sfx.play('found');
        this.bubbles.clear('friend');
        this.say(words(item.found), g.x, GROUND - 190, 'friend', 3);
        this.announce(t('foundItem').replace('{name}', words(item.name)));
      } else if (e.startsWith('surprise:')) {
        const kind = e.slice(9) as SurpriseKind, spot = g.spots.find(s => s.surprise === kind && s.opened)!;
        const line = words((kind === 'dining' ? DINING : SURPRISES.find(s => s.kind === kind)!).line);
        this.sfx.play(SURPRISE_SOUND[kind]);
        this.say(line, spot.x + 30, topOf(spot.kind) + 30, 'surprise', 3);
        this.announce(line);
      } else if (e.startsWith('placed:')) {
        const item = ITEMS.find(i => i.id === e.slice(7))!, left = ITEMS.length - g.placed.length;
        this.sfx.play('plop');
        this.announce((left ? t('placedItem') : t('placedLast')).replace('{name}', words(item.name)).replace('{n}', String(left)));
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
    // Rebuild the interface first, so the announcements land in the new status line.
    if (g.mode !== this.lastMode || g.near !== this.lastNear || this.things !== this.lastThings) this.changed();
    this.react();
    this.paint();
    this.drawBubbles();
    musicOf(this.game).setDucked(g.mode === 'paused');
  }

  update(_time: number, delta: number): void { if (!this.frozen) this.step(Math.min(0.05, delta / 1000)); }

  private paint(): void {
    const c = this.texture.context;
    c.save(); c.scale(1.5 / DIV, 1.5 / DIV); this.cam = drawHome(c, this.run, this.clock, wallPicture(this.drawing)); c.restore();
    this.texture.refresh();
  }

  /** The speech bubbles, and the "Titta!" marker over the place in reach. */
  private drawBubbles(): void {
    const g = this.run, extra: Bubble[] = [];
    if (g.mode === 'gathering' && g.near) extra.push({ text: t('look'), x: g.near.x, y: topOf(g.near.kind) - 6, until: 0, tone: 'look' });
    this.bubbles.draw(this.clock, extra, this.cam, K);
  }
}
