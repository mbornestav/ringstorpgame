import { getLang } from '../../side/i18n';
import type { Pt } from './art';
import { BED, BOUNCE_X, FOOT, LINES, MAMMA_HEAD, PAPPA_HEAD, STAND, TEDDY_START, WINDOW } from './games/godmorgon';
import type { Words } from './games/kurragomma';
import { markDone } from './house';
import { bulbAt, drawBedroom } from './morning-art';
import { MorningRun } from './morning-run';
import { K, RoomScene } from './room-scene';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: God morgon, in the big bedroom the morning after. For fingers first: a tap on the curtains
// opens them, taps on Pappa's foot tickle it, Nallen is dragged (or tapped) onto Mamma's nose; then any tap makes Carl-Otto
// bounce on the bed, each bounce lighting one of the star lamp's bulbs. At the end, "Dags för förskolan!" starts the bike
// ride to preschool (game 1), so the collection comes round again.

const words = (w: Words) => w[getLang()];
/** Seconds between snores while they sleep. */
const SNORE = 2.4;

export class MorningScene extends RoomScene {
  run = new MorningRun();
  private status: HTMLElement | null = null;
  private shown = '';
  private snore = 0;

  constructor() { super('Morning', 'big', 'morning', 'hub'); }

  protected reset(): void { this.run = new MorningRun(); this.shown = ''; this.status = null; this.snore = 1; this.run.events.push('start'); }

  /** Only what changes the controls (a rebuild costs a frame of taps on new zones). */
  private get state(): string { const g = this.run; return `${g.phase}|${g.woke.join()}`; }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('morningTitle'), 'morning-menu');
    this.status = this.mirror('p', '', 'morning-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.phase === 'wake') {
      if (!g.woke.includes('curtains')) this.hotspot('morning-curtains', t('openCurtains'), (WINDOW.x - 40) * K, (WINDOW.y - 20) * K, (WINDOW.w + 80) * K, (WINDOW.h + 50) * K, () => g.openCurtains(), { instant: true });
      if (!g.woke.includes('tickle')) this.hotspot('morning-foot', t('tickleFoot'), (FOOT[0] - 34) * K, (FOOT[1] - 44) * K, 80 * K, 80 * K, () => g.tickle(), { instant: true });
      if (!g.woke.includes('teddy')) this.hotspot('morning-teddy', t('teddyNose'), (TEDDY_START[0] - 36) * K, (TEDDY_START[1] - 40) * K, 72 * K, 76 * K, () => g.sendTeddy(), { zone: false });
    } else if (g.phase === 'bounce') {
      this.hotspot('morning-jump', t('jumpOnBed'), (BED.x + 120) * K, (BED.top - 200) * K, (BED.foot - BED.x - 120) * K, 240 * K, () => g.jump(), { zone: false });
    } else if (g.phase === 'ready') this.overlay();
    if (!this.touch && (g.phase === 'wake' || g.phase === 'bounce')) {
      this.panel(28, 739, 760, 47, 0xfff8e5, 16, 0.92);
      this.label(t('morningKeys'), 49, 750, 18, '#3e5948', undefined, true);
    }
  }

  private overlay(): void {
    const y = 520, h = 236;
    this.panel(250, y, 940, h, 0xfff7df, 28, 0.98);
    this.label(t('morningDone'), 292, y + 28, 42, '#294d3e', 860, true);
    this.label(t('morningDoneBody'), 294, y + 90, 21, '#58674f', 860);
    this.button('morning-bike', t('toPreschool'), 294, y + h - 80, 360, () => this.scene.start('Bike'));
    this.button('morning-again', t('goodnightAgain'), 680, y + h - 80, 260, () => this.scene.restart(), true);
    this.mirror('h2', t('morningDone'), 'morning-panel-title'); this.mirror('p', t('morningDoneBody'));
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    if (repeat) return false;
    if ((key === ' ' || key === 'enter' || key === 'arrowup') && (this.run.phase === 'wake' || this.run.phase === 'bounce')) { this.run.primary(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', at: Pt): void {
    const g = this.run;
    if (g.phase === 'bounce') { if (kind === 'down') g.jump(); return; }
    if (kind === 'down') g.grab(at);
    else if (kind === 'move') g.drag(at);
    else g.drop(at);
  }

  protected blurred(): void { if (this.run.held) this.run.drop(this.run.teddy.at); }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }
  private line(w: Words, at: Pt, tone: 'friend' | 'surprise' = 'friend', seconds = 2.8): void { this.bubbles.clear(tone); this.say(words(w), at[0], at[1], tone, seconds); this.announce(words(w)); }

  protected tick(dt: number): void {
    const g = this.run;
    g.update(dt);
    if (this.state !== this.shown) this.rebuild();
    // Snores while they sleep.
    if (g.awakeSince < 0 && (this.snore -= dt) <= 0) { this.snore = SNORE; this.sfx.play('prrrt'); }
    for (const e of g.events.splice(0)) {
      const [kind, a] = e.split(':');
      if (kind === 'start') this.line(LINES.start, [STAND[0], STAND[1] - 230], 'friend', 4);
      else if (kind === 'wake' && a === 'curtains') { this.sfx.play('swish'); this.line(LINES.curtains, [PAPPA_HEAD[0], PAPPA_HEAD[1] - 50], 'surprise'); }
      else if (kind === 'tickle') this.sfx.play('giggle');
      else if (kind === 'wake' && a === 'tickle') this.line(LINES.tickle, [PAPPA_HEAD[0] + 30, PAPPA_HEAD[1] - 50], 'surprise');
      else if (kind === 'grab') this.sfx.play('pickup');
      else if (kind === 'teddy') this.sfx.play('boing');
      else if (kind === 'wake' && a === 'teddy') { this.sfx.play('atjoo'); this.line(LINES.teddy, [MAMMA_HEAD[0] + 40, MAMMA_HEAD[1] - 60], 'surprise'); }
      else if (kind === 'awake') { this.sfx.play('cheer'); this.bubbles.clear(); this.line(LINES.awake, [230, 220], 'surprise', 3); }
      else if (kind === 'bounce') this.line(LINES.bounce, [BOUNCE_X + 250, 300], 'friend', 4);
      else if (kind === 'bulb') { this.sfx.play('jump'); this.sfx.play('ding'); const n = Number(a), [bx, by] = bulbAt(n - 1); this.say(words(LINES.count[n - 1]), bx, by - 10, 'surprise', 0.9); this.announce(words(LINES.count[n - 1])); }
      else if (kind === 'hug') { this.sfx.play('victory'); markDone('godmorgon'); this.bubbles.clear(); this.line(LINES.hug, [320, 200], 'surprise', 3); }
    }
  }

  protected paintWorld(c: CanvasRenderingContext2D): void { drawBedroom(c, this.run, this.clock); }
}
