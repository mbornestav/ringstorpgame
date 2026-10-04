import { describe, expect, it } from 'vitest';
import { ANIMALS, SONG, TOYS, TUNING } from '../src/play/family/games/godnatt';
import { GoodnightRun } from '../src/play/family/goodnight-run';

const run = (g: GoodnightRun, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.update(1 / 60); };
const fresh = () => { const g = new GoodnightRun(); g.events = []; return g; };
const tidied = () => { const g = fresh(); for (const t of TOYS) g.send(t.id); run(g, TUNING.hop + 0.1); g.events = []; return g; };

describe('Godnatt: tidying up', () => {
  it('starts with every toy on the rug, nowhere near its home', () => {
    const g = fresh();
    expect(g.phase).toBe('tidy');
    for (const t of TOYS) expect(Math.hypot(t.start[0] - t.home[0], t.start[1] - t.home[1])).toBeGreaterThan(TUNING.homeReach + TUNING.grab);
    expect(new Set(TOYS.map(t => t.home.join())).size).toBe(TOYS.length);
  });

  it('a toy dragged to its home goes in', () => {
    const g = fresh(), lego = TOYS.find(t => t.id === 'lego')!;
    expect(g.grab(lego.start)).toBe('lego');
    g.drag([300, 400]); g.drag(lego.home);
    g.drop(lego.home);
    run(g, TUNING.hop + 0.05);
    expect(g.toys.find(t => t.id === 'lego')!.placed).toBe(true);
    expect(g.events).toContain('placed:lego');
  });

  it('a toy only tapped hops home by itself', () => {
    const g = fresh(), ball = TOYS.find(t => t.id === 'ball')!;
    g.grab(ball.start); g.drop([ball.start[0] + 4, ball.start[1]]);
    run(g, TUNING.hop + 0.05);
    expect(g.toys.find(t => t.id === 'ball')!.placed).toBe(true);
  });

  it('a toy let go in the wrong place goes back to the rug, and its home lights up', () => {
    const g = fresh(), dino = TOYS.find(t => t.id === 'dino')!, wrong = TOYS.find(t => t.id === 'book')!.home;
    g.grab(dino.start); g.drag(wrong); g.drop(wrong);
    expect(g.events).toContain('wrong:dino');
    expect(g.glow?.toy).toBe('dino');
    run(g, TUNING.hop + 0.05);
    const toy = g.toys.find(t => t.id === 'dino')!;
    expect(toy.placed).toBe(false); expect(toy.at).toEqual(dino.start);
  });

  it('picks up nothing away from the toys, or once the room is tidy', () => {
    const g = fresh();
    expect(g.grab([50, 50])).toBeNull();
    const t = tidied();
    expect(t.phase).toBe('bed');
    expect(t.grab(TOYS[0].home)).toBeNull();
  });
});

describe('Godnatt: bedtime', () => {
  it('goes to bed only once the room is tidy', () => {
    const g = fresh();
    g.toBed(); expect(g.phase).toBe('tidy'); expect(g.events).toContain('notyet:bed');
    const t = tidied();
    t.toBed(); expect(t.phase).toBe('goodnight'); expect(t.inBed).toBe(0);
  });

  it('says goodnight to each animal once, then the lamp goes out and the night comes', () => {
    const g = tidied(); g.toBed();
    g.lampOff(); expect(g.events).toContain('notyet:lamp'); expect(g.phase).toBe('goodnight');
    for (const a of ANIMALS) { g.sayGoodnight(a.id); g.sayGoodnight(a.id); }
    expect(g.asleep).toHaveLength(ANIMALS.length);
    expect(g.phase).toBe('lamp');
    g.lampOff(); expect(g.phase).toBe('asleep');
    expect(g.won).toBe(false);
    run(g, TUNING.done + 0.1);
    expect(g.won).toBe(true); expect(g.events).toContain('won');
  });

  it('an animal tapped before bedtime only says hello', () => {
    const g = fresh();
    g.sayGoodnight('fox');
    expect(g.asleep).toHaveLength(0); expect(g.events).toContain('peek:fox');
  });

  it('can be played start to finish with nothing but the next-step key', () => {
    const g = fresh();
    for (let i = 0; i < 40 && !g.won; i++) { g.primary(); run(g, 1); }
    expect(g.won).toBe(true);
  });

  it('points at the next thing to do when nothing happens for a while', () => {
    const g = fresh();
    run(g, TUNING.hintAfter + 0.1); expect(g.hint).toBe(TOYS[0].id);
    const t = tidied(); run(t, TUNING.hintAfter + 0.1); expect(t.hint).toBe('bed');
    t.toBed(); run(t, TUNING.hintAfter + 0.1); expect(t.hint).toBe(ANIMALS[0].id);
  });
});

describe('Godnatt: the toy piano', () => {
  it('plays any key freely, and only while it is open', () => {
    const g = fresh();
    g.play(3); expect(g.events).toHaveLength(0);
    g.openPiano(); g.play(3); g.play(7);
    expect(g.events).toEqual(['piano', 'note:3', 'note:7']);
    g.play(9); expect(g.events).toHaveLength(3);
  });

  it('plays along with Blinka lilla stjärna: right keys move the song on, others just play', () => {
    const g = fresh();
    g.openPiano(); g.toggleAlong();
    g.play(SONG[0]); g.play(SONG[1]); expect(g.piano.next).toBe(2);
    g.play(7); expect(g.piano.next).toBe(2);
    for (let i = 2; i < SONG.length; i++) g.play(SONG[i]);
    expect(g.events).toContain('song'); expect(g.piano.next).toBe(0);
  });

  it('sets down a toy in hand when the piano opens, and closes when the lamp goes out', () => {
    const g = fresh();
    g.grab(TOYS[0].start); g.openPiano();
    expect(g.held).toBeNull();
    g.closePiano();
    const t = tidied(); t.toBed(); for (const a of ANIMALS) t.sayGoodnight(a.id);
    t.openPiano(); t.lampOff();
    expect(t.piano.open).toBe(false);
  });
});
