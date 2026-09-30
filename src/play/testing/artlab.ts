import Phaser from 'phaser';
import { Backdrop, CHUNK, CHUNK_PAD, DISTANT_PARALLAX, DISTANT_SEGMENT, HORIZON, bakeClouds, bakeSky } from '../../side/backdrop';
import { LOOKS, POSES, drawFighter, type Look, type Pose } from '../../side/fighters';
import { godsStage } from '../../side/gods-stage';
import { roadBackStage, roadOutStage, yardStage } from '../../side/heist-stages';
import { HEIGHT, WIDTH } from '../../side/layout';
import { setArtMode } from '../../side/pixel';
import { paletteFor } from '../../side/palettes';
import { addRetroImage } from '../world/retro-shader';
import { stageFor, type Stage } from '../../side/stage';
import { compileLevel, levelById } from '../../side/levels';
import { drawIllustratedActor } from '../../phaser/illustrated-actors';
import { RENDER_SCALE } from '../config';

// Development-only lab for the art: `/?artlab=1&stage=shop|homes|gods|road&x=<camera>&mode=retro|smooth|pixel`.
// It bakes real stage chunks and a row of fighters, shows them through the same zoomed camera the game uses, and reports
// bake times and texture sizes on `window.__artlab`, so the look and the cost can be judged before the rollout.

interface Stats { mode: string; scale: number; bakeMs: number[]; textureBytes: number; chunks: number[] }

const stageOf = (name: string): Stage => name === 'gods' ? godsStage() : name === 'road' ? roadOutStage() : name === 'yard' ? yardStage() : name === 'back' ? roadBackStage() : name === 'shop' ? stageFor('kurir') : name === 'marcus' ? stageFor('marcus') : name === 'both' ? stageFor('marcus-kurir') : stageFor('direct');

function actorCanvas(look: Look, pose: Pose, facing: 1 | -1, S: number, smooth: boolean, parcel: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128 * S; canvas.height = 96 * S;
  const c = canvas.getContext('2d')!;
  c.scale(S, S);
  if (smooth) {
    const shadow = c.createRadialGradient(64, 84, 0.5, 64, 84, 14);
    shadow.addColorStop(0, 'rgba(29, 32, 28, 0.34)'); shadow.addColorStop(1, 'rgba(29, 32, 28, 0)');
    c.save(); c.translate(64, 84); c.scale(1, 0.28); c.translate(-64, -84); c.fillStyle = shadow; c.fillRect(40, 60, 48, 48); c.restore();
    drawIllustratedActor(c, 64, 84, facing, look, pose, parcel, true);
  } else {
    c.imageSmoothingEnabled = false;
    drawFighter(c, 64, 84, 0, facing, look, pose, { parcel, satchel: true });
  }
  return canvas;
}

export class ArtLabScene extends Phaser.Scene {
  constructor() { super('ArtLab'); }

  create(): void {
    const q = new URLSearchParams(location.search);
    const mode = q.get('mode') === 'pixel' || q.get('mode') === 'smooth' ? q.get('mode') as 'pixel' | 'smooth' : 'retro';
    const smooth = mode !== 'pixel', retro = mode === 'retro';
    const which = q.get('stage') ?? 'shop';
    const S = mode === 'smooth' ? RENDER_SCALE : 1;
    setArtMode(mode);
    // `level=<id>` previews a level file's street instead of a built-in one.
    const file = q.get('level') ? levelById(q.get('level')!) : undefined;
    const stage = file ? compileLevel(file) : stageOf(which);
    // `at=<role>` (kurir, statoil, bildeve, ...) centres on that landmark; otherwise `x` or a per-stage default.
    const landmark = stage.facades.find(f => f.role === q.get('at'));
    const camX = Number(q.get('x') ?? (landmark ? landmark.x0 - 20 : which === 'shop' ? (stage.shopX ?? 1000) - 220 : which === 'homes' ? 700 : 300));
    const stats: Stats = { mode, scale: S, bakeMs: [], textureBytes: 0, chunks: [] };
    const filter = mode === 'smooth' ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST;
    // Retro composes one 480x270 frame, as the game does, and shows it through the palette shader.
    const frame = document.createElement('canvas');
    frame.width = WIDTH; frame.height = HEIGHT;
    const fc = frame.getContext('2d')!;
    const canvases = new Map<string, HTMLCanvasElement>();
    const add = (key: string, canvas: HTMLCanvasElement) => {
      stats.textureBytes += canvas.width * canvas.height * 4;
      if (retro) { canvases.set(key, canvas); return key; }
      this.textures.addCanvas(key, canvas)!.setFilter(filter);
      return key;
    };
    const place = (key: string, x: number, y: number, depth: number, factor = 1) => {
      if (retro) { fc.drawImage(canvases.get(key)!, Math.round(x - camX * factor), y); return; }
      this.add.image(x, y, key).setOrigin(0, 0).setScale(1 / S).setScrollFactor(factor, 0).setDepth(depth);
    };

    // Sky and clouds, then the distant layer, the street chunks and the fighters, back to front.
    place(add('sky', bakeSky(S)), 0, 0, 0, 0);
    place(add('clouds', bakeClouds(S)), 0, 0, 1, 0.06);
    const bd = new Backdrop(stage, S);
    if (smooth) {
      for (let i = 0; i < bd.distantSegments; i++) {
        if (i * DISTANT_SEGMENT - CHUNK_PAD > camX * DISTANT_PARALLAX + WIDTH || (i + 1) * DISTANT_SEGMENT < camX * DISTANT_PARALLAX) continue;
        const started = performance.now();
        place(add(`distant-${i}`, bd.distantSegment(i)), i * DISTANT_SEGMENT - CHUNK_PAD, 0, 2, DISTANT_PARALLAX);
        stats.bakeMs.push(performance.now() - started);
      }
    } else place(add('distant', bd.distant()), 0, 0, 2, DISTANT_PARALLAX);
    const pad = smooth ? CHUNK_PAD : 0;
    for (let i = Math.max(0, Math.floor(camX / CHUNK)); i <= Math.floor((camX + WIDTH) / CHUNK); i++) {
      const started = performance.now();
      const canvas = bd.chunk(i);
      stats.bakeMs.push(performance.now() - started);
      stats.chunks.push(i);
      place(add(`chunk-${i}`, canvas), i * CHUNK - pad, 0, 3);
    }

    const cast: Array<[keyof typeof LOOKS, Pose, 1 | -1, number, number, boolean]> = [
      ['player', POSES.walk(1.1), 1, camX + 70, 226, true],
      ['runner', POSES.punch(1, 0.5), -1, camX + 150, 214, false],
      ['bruiser', POSES.windup(0.3), -1, camX + 230, 232, false],
      ['boss', POSES.loiter(1), -1, camX + 310, 220, false],
      ['police', POSES.grab(), 1, camX + 380, 238, false],
      ['dd', POSES.loiter(2), -1, camX + 440, 210, false],
    ];
    if (q.get('cast') !== '0') [...cast].sort((a, b) => a[4] - b[4]).forEach(([look, pose, facing, x, y, parcel], n) => {
      const key = add(`actor-${n}`, actorCanvas(LOOKS[look], pose, facing, S, smooth, parcel));
      if (retro) place(key, x - 64, y - 84, 0);
      else this.add.image(x - 64, y - 84, key).setOrigin(0, 0).setScale(1 / S).setDepth(200 + y);
    });

    // The game's camera: origin top-left and zoomed, so world units are logical pixels. Snapped to the device grid.
    this.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE);
    if (retro) {
      this.textures.addCanvas('artlab-frame', frame)!.setFilter(filter);
      addRetroImage(this, 'artlab-frame', 0, 0, WIDTH, HEIGHT, () => paletteFor(stage.night ? 'night' : 'day'));
    } else this.cameras.main.setScroll(Math.round(camX * RENDER_SCALE) / RENDER_SCALE, 0);
    (window as unknown as { __artlab: unknown }).__artlab = { stats, parity: (i: number) => parity(stage, i, RENDER_SCALE), seam: (i: number) => seam(stage, i, RENDER_SCALE), camX };
  }
}

/**
 * How far the smooth chunk's silhouette strays from the pixel chunk's, on the alpha mask (which is the building, tree and
 * fence outline above the ground rows). The pixel chunk is scaled up with nearest-neighbour to compare like with like.
 */
function parity(stage: Stage, i: number, S: number): { mismatch1px: number; mismatch1logical: number; opaque: number } {
  setArtMode('pixel');
  const a = new Backdrop(stage, 1).chunk(i);
  setArtMode('smooth');
  const b = new Backdrop(stage, S).chunk(i);
  const w = CHUNK * S, h = HEIGHT * S;
  const scaled = document.createElement('canvas'); scaled.width = w; scaled.height = h;
  const sc = scaled.getContext('2d')!; sc.imageSmoothingEnabled = false; sc.drawImage(a, 0, 0, w, h);
  const cropped = document.createElement('canvas'); cropped.width = w; cropped.height = h;
  cropped.getContext('2d')!.drawImage(b, -CHUNK_PAD * S, 0);
  const ma = sc.getImageData(0, 0, w, h).data, mb = cropped.getContext('2d')!.getImageData(0, 0, w, h).data;
  const near = (mask: Uint8ClampedArray, x: number, y: number, r: number, want: boolean) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      if ((mask[(yy * w + xx) * 4 + 3] > 127) === want) return true;
    }
    return false;
  };
  let mismatch1 = 0, mismatchL = 0, opaque = 0;
  for (let y = 0; y < Math.min(h, HORIZON * S); y++) {
    for (let x = 0; x < w; x++) {
      const pa = ma[(y * w + x) * 4 + 3] > 127, pb = mb[(y * w + x) * 4 + 3] > 127;
      if (pa) opaque++;
      if (pa === pb) continue;
      if (!near(mb, x, y, 1, pa)) mismatch1++;
      if (!near(mb, x, y, S, pa)) mismatchL++;
    }
  }
  return { mismatch1px: mismatch1, mismatch1logical: mismatchL, opaque };
}

/**
 * Chunks overlap by 2*CHUNK_PAD logical pixels. Everything in that strip is drawn from the same world coordinates by both
 * neighbours, so the two copies must match; any difference is a place where a seam could show.
 */
function seam(stage: Stage, i: number, S: number): { pixels: number; differing: number; maxDelta: number; rows: [number, number]; cols: [number, number]; samples: string[] } {
  setArtMode('smooth');
  const bd = new Backdrop(stage, S);
  const left = bd.chunk(i), right = bd.chunk(i + 1);
  const strip = 2 * CHUNK_PAD * S;
  const read = (canvas: HTMLCanvasElement, x: number) => canvas.getContext('2d')!.getImageData(x, 0, strip, canvas.height).data;
  const a = read(left, CHUNK * S), b = read(right, 0);
  let differing = 0, maxDelta = 0;
  const rows: [number, number] = [Infinity, -Infinity], cols: [number, number] = [Infinity, -Infinity], samples: string[] = [];
  for (let p = 0; p < a.length; p += 4) {
    // Compare premultiplied-ish colour so fully transparent sky pixels count as equal whatever their hidden RGB.
    const wa = a[p + 3] / 255, wb = b[p + 3] / 255;
    const d = Math.max(Math.abs(a[p] * wa - b[p] * wb), Math.abs(a[p + 1] * wa - b[p + 1] * wb), Math.abs(a[p + 2] * wa - b[p + 2] * wb), Math.abs(a[p + 3] - b[p + 3]));
    if (d > 2) {
      differing++; if (samples.length < 12) samples.push(`(${(p / 4) % strip},${Math.floor(p / 4 / strip)}) L=${a[p]},${a[p + 1]},${a[p + 2]},${a[p + 3]} R=${b[p]},${b[p + 1]},${b[p + 2]},${b[p + 3]}`);
      const px = p / 4, y = Math.floor(px / strip), x = px % strip;
      rows[0] = Math.min(rows[0], y); rows[1] = Math.max(rows[1], y); cols[0] = Math.min(cols[0], x); cols[1] = Math.max(cols[1], x);
    }
    maxDelta = Math.max(maxDelta, d);
  }
  return { pixels: a.length / 4, differing, maxDelta, rows, cols, samples };
}
