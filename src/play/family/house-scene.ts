import Phaser from 'phaser';
import { getLang } from '../../side/i18n';
import { paletteFor } from '../../side/palettes';
import { isRetro } from '../../side/pixel';
import { Sfx } from '../audio/sfx';
import { musicOf } from '../audio/music';
import { addRetroImage } from '../world/retro-shader';
import { ACTIVITIES, ROOMS, activitiesIn, roomOf, type Activity, type RoomId } from './games/hemma';
import type { Words } from './games/kurragomma';
import { drawHouse, headAt, roomBox, toWorld } from './house-art';
import { eveningDone, nextUp, readProgress, type HomeProgress } from './house';
import { FamilySurface } from './surface';
import { familyText as t } from './text';
import type { Pt } from './art';

// Carl-Otto's games 3, Hemma: the house seen from above, after the robot vacuum's map. A tap on a room (or the arrow keys)
// walks Carl-Otto's head there and shows what there is to do in it; a second tap on the room starts its game. Each room
// with something finished in it wears a gold star, and the room the evening suggests next sparkles.

const DIV = isRetro() ? 3 : 1;
/** World pixels to interface pixels. */
const K = 1.5;
const words = (w: Words) => w[getLang()];
/** How fast the head crosses the house, world pixels a second. */
const HEAD_SPEED = 420;

export class HouseScene extends FamilySurface {
  selected: RoomId = 'living';
  frozen = false;
  progress: HomeProgress = readProgress(null);
  head: Pt = [0, 0];
  private texture!: Phaser.Textures.CanvasTexture;
  private sfx!: Sfx;
  private clock = 0;

  constructor() { super('House'); }

  init(data: { room?: RoomId }): void {
    this.progress = readProgress();
    this.selected = data?.room ?? nextUp(this.progress.done)?.room ?? 'living';
  }

  create(): void {
    this.frozen = false; this.clock = 0;
    this.head = headAt(this.selected);
    this.sfx = new Sfx(this.game.sound);
    if (this.textures.exists('house-world')) this.textures.remove('house-world');
    this.texture = this.textures.createCanvas('house-world', 1440 / DIV, 810 / DIV)!;
    if (isRetro()) addRetroImage(this, 'house-world', 0, 0, 1440, 810, () => paletteFor('home'));
    else this.add.image(0, 0, 'house-world').setOrigin(0);
    this.setup();
    musicOf(this.game).play('movie');

    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', 'escape', 'enter', ' ', 'm'].includes(key)) return;
      e.stopPropagation();
      if ((key === 'enter' || key === ' ') && document.activeElement instanceof HTMLButtonElement) return;
      if (e.repeat) return;
      if (key === 'm') this.toggleSound();
      else if (key === 'escape') this.scene.start('Hub', { section: 'carl' });
      else if (key === 'enter' || key === ' ') { const first = activitiesIn(this.selected).find(a => a.scene); if (first) this.play(first); }
      else this.step1(['arrowleft', 'arrowup', 'a', 'w'].includes(key) ? -1 : 1);
    };
    this.input.keyboard?.on('keydown', down);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.input.keyboard?.off('keydown', down); this.textures.remove('house-world'); });
    this.paint();
  }

  /** The next or previous room, in the order of the map's list. */
  private step1(dir: 1 | -1): void {
    const i = ROOMS.findIndex(r => r.id === this.selected);
    this.choose(ROOMS[(i + dir + ROOMS.length) % ROOMS.length].id, false);
    this.root.querySelector<HTMLButtonElement>(`[data-family="room-${this.selected}"]`)?.focus({ preventScroll: true });
  }

  /** A room was tapped: choose it, or, if it is already chosen and has one game to play, start that. */
  choose(id: RoomId, again = true): void {
    if (id === this.selected && again) {
      const playable = activitiesIn(id).filter(a => a.scene);
      if (playable.length === 1) { this.play(playable[0]); return; }
    }
    if (id !== this.selected) this.sfx.play('plop');
    this.selected = id;
    this.rebuild();
  }

  play(activity: Activity): void {
    if (!activity.scene) return;
    this.sfx.play('ready');
    this.scene.start(activity.scene);
  }

  protected build(): void {
    const done = this.progress.done, room = roomOf(this.selected);
    document.title = `${t('houseTitle')} · ${t('carl')}`; document.documentElement.lang = getLang();
    this.mirror('h1', `${t('carl')} · ${t('houseTitle')}`);
    this.panel(28, 24, 1384, 99, 0xfff8e5, 22, 0.96);
    this.label(t('carl'), 55, 39, 20, '#67715d', undefined, true);
    this.label(t('houseTitle'), 54, 67, 31, '#25473f', undefined, true);
    this.soundButton('house-sound', 1016);
    this.button('house-menu', t('back'), 1170, 45, 217, () => this.scene.start('Hub', { section: 'carl' }), true);

    // The rooms on the map: their names, and a tap target over each.
    for (const r of ROOMS) {
      const [lx, ly] = toWorld(r.label), text = words(r.name);
      const label = this.label(text, lx * K + 8, ly * K + 2, 16, '#25473f', undefined, true);
      const pill = this.rect(lx * K, ly * K - 2, label.width + 16, label.height + 6, 0xfff8e5, 8, r.id === this.selected ? 0.98 : 0.85);
      this.layer.moveDown(pill);
      const b = roomBox(r.id);
      this.hotspot(`room-${r.id}`, text, b.x * K, b.y * K, b.w * K, b.h * K, () => this.choose(r.id));
    }

    // What there is to do in the chosen room.
    const x = 760, w = 652, list = activitiesIn(room.id);
    this.panel(x, 150, w, 610, 0xfff8e5, 24, 0.97);
    this.label(list.some(a => a.morning) ? t('morningTag') : t('eveningTag'), x + 34, 172, 18, '#8f653b', undefined, true);
    this.label(words(room.name), x + 32, 200, 44, '#25473f', undefined, true);
    this.mirror('h2', words(room.name), 'house-room');
    list.forEach((a, i) => {
      const y = 272 + i * 196, finished = done.includes(a.id);
      const title = this.label(words(a.title), x + 34, y, 30, '#294d3e', undefined, true);
      if (finished) {
        const badge = this.label(t('doneMark'), x + 34 + title.width + 22, y + 6, 18, '#8f653b', undefined, true);
        this.layer.moveDown(this.rect(badge.x - 10, badge.y - 4, badge.width + 20, badge.height + 8, 0xf2c230, 10, 0.9));
      }
      this.label(words(a.blurb), x + 34, y + 44, 21, '#58674f', w - 70);
      this.mirror('p', `${words(a.title)}: ${words(a.blurb)}${finished ? ` ${t('doneMark')}` : ''}`);
      if (a.scene) this.button(`play-${a.id}`, t('play'), x + 34, y + 108, 240, () => this.play(a));
      else {
        this.rect(x + 34, y + 110, 240, 52, 0xe9e5d2, 14);
        this.label(t('soon'), x + 56, y + 122, 22, '#8a8f80', undefined, true);
        this.mirror('p', t('soon'));
      }
    });
    const next = nextUp(done);
    const footer = eveningDone(done) && !next ? t('eveningDone') : next ? t('suggestion').replace('{title}', words(next.title)) : t('houseIntro');
    this.label(footer, x + 34, 668, 18, '#946137', w - 70, true);
    if (!this.touch) this.label(t('houseKeys'), x + 34, 706, 14, '#8a8f80', w - 70, true);
    this.mirror('p', footer);
  }

  step(dt: number): void {
    this.clock += dt;
    const [tx, ty] = headAt(this.selected), [hx, hy] = this.head, gap = Math.hypot(tx - hx, ty - hy), move = Math.min(gap, HEAD_SPEED * dt);
    if (gap > 0.5) this.head = [hx + (tx - hx) / gap * move, hy + (ty - hy) / gap * move];
    this.paint();
  }

  update(_time: number, delta: number): void { if (!this.frozen) this.step(Math.min(0.05, delta / 1000)); }

  private paint(): void {
    const c = this.texture.context, done = this.progress.done;
    const stickers = ROOMS.filter(r => ACTIVITIES.some(a => a.room === r.id && done.includes(a.id))).map(r => r.id);
    c.save(); c.scale(1.5 / DIV, 1.5 / DIV);
    drawHouse(c, { selected: this.selected, head: this.head, stickers, suggest: nextUp(done)?.room ?? null }, this.clock);
    c.restore();
    this.texture.refresh();
  }
}
