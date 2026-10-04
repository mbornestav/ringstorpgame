import { getLang } from '../../side/i18n';
import type { Pt } from './art';
import { wallPicture } from './craft-art';
import { LINES, NAMES, PAIRS, STAND } from './games/hemkomst';
import type { Words } from './games/kurragomma';
import { drawHall } from './homecoming-art';
import { HomecomingRun } from './homecoming-run';
import { markDone, readProgress } from './house';
import { K, RoomScene } from './room-scene';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: Hemkomst, by the front door. For fingers first: a shoe is picked up where it lies and put
// where its pair stands on the bench (or just tapped, and it hops there by itself); while it is held, its partner wiggles.
// Then the raincoat onto his hook and the helmet onto the shelf. With a keyboard, Space puts the next thing away. The next
// step of the evening is the craft corner, in the same room.

const words = (w: Words) => w[getLang()];
const SPEAK: Pt = [STAND[0], STAND[1] - 220];

export class HomecomingScene extends RoomScene {
  run = new HomecomingRun();
  private status: HTMLElement | null = null;
  private shown = '';
  private cheerUntil = 0;
  /** Carl-Otto's latest picture, for the magnet board. */
  private drawing: string | undefined;

  constructor() { super('Homecoming', 'hall', 'hall', 'hub'); }

  protected reset(): void {
    this.run = new HomecomingRun(); this.shown = ''; this.status = null; this.cheerUntil = 0;
    this.drawing = readProgress().drawings[0];
    this.run.events.push('start');
  }

  /** Only what changes the controls (a rebuild costs a frame of taps on new zones). */
  private get state(): string { return `${this.run.won}|${this.run.left.map(x => x.id).join()}`; }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('homecomingTitle'), 'homecoming-menu');
    this.status = this.mirror('p', '', 'homecoming-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.won) { this.overlay(); return; }
    // Screen readers and keyboards: a button per thing still to put away (fingers pick them up on the canvas).
    for (const th of g.left) this.hotspot(`put-${th.id}`, `${words(NAMES[th.id])}: ${t('putAway')}`, (th.at[0] - 34) * K, (th.at[1] - 50) * K, 68 * K, 60 * K, () => g.send(th.id), { zone: false });
    if (!this.touch) {
      this.panel(28, 739, 520, 47, 0xfff8e5, 16, 0.92);
      this.label(t('homecomingKeys'), 49, 750, 18, '#3e5948', undefined, true);
    }
  }

  private overlay(): void {
    const y = 520, h = 236;
    this.panel(250, y, 940, h, 0xfff7df, 28, 0.98);
    this.label(t('homecomingDone'), 292, y + 28, 42, '#294d3e', 860, true);
    this.label(t('homecomingDoneBody'), 294, y + 90, 21, '#58674f', 860);
    this.button('homecoming-craft', t('toCraft'), 294, y + h - 80, 340, () => this.scene.start('Craft'));
    this.button('homecoming-again', t('goodnightAgain'), 660, y + h - 80, 260, () => this.scene.restart(), true);
    this.mirror('h2', t('homecomingDone'), 'homecoming-panel-title'); this.mirror('p', t('homecomingDoneBody'));
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    if (repeat || this.run.won) return false;
    if (key === ' ' || key === 'enter') { this.run.primary(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', at: Pt): void {
    const g = this.run;
    if (kind === 'down') g.grab(at); else if (kind === 'move') g.drag(at); else g.drop(at);
  }

  protected blurred(): void { const h = this.run.held; if (h) this.run.drop(this.run.things.find(x => x.id === h)!.at); }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }
  private line(w: Words, at: Pt = SPEAK, seconds = 2.6): void { this.bubbles.clear('friend'); this.say(words(w), at[0], at[1], 'friend', seconds); this.announce(words(w)); }

  protected tick(dt: number): void {
    const g = this.run;
    g.update(dt);
    if (this.state !== this.shown) this.rebuild();
    for (const e of g.events.splice(0)) {
      const [kind, a] = e.split(':');
      if (kind === 'start') this.line(LINES.start, SPEAK, 4);
      else if (kind === 'grab') this.sfx.play('pickup');
      else if (kind === 'wrong') { this.sfx.play('boing'); this.line(LINES.wrong); }
      else if (kind === 'placed') {
        if (a === 'jacket') { this.sfx.play('swish'); this.line(LINES.jacket); }
        else if (a === 'helmet') { this.sfx.play('ding'); this.line(LINES.helmet); }
        else this.sfx.play('plop');
      } else if (kind === 'pair') { this.sfx.play('twinkle'); this.line(PAIRS.find(p => p.id === a)!.done); this.cheerUntil = this.clock + 1.2; }
      else if (kind === 'home') { this.sfx.play('victory'); markDone('hemkomst'); this.bubbles.clear(); this.say(words(LINES.done), 60, 250, 'surprise', 3); this.announce(words(LINES.done)); }
    }
  }

  protected paintWorld(c: CanvasRenderingContext2D): void { drawHall(c, this.run, this.clock, this.cheerUntil, wallPicture(this.drawing)); }
}
