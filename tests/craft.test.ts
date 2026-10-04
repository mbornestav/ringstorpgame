import { describe, expect, it } from 'vitest';
import { CURSOR_SPEED, CraftRun, Picture, inside, regionAt } from '../src/play/family/craft-run';
import { seeded } from '../src/play/family/hide-run';
import { CRAYONS, PAGES, PAPER, PAPER_WHITE, SIZES, STICKERS, pageOf } from '../src/play/family/games/pyssel';

const run = () => { const g = new CraftRun(seeded(1)); g.events = []; return g; };

describe('Pysselhörnan: the colouring pages', () => {
  it('finds the part under a point: ellipses, rectangles and polygons, frontmost first', () => {
    expect(inside({ e: [10, 10, 5, 3] }, 14, 10)).toBe(true);
    expect(inside({ e: [10, 10, 5, 3] }, 10, 14)).toBe(false);
    expect(inside({ r: [0, 0, 10, 10] }, 10, 10)).toBe(true);
    expect(inside({ p: [[0, 0], [10, 0], [0, 10]] }, 2, 2)).toBe(true);
    expect(inside({ p: [[0, 0], [10, 0], [0, 10]] }, 8, 8)).toBe(false);
    const house = pageOf('house');
    // The door is in front of the wall, which is in front of the sky.
    const door = house.regions.findIndex(s => 'r' in s && s.r[0] === 255);
    expect(regionAt(house, 280, 290)).toBe(door);
    expect(regionAt(house, 20, 20)).toBe(0);
  });

  it('covers the whole sheet on every page, so the bucket always finds something', () => {
    for (const page of PAGES) for (let x = 1; x < PAPER.w; x += 29) for (let y = 1; y < PAPER.h; y += 29) expect(regionAt(page, x, y), page.id).toBeGreaterThanOrEqual(0);
  });

  it('keeps every part on the paper', () => {
    for (const page of PAGES) for (const s of page.regions) {
      const pts = 'e' in s ? [[s.e[0] - s.e[2], s.e[1] - s.e[3]], [s.e[0] + s.e[2], s.e[1] + s.e[3]]] : 'r' in s ? [[s.r[0], s.r[1]], [s.r[0] + s.r[2], s.r[1] + s.r[3]]] : s.p;
      for (const [x, y] of pts) { expect(x, page.id).toBeGreaterThanOrEqual(-1); expect(x).toBeLessThanOrEqual(PAPER.w + 1); expect(y).toBeGreaterThanOrEqual(-1); expect(y).toBeLessThanOrEqual(PAPER.h + 1); }
    }
  });
});

describe('Pysselhörnan: a picture', () => {
  it('draws lines, skipping points that do not move', () => {
    const p = new Picture(null);
    p.startStroke('#e2432f', 11, false, [10, 10]);
    p.extend([10.5, 10]); p.extend([30, 10]); p.extend([30, 40]);
    expect(p.strokes[0].points).toEqual([[10, 10], [30, 10], [30, 40]]);
    expect(p.marks).toBe(1);
  });

  it('fills a part of a page, or the whole of plain paper, and undoes step by step', () => {
    const page = new Picture(pageOf('teddy'));
    expect(page.fill([290, 152], '#8f5a36')).toBe(true);
    expect(page.fill([290, 152], '#8f5a36')).toBe(false); // already that colour: nothing to undo
    page.fill([290, 152], '#f2c230');
    page.stick('heart', [100, 100], 0.1);
    expect(page.marks).toBe(3);
    const head = regionAt(pageOf('teddy'), 290, 152);
    expect(page.fills[head]).toBe('#f2c230');
    page.undo(); expect(page.stickers).toHaveLength(0);
    page.undo(); expect(page.fills[head]).toBe('#8f5a36');
    page.undo(); expect(page.fills[head]).toBeNull();
    expect(page.undo()).toBe(false);
    const plain = new Picture(null);
    plain.fill([5, 5], '#6fbde8'); expect(plain.background).toBe('#6fbde8');
    plain.undo(); expect(plain.background).toBe(PAPER_WHITE);
  });

  it('counts every change, so a drawing of it is redrawn only when it changes', () => {
    const p = new Picture(null), v = p.version;
    p.startStroke('#000000', 5, false, [0, 0]); p.extend([20, 20]);
    expect(p.version).toBe(v + 2);
    p.extend([20.2, 20]); expect(p.version).toBe(v + 2);
  });
});

describe('Pysselhörnan: the crayons, the bucket, the stickers', () => {
  it('starts on plain paper with the red crayon', () => {
    const g = run();
    expect(g.mode).toBe('drawing');
    expect(g.tool).toBe('crayon');
    expect(g.colour).toBe(CRAYONS[0].colour);
    expect(g.picture.page).toBeNull();
  });

  it('draws by pointer with the chosen colour and size, and the eraser makes erasing lines', () => {
    const g = run();
    g.setColour(CRAYONS[5].colour); g.setSize(2);
    g.press([100, 100]); g.drag([150, 120]); g.release(); g.drag([200, 200]);
    expect(g.picture.strokes[0]).toMatchObject({ colour: CRAYONS[5].colour, size: SIZES[2], erase: false });
    expect(g.picture.strokes[0].points).toHaveLength(2);
    g.setTool('eraser'); g.press([120, 110]); g.release();
    expect(g.picture.strokes[1].erase).toBe(true);
    // A crayon puts the eraser down again.
    g.setColour(CRAYONS[1].colour); expect(g.tool).toBe('crayon');
  });

  it('keeps lines on the paper', () => {
    const g = run();
    g.press([-30, 50]); g.drag([PAPER.w + 80, PAPER.h + 80]);
    expect(g.picture.strokes[0].points).toEqual([[0, 50], [PAPER.w, PAPER.h]]);
  });

  it('a colouring page puts the bucket in the hand; a crayon keeps it there', () => {
    const g = run();
    g.choose(); expect(g.mode).toBe('choosing');
    g.newPaper('fox');
    expect(g.mode).toBe('drawing'); expect(g.tool).toBe('bucket'); expect(g.picture.page?.id).toBe('fox');
    g.setColour(CRAYONS[1].colour);
    expect(g.tool).toBe('bucket');
    g.press([280, 284]);
    expect(g.events).toContain('fill');
    expect(g.picture.fills.filter(Boolean)).toEqual([CRAYONS[1].colour]);
  });

  it('puts stickers on, each a little turned', () => {
    const g = run();
    for (const s of STICKERS) { g.setSticker(s.id); g.press([200, 200]); }
    expect(g.picture.stickers.map(s => s.sticker)).toEqual(STICKERS.map(s => s.id));
    for (const s of g.picture.stickers) expect(Math.abs(s.turn)).toBeLessThanOrEqual(0.3);
    expect(g.events.filter(e => e === 'sticker')).toHaveLength(STICKERS.length);
  });

  it('draws with the keyboard: the pen moves, goes down and lifts', () => {
    const g = run();
    const [x0, y0] = g.cursor;
    g.move(CURSOR_SPEED / 4, 0);
    expect(g.cursor).toEqual([x0 + CURSOR_SPEED / 4, y0]);
    expect(g.picture.marks).toBe(0);
    g.action(); expect(g.pen).toBe(true);
    g.move(0, 30); g.move(0, 30);
    g.action(); expect(g.pen).toBe(false);
    g.move(0, 30);
    expect(g.picture.strokes[0].points).toHaveLength(3);
    // The bucket acts where the pen is.
    g.setTool('bucket'); g.action();
    expect(g.picture.background).toBe(g.colour);
  });

  it('will not put up an empty sheet, puts up anything else, and starts a new one', () => {
    const g = run();
    expect(g.hang()).toBe(false); expect(g.events).toContain('empty'); expect(g.mode).toBe('drawing');
    g.press([10, 10]); g.release();
    expect(g.hang()).toBe(true); expect(g.mode).toBe('hung');
    g.press([50, 50]); expect(g.picture.marks).toBe(1); // nothing is drawn on a picture that is up
    g.choose(); g.newPaper(null);
    expect(g.picture.marks).toBe(0);
  });

  it('can go back to the picture from the choice of a new sheet', () => {
    const g = run();
    g.press([10, 10]); g.release();
    const picture = g.picture;
    g.choose(); g.keepDrawing();
    expect(g.mode).toBe('drawing'); expect(g.picture).toBe(picture);
  });
});
