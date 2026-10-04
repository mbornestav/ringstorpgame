import { getLang } from '../../side/i18n';
import { musicOf } from '../audio/music';
import type { Pt } from './art';
import { ANIMALS, BED, KEYS, LAMP, LINES, PIANO, PITCH, TOYS, type AnimalId, type ToyId } from './games/godnatt';
import type { Words } from './games/kurragomma';
import { drawRoom, keyBox } from './goodnight-art';
import { GoodnightRun } from './goodnight-run';
import { hungIn, markDone, readProgress } from './house';
import { wallPicture } from './wall-picture';
import { K, RoomScene } from './room-scene';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: Godnatt, in Carl-Otto's room. For fingers first: a toy is picked up where it is touched and
// let go where it lives (or just tapped, and it hops home by itself); then a tap on the bed, a tap on each animal on the
// wallpaper to say goodnight, and a tap on the paper lamp. The toy piano under the desk opens big, for playing freely or
// along with Blinka lilla stjärna. With a keyboard, Space does the next thing, P opens the piano and 1–8 play it.

const words = (w: Words) => w[getLang()];
const PLACED_SOUND: Record<ToyId, string> = { engine: 'siren', doll: 'twinkle', lego: 'crate', ball: 'boing', book: 'plop', dino: 'rawr' };

export class GoodnightScene extends RoomScene {
  run = new GoodnightRun();
  private status: HTMLElement | null = null;
  private shown = '';
  private cheerUntil = 0;
  /** The picture Carl-Otto has chosen for his room. */
  private drawing: string | undefined;

  constructor() { super('Goodnight', 'bedroom', 'bedroom', 'hub'); }

  protected reset(): void { this.drawing = hungIn(readProgress(), 'bedroom'); this.run = new GoodnightRun(); this.shown = ''; this.status = null; this.cheerUntil = 0; this.run.events.push('start'); }

  /**
   * What the controls depend on: when it changes, they are rebuilt. Only what changes the controls is in it (not, say, how
   * many animals are asleep): new touch zones only take touches from the next frame, so a rebuild would drop a quick tap.
   */
  private get state(): string {
    const g = this.run;
    return `${g.phase}|${g.phase === 'tidy' ? g.left.map(x => x.id).join() : ''}|${g.piano.open}|${g.piano.along}|${g.won}`;
  }

  /** Where Carl-Otto's lines come from: over his head, or from the pillow. */
  private get speaker(): Pt { return this.run.inBed >= 0 ? [BED.pillow[0] + 20, BED.pillow[1] - 50] : [360, 330]; }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('goodnightTitle'), 'goodnight-menu');
    this.status = this.mirror('p', '', 'goodnight-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    if (g.piano.open) { this.pianoControls(); return; }
    if (g.won) { this.overlay(); return; }
    if (g.phase === 'tidy') {
      // Screen readers and keyboards: a button per toy still out (fingers pick the toys up on the canvas).
      for (const toy of g.left) {
        const def = TOYS.find(d => d.id === toy.id)!;
        this.hotspot(`toy-${toy.id}`, `${words(def.name)}: ${t('putAway')}`, (toy.at[0] - 40) * K, (toy.at[1] - 60) * K, 80 * K, 70 * K, () => g.send(toy.id), { zone: false });
      }
    }
    if (g.phase !== 'asleep') {
      this.hotspot('goodnight-bed', t('bedLabel'), (BED.x + 20) * K, (BED.y - 10) * K, (BED.w - 40) * K, 120 * K, () => g.toBed(), { instant: true });
      for (const a of ANIMALS) this.hotspot(`animal-${a.id}`, words(a.name), (a.at[0] - a.r * 1.5) * K, (a.at[1] - a.r * 1.3) * K, a.r * 3 * K, a.r * 2.6 * K, () => g.sayGoodnight(a.id), { instant: true });
      this.hotspot('goodnight-lamp', t('lampLabel'), (LAMP.x - LAMP.r) * K, (LAMP.y - LAMP.r) * K, LAMP.r * 2 * K, LAMP.r * 2 * K, () => g.lampOff(), { instant: true });
      this.hotspot('goodnight-piano', t('pianoLabel'), (PIANO.x - 10) * K, (PIANO.y - 14) * K, (PIANO.w + 20) * K, 80 * K, () => g.openPiano(), { instant: true });
    }
    if (!this.touch && g.phase !== 'asleep') {
      this.panel(28, 739, 1100, 47, 0xfff8e5, 16, 0.92);
      this.label(t('goodnightKeys'), 49, 750, 18, '#3e5948', undefined, true);
    }
  }

  private pianoControls(): void {
    const g = this.run;
    for (let i = 0; i < 8; i++) { const b = keyBox(i); this.hotspot(`piano-key-${i}`, `${KEYS[i]} (${i + 1})`, b.x * K, b.y * K, b.w * K, b.h * K, () => g.play(i), { instant: true }); }
    this.button('piano-along', g.piano.along ? t('freePlay') : t('playAlong'), 196, 742, 300, () => g.toggleAlong());
    this.button('piano-close', t('closePiano'), 960, 742, 300, () => g.closePiano(), true);
    this.mirror('h2', t('pianoLabel'), 'goodnight-panel-title');
  }

  private overlay(): void {
    const y = 540, h = 220;
    this.panel(250, y, 940, h, 0xfff7df, 28, 0.98);
    this.label(t('goodnightDone'), 292, y + 28, 42, '#294d3e', 860, true);
    this.label(t('goodnightDoneBody'), 294, y + 90, 21, '#58674f', 860);
    this.button('goodnight-again', t('goodnightAgain'), 294, y + h - 76, 280, () => this.scene.restart());
    this.mirror('h2', t('goodnightDone'), 'goodnight-panel-title'); this.mirror('p', t('goodnightDoneBody'));
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    const g = this.run;
    if (repeat) return false;
    if (key === 'escape' && g.piano.open) { g.closePiano(); return true; }
    if (key === 'p' && g.phase !== 'asleep') { if (g.piano.open) g.closePiano(); else g.openPiano(); return true; }
    if (/^[1-8]$/.test(key) && g.piano.open) { g.play(Number(key) - 1); return true; }
    if ((key === ' ' || key === 'enter') && !g.won) { g.primary(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', at: Pt): void {
    const g = this.run;
    if (kind === 'down') g.grab(at);
    else if (kind === 'move') g.drag(at);
    else g.drop(at);
  }

  protected blurred(): void { if (this.run.held) this.run.drop(this.run.toys.find(x => x.id === this.run.held)!.at); }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }
  private line(w: Words, at: Pt = this.speaker, seconds = 2.8): void { this.bubbles.clear('friend'); this.say(words(w), at[0], at[1], 'friend', seconds); this.announce(words(w)); }

  protected tick(dt: number): void {
    const g = this.run;
    g.update(dt);
    if (this.state !== this.shown) this.rebuild();
    for (const e of g.events.splice(0)) {
      const [kind, a] = e.split(':');
      if (kind === 'start') this.line(LINES.start, this.speaker, 4);
      else if (kind === 'grab') this.sfx.play('pickup');
      else if (kind === 'piano') this.bubbles.clear();
      else if (kind === 'wrong') { this.sfx.play('boing'); this.line(LINES.wrong); }
      else if (kind === 'placed') { const def = TOYS.find(d => d.id === a)!; this.sfx.play(PLACED_SOUND[def.id]); this.line(def.placed); }
      else if (kind === 'tidy') { this.sfx.play('cheer'); this.line(LINES.tidy, this.speaker, 4); this.cheerUntil = this.clock + 1.5; }
      else if (kind === 'notyet') this.line(a === 'bed' ? LINES.notYetBed : LINES.notYetLamp);
      else if (kind === 'bed') { this.sfx.play('ready'); this.line(LINES.bed, this.speaker, 4); }
      else if (kind === 'peek') { this.sfx.play('giggle'); const an = ANIMALS.find(x => x.id === a)!; this.say(words(an.name), an.at[0], an.at[1] - an.r, 'surprise', 1.6); }
      else if (kind === 'night') { this.sfx.play('plop'); const an = ANIMALS.find(x => x.id === (a as AnimalId))!; this.bubbles.clear('surprise'); this.say(words(an.night), an.at[0], an.at[1] - an.r, 'surprise', 2.2); this.announce(words(an.night)); }
      else if (kind === 'animals') this.line(LINES.animals, this.speaker, 3.5);
      else if (kind === 'lamp') { this.sfx.play('tick'); this.bubbles.clear(); this.line(LINES.asleep, this.speaker, 3); }
      else if (kind === 'won') { markDone('godnatt'); }
      else if (kind === 'note') this.sfx.note(PITCH[Number(a)]);
      else if (kind === 'song') { this.sfx.play('victory'); this.say(words(LINES.song), 480, 190, 'surprise', 3); this.announce(words(LINES.song)); }
    }
    musicOf(this.game).setDucked(g.piano.open || g.phase === 'asleep');
  }

  protected paintWorld(c: CanvasRenderingContext2D): void { drawRoom(c, this.run, this.clock, this.cheerUntil, wallPicture(this.drawing)); }
}
