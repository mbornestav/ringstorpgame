import { getLang } from '../../side/i18n';
import type { Pt } from './art';
import { drawBath } from './bath-art';
import { BathRun } from './bath-run';
import { CUP, HANDS, LINES, MIRROR, PUMP, STOOL, TAP, TOWEL, TUBE, TUNE } from './games/badrum';
import { PITCH } from './games/godnatt';
import type { Words } from './games/kurragomma';
import { markDone } from './house';
import { K, RoomScene } from './room-scene';
import { familyText as t } from './text';

// Carl-Otto's games 3, Hemma: Tänder och tvål, in the bathroom. For fingers first: a tap on the stool, two on the soap
// pump, rubbing over the hands (any back and forth), a tap on the tap and on the towel, a tap on the toothpaste; then the
// toothbrush follows a finger over the mirror and brushes away the sugar bugs (each bit of brushing plays the next note of
// Gubben Noak), and a tap on the cup to rinse. Bubbles can be popped at any time. With a keyboard, Space does the next
// thing. The next step of the evening is goodnight, in Carl-Otto's room.

const words = (w: Words) => w[getLang()];
const SPEAK: Pt = [480, 60];
const inRect = ([x, y]: Pt, r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export class BathScene extends RoomScene {
  run = new BathRun();
  private status: HTMLElement | null = null;
  private shown = '';
  private last: Pt | null = null;
  private note = 0;

  constructor() { super('Bath', 'wc', 'bath', 'hub'); }

  protected reset(): void { this.run = new BathRun(); this.shown = ''; this.status = null; this.last = null; this.note = 0; this.run.events.push('start'); }

  private get state(): string { return this.run.phase; }

  protected build(): void {
    const g = this.run;
    this.shown = this.state;
    this.topBar(t('bathTitle'), 'bath-menu');
    this.status = this.mirror('p', '', 'bath-status'); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    const spot = (id: string, label: string, [x, y]: Pt, w: number, h: number, act: () => void, zone = true) => this.hotspot(id, label, (x - w / 2) * K, (y - h / 2) * K, w * K, h * K, act, { instant: true, zone });
    switch (g.phase) {
      case 'stool': spot('bath-stool', t('bathStool'), [STOOL[0], STOOL[1] - 10], 200, 90, () => g.stepUp()); break;
      case 'soap': spot('bath-pump', t('bathPump'), [PUMP[0] + 4, PUMP[1] - 14], 80, 90, () => g.pump()); break;
      case 'rub': spot('bath-hands', t('bathRub'), [HANDS.x + HANDS.w / 2, HANDS.y + HANDS.h / 2], HANDS.w, HANDS.h, () => g.primary(), false); break;
      case 'rinse': spot('bath-tap', t('bathTap'), [TAP[0] + 10, TAP[1] - 8], 110, 70, () => g.rinse()); break;
      case 'dry': spot('bath-towel', t('bathTowel'), [TOWEL.x + TOWEL.w / 2, TOWEL.y + TOWEL.h / 2], TOWEL.w + 30, TOWEL.h, () => g.dry()); break;
      case 'paste': spot('bath-tube', t('bathTube'), TUBE, 110, 60, () => g.paste()); break;
      case 'brush': spot('bath-brush', t('bathBrush'), [MIRROR.x + MIRROR.w / 2, MIRROR.y + MIRROR.h / 2], MIRROR.w, MIRROR.h, () => g.scrubNext(), false); break;
      case 'spit': spot('bath-cup', t('bathCup'), [CUP[0], CUP[1] - 20], 80, 90, () => g.spit()); break;
      case 'done': this.overlay(); break;
    }
    if (!this.touch && g.phase !== 'done') {
      this.panel(28, 739, 520, 47, 0xfff8e5, 16, 0.92);
      this.label(t('homecomingKeys'), 49, 750, 18, '#3e5948', undefined, true);
    }
  }

  private overlay(): void {
    const y = 520, h = 236;
    this.panel(250, y, 940, h, 0xfff7df, 28, 0.98);
    this.label(t('bathDone'), 292, y + 28, 42, '#294d3e', 860, true);
    this.label(t('bathDoneBody'), 294, y + 90, 21, '#58674f', 860);
    this.button('bath-bed', t('toBed'), 294, y + h - 80, 340, () => this.scene.start('Goodnight'));
    this.button('bath-again', t('goodnightAgain'), 660, y + h - 80, 260, () => this.scene.restart(), true);
    this.mirror('h2', t('bathDone'), 'bath-panel-title'); this.mirror('p', t('bathDoneBody'));
  }

  protected keyDown(key: string, repeat: boolean): boolean {
    if (this.run.won) return false;
    if (key === ' ' || key === 'enter') { if (!repeat || this.run.phase === 'rub' || this.run.phase === 'brush') this.run.primary(); return true; }
    return false;
  }

  protected pointer(kind: 'down' | 'move' | 'up', at: Pt): void {
    const g = this.run;
    if (kind === 'up') { this.last = null; g.lift(); return; }
    if (kind === 'down' && g.pop(at)) return;
    const d = this.last ? Math.hypot(at[0] - this.last[0], at[1] - this.last[1]) : 0;
    this.last = at;
    if (g.phase === 'rub' && inRect(at, { x: HANDS.x - 40, y: HANDS.y - 40, w: HANDS.w + 80, h: HANDS.h + 80 })) g.rub(kind === 'down' ? 30 : d);
    else if (g.phase === 'brush' && inRect(at, MIRROR)) g.scrub(at, d);
  }

  protected blurred(): void { this.last = null; this.run.lift(); }

  private announce(text: string): void { if (this.status) this.status.textContent = text; }
  private line(w: Words, seconds = 3): void { this.bubbles.clear('friend'); this.say(words(w), SPEAK[0], SPEAK[1] + 30, 'friend', seconds); this.announce(words(w)); }

  protected tick(dt: number): void {
    const g = this.run;
    g.update(dt);
    if (this.state !== this.shown) this.rebuild();
    for (const e of g.events.splice(0)) {
      const [kind, a] = e.split(':');
      if (kind === 'start') this.line(LINES.start, 4);
      else if (kind === 'up') { this.sfx.play('jump'); this.line(LINES.up); }
      else if (kind === 'pump') this.sfx.play('plop');
      else if (kind === 'rub') this.line(LINES.pump);
      else if (kind === 'rubbing') this.sfx.play('swish');
      else if (kind === 'pop') this.sfx.play('blub');
      else if (kind === 'lather') { this.sfx.play('cheer'); this.line(LINES.bubbly); }
      else if (kind === 'water') this.sfx.play('glug');
      else if (kind === 'rinsed') this.line(LINES.rinsed);
      else if (kind === 'dried') { this.sfx.play('swish'); this.line(LINES.dried); }
      else if (kind === 'brush') { this.sfx.play('giggle'); this.line(LINES.brush, 3.5); }
      else if (kind === 'note') { this.sfx.note(PITCH[TUNE[this.note % TUNE.length]], 0.35); this.note++; }
      else if (kind === 'bug') {
        const b = g.bugs[Number(a)];
        this.sfx.play('giggle');
        this.say(words(LINES.bye[Number(a) % LINES.bye.length]), b.at[0], b.at[1] - 20, 'surprise', 1.2);
      } else if (kind === 'clean') { this.sfx.play('cheer'); this.line(LINES.spit); }
      else if (kind === 'done') { this.sfx.play('victory'); this.sfx.play('twinkle'); markDone('tander'); this.line(LINES.done); }
    }
  }

  protected paintWorld(c: CanvasRenderingContext2D): void { drawBath(c, this.run, this.clock); }
}
