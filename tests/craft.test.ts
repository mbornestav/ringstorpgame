import { describe, expect, it } from 'vitest';
import { BIN, CURSOR_SPEED, CraftRun, Picture, inside, regionAt } from '../src/play/family/craft-run';
import { seeded } from '../src/play/family/hide-run';
import { CRAYONS, PAGES, PAPER, PAPER_WHITE, SIZES, SPONGE_WORK, STAMPS, STICKERS, STICKER_SIZES, TRACES, guidePoints, pageOf, traceOf } from '../src/play/family/games/pyssel';

const run = () => { const g = new CraftRun(seeded(1)); g.events = []; return g; };
/** A line drawn by a finger through the points (paper units). */
const draw = (g: CraftRun, pts: Array<[number, number]>) => { g.press(pts[0]); for (const p of pts.slice(1)) g.drag(p); g.release(); };

describe('Pysselhörnan: the colouring pages', () => {
  it('finds the part under a point: ellipses, rectangles and polygons, frontmost first', () => {
    expect(inside({ e: [10, 10, 5, 3] }, 14, 10)).toBe(true);
    expect(inside({ e: [10, 10, 5, 3] }, 10, 14)).toBe(false);
    expect(inside({ r: [0, 0, 10, 10] }, 10, 10)).toBe(true);
    expect(inside({ p: [[0, 0], [10, 0], [0, 10]] }, 2, 2)).toBe(true);
    expect(inside({ p: [[0, 0], [10, 0], [0, 10]] }, 8, 8)).toBe(false);
    const house = pageOf('house'), door = house.regions.findIndex(s => 'r' in s && s.r[0] === 255);
    expect(regionAt(house, 280, 290)).toBe(door);
  });

  it('has ten pages, each covering the whole sheet so the bucket always finds something', () => {
    expect(PAGES).toHaveLength(10);
    for (const page of PAGES) for (let x = 1; x < PAPER.w; x += 29) for (let y = 1; y < PAPER.h; y += 29) expect(regionAt(page, x, y), page.id).toBeGreaterThanOrEqual(0);
  });

  it('keeps every part of every page on the paper', () => {
    for (const page of PAGES) for (const s of page.regions) {
      const pts = 'e' in s ? [[s.e[0] - s.e[2], s.e[1] - s.e[3]], [s.e[0] + s.e[2], s.e[1] + s.e[3]]] : 'r' in s ? [[s.r[0], s.r[1]], [s.r[0] + s.r[2], s.r[1] + s.r[3]]] : s.p;
      for (const [x, y] of pts) { expect(x, page.id).toBeGreaterThanOrEqual(-60); expect(x).toBeLessThanOrEqual(PAPER.w + 60); expect(y).toBeGreaterThanOrEqual(-1); expect(y).toBeLessThanOrEqual(PAPER.h + 1); }
    }
  });
});

describe('Pysselhörnan: magic brushes', () => {
  it('draws with each brush in the chosen colour and size, and the stamp brush tapped again changes stamp', () => {
    const g = run();
    g.setColour(CRAYONS[5].colour); g.setSize(2);
    for (const b of ['crayon', 'rainbow', 'glitter', 'stamp', 'neon', 'eraser'] as const) { g.setBrush(b); draw(g, [[100, 100], [150, 120], [200, 100]]); }
    expect(g.picture.strokes.map(s => s.brush)).toEqual(['crayon', 'rainbow', 'glitter', 'stamp', 'neon', 'eraser']);
    expect(g.picture.strokes[1]).toMatchObject({ colour: CRAYONS[5].colour, size: SIZES[2] });
    expect(g.picture.strokes[3].stamp).toBe('heart');
    // The eraser was in the hand: the first tap takes the stamp brush, the next ones change the stamp.
    g.setBrush('stamp'); expect(g.stamp).toBe(STAMPS[0].id);
    g.setBrush('stamp'); expect(g.stamp).toBe(STAMPS[1].id);
    g.setBrush('stamp'); expect(g.stamp).toBe(STAMPS[2].id);
  });

  it('a crayon keeps the brush (but puts the eraser down), and lines stay on the paper', () => {
    const g = run();
    g.setBrush('glitter'); g.setColour(CRAYONS[2].colour); expect(g.tool).toBe('glitter');
    g.setBrush('eraser'); g.setColour(CRAYONS[2].colour); expect(g.tool).toBe('crayon');
    draw(g, [[-30, 50], [PAPER.w + 80, PAPER.h + 80]]);
    expect(g.picture.strokes[0].points).toEqual([[0, 50], [PAPER.w, PAPER.h]]);
  });

  it('the mirror butterfly goes round 1, 2, 4, 8 and each line remembers its mirrors', () => {
    const g = run();
    expect(g.sym).toBe(1);
    g.cycleSym(); draw(g, [[10, 10], [40, 40]]);
    g.cycleSym(); draw(g, [[10, 10], [40, 40]]);
    g.cycleSym(); draw(g, [[10, 10], [40, 40]]);
    g.cycleSym(); expect(g.sym).toBe(1);
    expect(g.picture.strokes.map(s => s.sym)).toEqual([2, 4, 8]);
  });

  it('remembers a seed per line, so glitter and stamps look the same every time', () => {
    const g = run();
    g.setBrush('glitter'); draw(g, [[10, 10], [80, 80]]); draw(g, [[10, 10], [80, 80]]);
    expect(g.picture.strokes[0].seed).not.toBe(g.picture.strokes[1].seed);
  });
});

describe('Pysselhörnan: stickers', () => {
  it('has the family and friends, things and shapes', () => {
    expect(STICKERS.filter(s => s.page === 'family').map(s => s.id)).toEqual(['carl', 'mamma', 'pappa', 'nallen', 'harry', 'aylan', 'frej', 'chloe', 'emilio']);
    for (const p of ['things', 'shapes'] as const) expect(STICKERS.filter(s => s.page === p).length).toBeLessThanOrEqual(12);
  });

  it('carries a sticker from the sheet onto the paper; dropped off the paper it is not stuck on', () => {
    const g = run();
    g.carryNew('mamma', [700, 100]); g.drag([200, 150]); g.release();
    expect(g.picture.stickers.map(s => s.sticker)).toEqual(['mamma']);
    expect(g.selected).toBe(g.picture.stickers[0].id);
    g.carryNew('pappa', [700, 100]); g.drag([650, 200]); g.release();
    expect(g.picture.stickers).toHaveLength(1);
  });

  it('moves, resizes and bins stickers, and undoes each step', () => {
    const g = run();
    g.pickSticker('star'); g.press([100, 100]); g.release();
    const id = g.picture.stickers[0].id;
    // A press on it picks it up instead of adding another.
    g.press([105, 102]); g.drag([305, 202]); g.release();
    expect(g.picture.stickers).toHaveLength(1);
    expect([g.picture.stickers[0].x, g.picture.stickers[0].y]).toEqual([300, 200]);
    // Bigger (it starts in the middle size), and no bigger than the biggest.
    g.resizeSelected(1); g.resizeSelected(1);
    expect(g.picture.stickers[0].size).toBe(STICKER_SIZES.length - 1);
    g.undo(); expect(g.picture.stickers[0].size).toBe(1);
    g.undo(); expect([g.picture.stickers[0].x, g.picture.stickers[0].y]).toEqual([100, 100]);
    // Dragged onto the bin: thrown away, and back again with undo.
    g.press([100, 100]); g.drag([BIN.x, BIN.y]); expect(g.overBin).toBe(true); g.release();
    expect(g.picture.stickers).toHaveLength(0); expect(g.events).toContain('bin');
    g.undo(); expect(g.picture.stickers.map(s => s.id)).toEqual([id]);
  });

  it('moves the chosen sticker with the keyboard and throws it away with Delete', () => {
    const g = run();
    g.pickSticker('fox'); g.press([100, 100]); g.release();
    g.nudgeSelected(10, 0); g.nudgeSelected(0, 10);
    expect([g.picture.stickers[0].x, g.picture.stickers[0].y]).toEqual([110, 110]);
    g.removeSelected(); expect(g.picture.stickers).toHaveLength(0); expect(g.selected).toBeNull();
  });
});

describe('Pysselhörnan: papers, patterns, the sponge', () => {
  it('fills with patterns, and undoes them', () => {
    const page = new Picture(pageOf('teddy'));
    expect(page.fill([290, 152], '#8f5a36', 'dots')).toBe(true);
    expect(page.fill([290, 152], '#8f5a36', 'dots')).toBe(false);
    expect(page.fill([290, 152], '#8f5a36', 'stripes')).toBe(true);
    const head = regionAt(pageOf('teddy'), 290, 152);
    expect(page.fills[head]).toEqual({ colour: '#8f5a36', pattern: 'stripes' });
    page.undo(); expect(page.fills[head]).toEqual({ colour: '#8f5a36', pattern: 'dots' });
    const plain = new Picture(null);
    plain.fill([5, 5], '#6fbde8', 'stars'); expect(plain.background).toEqual({ colour: '#6fbde8', pattern: 'stars' });
    plain.undo(); expect(plain.background.colour).toBe(PAPER_WHITE);
  });

  it('chooses a pattern by putting the bucket in the hand; scratch paper cannot be filled', () => {
    const g = run();
    g.setPattern('hearts'); expect(g.tool).toBe('bucket');
    g.newPaper({ paper: 'scratch' });
    expect(g.picture.scratch).toBe(true);
    expect(g.picture.fill([10, 10], '#ffffff', 'none')).toBe(false);
    g.newPaper({ paper: 'black' }); expect(g.tool).toBe('neon');
    g.newPaper({ page: 'rocket' }); expect(g.tool).toBe('bucket');
  });

  it('the sponge wipes the sheet only after a good rub, and undo brings it all back', () => {
    const g = run();
    draw(g, [[10, 10], [200, 200]]); g.pickSticker('sun'); g.press([300, 300]); g.release();
    g.setSponge();
    g.press([100, 100]); g.drag([300, 100]); g.release();
    expect(g.picture.strokes).toHaveLength(1);
    g.press([100, 100]);
    for (let i = 0; i < 20; i++) g.drag([i % 2 ? 100 : 400, 100]);
    g.release();
    expect(g.events).toContain('wipe');
    expect(g.picture.strokes).toHaveLength(0); expect(g.picture.stickers).toHaveLength(0);
    g.undo(); expect(g.picture.strokes).toHaveLength(1); expect(g.picture.stickers).toHaveLength(1);
    expect(SPONGE_WORK).toBeGreaterThan(200);
  });
});

describe('Pysselhörnan: tracing his name', () => {
  it('lays out C A R L - O T T O in two rows on the paper', () => {
    const name = traceOf('name');
    expect(name.letters.map(l => l.char).join('')).toBe('CARL-OTTO');
    for (const l of name.letters) for (const s of l.strokes) for (const [x, y] of s) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(PAPER.w); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(PAPER.h); }
    expect(TRACES.map(t => t.id)).toEqual(['name', 'numbers']);
  });

  it('lights a letter up once a line has gone over most of it, and not before', () => {
    const g = run();
    g.newPaper({ trace: 'name' });
    const L = g.picture.trace!.letters[3], pts = guidePoints(L.strokes);
    draw(g, pts.slice(0, Math.floor(pts.length / 2)) as Array<[number, number]>);
    expect(g.picture.traced[3]).toBe(false);
    draw(g, pts as Array<[number, number]>);
    expect(g.picture.traced[3]).toBe(true); expect(g.events).toContain('letter:3');
    g.undo(); expect(g.picture.traced[3]).toBe(false);
  });

  it('cheers when the whole name is written', () => {
    const g = run();
    g.newPaper({ trace: 'name' });
    for (const l of g.picture.trace!.letters) draw(g, guidePoints(l.strokes) as Array<[number, number]>);
    expect(g.picture.traced.every(Boolean)).toBe(true); expect(g.events).toContain('traced');
  });
});

describe('Pysselhörnan: the keyboard, the gallery, putting it up', () => {
  it('draws with the keyboard: the pen moves, goes down and lifts', () => {
    const g = run();
    const [x0, y0] = g.cursor;
    g.move(CURSOR_SPEED / 4, 0); expect(g.cursor).toEqual([x0 + CURSOR_SPEED / 4, y0]);
    g.action(); g.move(0, 30); g.move(0, 30); g.action(); g.move(0, 30);
    expect(g.picture.strokes[0].points).toHaveLength(3);
    g.nextBrush(); expect(g.tool).toBe('rainbow');
  });

  it('will not put up an empty sheet, puts up anything else, and opens the gallery', () => {
    const g = run();
    expect(g.hang()).toBe(false); expect(g.events).toContain('empty');
    draw(g, [[10, 10], [20, 20]]);
    expect(g.hang()).toBe(true); expect(g.mode).toBe('hung');
    g.openGallery(); expect(g.mode).toBe('gallery');
    g.choosePicture(2); expect(g.chosen).toBe(2);
    g.keepDrawing(); expect(g.mode).toBe('drawing');
  });

  it('turns the pages of sheets, and "Spela" makes the picture come alive', () => {
    const g = run();
    g.choose(); g.turnChoosePage(2); expect(g.choosePage).toBe(1); g.turnChoosePage(2); expect(g.choosePage).toBe(0);
    g.keepDrawing(); g.toggleAlive(); expect(g.alive).toBe(true); expect(g.events).toContain('alive');
    g.newPaper({ paper: 'pink' }); expect(g.alive).toBe(false);
  });
});
