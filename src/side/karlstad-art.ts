import type { Facade, Stage } from './stage';
import type { FacadeBox } from './backdrop';
import { disc, ellipse, poly, rect, seg, text } from './pixel';

type C = CanvasRenderingContext2D;
const INK = '#344943', TRIM = '#f0e5c9';

export function cityBox(f: Facade): FacadeBox {
  const k = f.row === 1 ? 0.7 : 1, base = f.row === 1 ? 151 : 163;
  const height = f.landmark === 'cathedral' ? 143 : f.landmark === 'townhall' ? 116 : f.landmark === 'coffee' ? 121 : f.landmark === 'cityhouse' ? 27 * f.appearance.floors + 15 : 67;
  const cx = (f.x0 + f.x1) / 2, w = (f.x1 - f.x0) * k;
  return { x0: cx - w / 2, x1: cx + w / 2, base, floor: base - 3, wallTop: base - height * k + 12, top: base - height * k - 9, floorH: 27 * k, k };
}

function window(c: C, x: number, y: number, w: number, h: number, arch = false): void {
  rect(c, x - 2, y - 2, w + 4, h + 4, TRIM);
  rect(c, x, y, w, h, '#426772');
  if (arch) { c.fillStyle = '#426772'; c.beginPath(); c.ellipse(x + w / 2, y, w / 2, 7, 0, Math.PI, 0); c.fill(); }
  poly(c, [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2]], '#7fa3a5');
  rect(c, x + w / 2, y, 1, h, TRIM); rect(c, x, y + h * 0.48, w, 1, TRIM);
  rect(c, x - 3, y + h + 2, w + 6, 2, '#b2a989');
}

function tree(c: C, x: number, ground: number, size = 1, pine = false): void {
  rect(c, x - 2 * size, ground - 56 * size, 4 * size, 56 * size, '#725b44');
  if (pine) for (let i = 0; i < 4; i++) poly(c, [[x, ground - (98 - i * 15) * size], [x - (15 + i * 6) * size, ground - (45 - i * 9) * size], [x + (15 + i * 6) * size, ground - (45 - i * 9) * size]], i % 2 ? '#527a50' : '#40694b');
  else {
    ellipse(c, x, ground - 63 * size, 30 * size, 26 * size, '#47794f');
    ellipse(c, x - 13 * size, ground - 72 * size, 22 * size, 21 * size, '#619052');
    ellipse(c, x + 10 * size, ground - 83 * size, 20 * size, 18 * size, '#7a9c58');
  }
}

/** Photo-inspired facades, drawn locally in the same pixel/vector pipeline as the original streets. */
export function drawCityFacade(c: C, f: Facade): void {
  const b = cityBox(f), w = (b.x1 - b.x0) / b.k;
  c.save(); c.translate(b.x0, b.base); c.scale(b.k, b.k);
  const wall = f.appearance.wall;
  switch (f.landmark) {
    case 'townhall': {
      rect(c, 0, -107, w, 107, wall);
      poly(c, [[-5, -107], [18, -119], [w - 18, -119], [w + 5, -107]], '#566564');
      for (const y of [-105, -69, -35, -4]) { rect(c, -2, y, w + 4, 3, '#f3df9c'); rect(c, 0, y + 3, w, 1, '#ac955f'); }
      for (let x = 18; x < w - 22; x += 42) {
        rect(c, x - 10, -102, 4, 100, '#ead494');
        window(c, x, -93, 22, 22, true); window(c, x, -60, 22, 22); window(c, x, -26, 22, 24, true);
        rect(c, x - 2, -26, 26, 5, '#386959');
      }
      const mid = w / 2;
      rect(c, mid - 35, -122, 70, 15, wall); disc(c, mid, -122, 13, '#dbc183');
      disc(c, mid, -122, 9, '#f4edd1'); seg(c, mid, -122, mid + 4, -127, 1, INK); seg(c, mid, -122, mid - 4, -123, 1, INK);
      rect(c, mid - 1, -161, 1, 25, '#d9d6bb'); rect(c, mid, -160, 17, 10, '#597e98'); rect(c, mid + 5, -160, 2, 10, '#e4cb63'); rect(c, mid, -156, 17, 2, '#e4cb63');
      // The peace monument on its red stone plinth.
      rect(c, mid - 17, -20, 34, 25, '#956250'); rect(c, mid - 22, 2, 44, 5, '#b17f66');
      poly(c, [[mid - 9, -23], [mid - 6, -46], [mid + 5, -46], [mid + 10, -24]], '#487269');
      disc(c, mid, -52, 4, '#487269'); seg(c, mid - 5, -43, mid - 16, -62, 4, '#487269'); seg(c, mid + 4, -42, mid + 17, -59, 4, '#487269');
      seg(c, mid + 11, -62, mid + 23, -55, 3, '#39574f');
      break;
    }
    case 'stonebridge': {
      rect(c, 0, -55, w, 52, '#9c9786');
      for (let y = -53; y < 0; y += 7) { seg(c, 0, y, w, y, 1, '#777d71'); for (let x = y % 2 ? 0 : 11; x < w; x += 26) seg(c, x, y, x, y + 7, 1, '#777d71'); }
      const span = w / 12;
      for (let i = 0; i < 12; i++) {
        const x = span * (i + 0.5), rx = span * 0.36;
        c.fillStyle = '#74a2a5'; c.beginPath(); c.moveTo(x - rx, 0); c.lineTo(x - rx, -16); c.ellipse(x, -16, rx, 27, 0, Math.PI, 0); c.lineTo(x + rx, 0); c.fill();
        c.strokeStyle = '#c6c0a6'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, -16, rx + 2, 29, 0, Math.PI, 0); c.stroke();
      }
      rect(c, -4, -59, w + 8, 5, '#c7c6ae');
      for (let x = 0; x <= w; x += 38) rect(c, x, -70, 3, 11, '#676e60');
      seg(c, 0, -68, w, -68, 2, '#676e60');
      break;
    }
    case 'sandgrund': {
      rect(c, 0, -55, w, 55, '#f0eee2'); rect(c, -4, -60, w + 8, 6, '#f8f4df');
      rect(c, 17, -41, w - 34, 31, '#486f78');
      for (let x = 18; x < w - 15; x += 30) { rect(c, x, -41, 3, 31, '#e4e6dc'); seg(c, x + 5, -37, x + 21, -19, 2, '#80a4a8'); }
      const mid = w * 0.6;
      rect(c, mid - 93, -46, 186, 45, '#e5e5d9'); rect(c, mid - 22, -31, 42, 30, '#496b6d');
      rect(c, mid - 103, -50, 206, 5, '#fcf8e7');
      for (const x of [mid - 98, mid + 94]) rect(c, x, -73, 6, 73, '#f3f1e3');
      rect(c, mid - 98, -73, 198, 4, '#f3f1e3');
      text(c, 'SANDGRUND', mid - 69, -69, '#db742b', 2);
      text(c, 'LARS LERIN', mid - 36, -17, '#f2d7a0');
      seg(c, mid + 20, -3, mid + 111, 2, 5, '#d3d0bd');
      seg(c, mid + 20, -13, mid + 111, -8, 1, '#606f68');
      break;
    }
    case 'cathedral': {
      rect(c, 0, -62, w, 62, '#e8e0be'); poly(c, [[-6, -62], [w / 2, -90], [w + 6, -62]], '#587268');
      const mid = w / 2; rect(c, mid - 24, -113, 48, 113, '#ebe5c8'); rect(c, mid - 28, -117, 56, 6, '#c8c5ac');
      poly(c, [[mid - 28, -117], [mid - 13, -133], [mid, -151], [mid + 13, -133], [mid + 28, -117]], '#466c64');
      seg(c, mid, -150, mid, -163, 2, '#687565'); seg(c, mid - 4, -159, mid + 4, -159, 1, '#687565');
      disc(c, mid, -101, 9, '#596d60'); disc(c, mid, -101, 7, '#e8dfb8'); seg(c, mid, -101, mid + 3, -106, 1, INK);
      for (let x = 24; x < w; x += 49) window(c, x, -46, 16, 29, true);
      rect(c, mid - 12, -27, 24, 27, '#6a6d51'); break;
    }
    case 'coffee': {
      rect(c, 0, -112, w, 112, '#925947');
      for (let y = -110; y < 0; y += 5) seg(c, 0, y, w, y, 1, '#af7760');
      for (let y = -98; y < -15; y += 27) for (let x = 15; x < w - 20; x += 39) window(c, x, y, 19, 17);
      rect(c, -3, -117, w + 6, 5, '#67625b');
      rect(c, w * 0.36, -117, w * 0.28, 28, '#72537d'); text(c, 'KAFFEROSTERI', w * 0.36 + 10, -107, '#f2dab0', 2);
      for (let x = 30; x < w - 20; x += 75) rect(c, x, -20, 45, 20, '#514a45');
      break;
    }
    case 'cafe': {
      rect(c, 0, -48, w, 48, wall); poly(c, [[-6, -48], [15, -67], [w - 15, -67], [w + 6, -48]], '#697262');
      for (let x = 18; x < w - 18; x += 42) window(c, x, -34, 24, 26);
      rect(c, w / 2 - 16, -35, 32, 35, '#436154');
      rect(c, 12, -44, w - 24, 10, '#f5e6b5'); for (let x = 12; x < w - 12; x += 18) rect(c, x, -44, 9, 10, '#688d68');
      text(c, 'FIKA', w / 2 - 15, -61, '#fff3cd', 2);
      for (const x of [55, w - 55]) { ellipse(c, x, 0, 14, 3, '#baa176'); seg(c, x, 0, x, 9, 2, '#637261'); }
      break;
    }
    case 'park': {
      rect(c, 0, -53, w, 53, '#aa4f3b');
      for (let x = 0; x < w; x += 5) seg(c, x, -52, x, 0, 1, '#893c30');
      poly(c, [[-7, -53], [w / 2, -83], [w + 7, -53]], '#536652');
      for (let x = 25; x < w - 20; x += 63) window(c, x, -39, 27, 26);
      rect(c, w / 2 - 16, -34, 32, 34, '#486756'); text(c, 'STADSTRÄDGÅRDEN', w / 2 - 55, -51, '#f5e3bc');
      break;
    }
    case 'busstop': {
      rect(c, 18, -53, w - 36, 53, '#9ebeb9');
      for (let x = 18; x < w; x += 53) rect(c, x, -53, 4, 53, '#486165');
      rect(c, 9, -59, w - 18, 8, '#496164'); rect(c, 45, -19, 100, 5, '#a7936b');
      rect(c, w - 95, -41, 50, 29, '#ede5ca'); text(c, 'LILJEDAL', w - 91, -36, '#34574e');
      text(c, 'BUSSTATIONEN', 32, -72, '#34574e', 2);
      yellowBus(c, w / 2 - 85, 52, 1, 0); break;
    }
    default: {
      const h = 27 * f.appearance.floors + 7;
      rect(c, 0, -h, w, h, wall); poly(c, [[-4, -h], [15, -h - 14], [w - 15, -h - 14], [w + 4, -h]], f.appearance.roof);
      for (let y = -h + 9; y < -25; y += 27) { rect(c, 0, y - 6, w, 2, '#e6d9b9'); for (let x = 17; x < w - 20; x += 41) window(c, x, y, 18, 17); }
      rect(c, 0, -28, w, 3, '#ecdfc4');
      for (let x = 11; x < w - 25; x += 53) { window(c, x, -21, 34, 20); rect(c, x - 3, -24, 40, 4, '#526e64'); }
      rect(c, 0, -2, w, 3, '#8c8d7b'); break;
    }
  }
  c.restore();
}

/** Water goes behind the facades, with world-anchored reflections so baked chunks join cleanly. */
export function drawCityWater(c: C, stage: Stage, from: number, to: number): void {
  for (const run of stage.waters ?? []) {
    const x0 = Math.max(from, run.x0), x1 = Math.min(to, run.x1); if (x1 <= x0) continue;
    c.save(); c.beginPath(); c.rect(x0, 83, x1 - x0, 87); c.clip();
    rect(c, x0, 113, x1 - x0, 51, '#79a6a5'); rect(c, x0, 104, x1 - x0, 10, '#8aa678');
    for (let x = Math.floor(x0 / 41) * 41; x < x1 + 41; x += 41) {
      ellipse(c, x, 108, 32, 10 + Math.abs(x % 7), '#789371');
      for (let y = 120; y < 163; y += 8) seg(c, x + y % 15, y, x + 18 + y % 15, y, 1, y % 3 ? '#b2cdba' : '#5a9399');
    }
    if (run.value === 'harbour') {
      for (let x = Math.floor(x0 / 210) * 210; x < x1 + 210; x += 210) {
        poly(c, [[x + 20, 144], [x + 86, 144], [x + 72, 155], [x + 33, 155]], '#f1e9d3');
        rect(c, x + 36, 134, 31, 10, '#e5dfc5'); rect(c, x + 40, 136, 22, 6, '#486d79');
        seg(c, x + 53, 135, x + 53, 87, 1, '#746e5b'); poly(c, [[x + 55, 93], [x + 55, 130], [x + 78, 130]], '#eee8ce');
      }
    }
    rect(c, x0, 160, x1 - x0, 7, '#969b86');
    seg(c, x0, 153, x1, 153, 1, '#536a61');
    for (let x = Math.floor(x0 / 29) * 29; x < x1; x += 29) rect(c, x, 151, 2, 16, '#536a61');
    c.restore();
  }
}

/** Always yellow, including the stationary bus at the Karlstad stop. */
export function yellowBus(c: C, x: number, ground: number, scale: number, clock: number): void {
  c.save(); c.translate(x, ground); c.scale(scale, scale);
  ellipse(c, 83, 1, 91, 5, '#273c3933');
  rect(c, 0, -58, 168, 50, '#e9c333'); rect(c, 6, -64, 150, 7, '#f2d86a');
  rect(c, 5, -54, 150, 25, '#304b52');
  for (let wx = 12; wx < 131; wx += 25) { rect(c, wx, -51, 20, 19, '#769d9e'); rect(c, wx + 3, -48, 14, 5, '#bdd0b8'); }
  rect(c, 136, -50, 17, 39, '#3b585a'); rect(c, 138, -47, 13, 22, '#8bab9f'); seg(c, 144, -49, 144, -12, 1, '#e7ce5d');
  rect(c, 0, -26, 133, 3, '#c99920'); rect(c, 2, -11, 164, 4, '#77673e');
  rect(c, 117, -62, 39, 7, '#263f3c'); text(c, 'LILJEDAL', 120, -61, '#f7e57b', 0.65);
  for (const wx of [30, 129]) { disc(c, wx, -7, 11, '#273d3d'); disc(c, wx, -7, 6, '#94a29a'); seg(c, wx - Math.cos(clock * 8) * 4, -7, wx + Math.cos(clock * 8) * 4, -7, 1, '#445852'); }
  rect(c, 161, -24, 7, 6, '#fff1b8'); rect(c, 0, -22, 4, 5, '#c56138');
  c.restore();
}

function cabin(c: C): void {
  // User's Liljedal photo: red vertical cladding, white veranda, tiled roof, chimney, trellis, bench and number 17.
  rect(c, 140, 103, 286, 84, '#a73e30');
  for (let x = 143; x < 426; x += 5) { rect(c, x, 104, 1, 82, '#d16a4d'); rect(c, x + 2, 104, 1, 82, '#8b332a'); }
  poly(c, [[126, 103], [145, 88], [404, 70], [433, 99]], '#444944');
  for (let x = 139; x < 421; x += 6) seg(c, x, 99, x + 6, 88 - (x - 145) * 0.06, 1, '#787970');
  seg(c, 127, 103, 433, 99, 3, '#e2e3d1');
  rect(c, 299, 64, 14, 23, '#9c7755'); rect(c, 297, 63, 18, 4, '#464d45');
  for (let y = 69; y < 85; y += 4) seg(c, 299, y, 313, y, 1, '#6d6550');
  rect(c, 143, 108, 143, 73, '#e4e1c9'); rect(c, 151, 111, 55, 36, '#6f8680');
  for (let x = 154; x < 205; x += 7) seg(c, x, 112, x, 147, 1, '#b7c4b0');
  rect(c, 221, 119, 35, 62, '#d8d8c0'); window(c, 228, 125, 21, 20);
  poly(c, [[223, 146], [241, 150], [249, 174], [226, 173]], '#6e9148');
  poly(c, [[238, 151], [248, 149], [255, 175], [244, 176]], '#bc4634');
  rect(c, 131, 152, 80, 29, '#b64533');
  for (let x = 134; x < 210; x += 5) rect(c, x, 154, 1, 25, '#dc7d59');
  rect(c, 130, 151, 83, 4, '#ece7cf');
  for (const x of [139, 210, 280]) rect(c, x, 107, 5, 76, '#f1edda');
  rect(c, 131, 182, 158, 6, '#827966'); rect(c, 218, 188, 53, 4, '#a89879');
  window(c, 360, 117, 20, 31); window(c, 402, 117, 14, 27);
  text(c, '17', 337, 108, '#faf0d3');
  for (let x = 299; x < 341; x += 10) seg(c, x, 126, x, 174, 1, '#e0ddc4');
  for (let y = 131; y < 174; y += 10) seg(c, 295, y, 340, y, 1, '#e0ddc4');
  rect(c, 295, 173, 54, 5, '#586050'); rect(c, 299, 163, 48, 3, '#555e4c');
  seg(c, 300, 166, 299, 191, 2, '#464e44'); seg(c, 345, 166, 349, 191, 2, '#464e44');
  ellipse(c, 406, 159, 8, 6, '#344843'); seg(c, 406, 164, 406, 183, 2, '#59614c');
}

/** A short bus journey ends in the sunny garden of the supplied cabin reference. */
export function drawLiljedalJourney(c: C, elapsed: number): void {
  rect(c, 0, 0, 480, 270, '#a9d1d7'); disc(c, 72, 57, 18, '#fae8a7');
  for (let i = 0; i < 7; i++) ellipse(c, i * 90 - elapsed * 2 % 90, 91, 74, 38, '#9ab28a');
  rect(c, 0, 140, 480, 130, '#87a45f');
  const arrived = elapsed >= 4.5;
  for (let i = -1; i < 11; i++) tree(c, i * 64 - (arrived ? 0 : elapsed * 105 % 64), 166, 0.65 + (i + 2) % 3 * 0.2, true);
  if (arrived) cabin(c);
  rect(c, 0, 222, 480, 37, '#888b73'); rect(c, 0, 222, 480, 3, '#d4c79b');
  for (let i = 0; i < 8; i++) rect(c, i * 83 - (arrived ? 0 : elapsed * 150 % 83), 244, 31, 2, '#e7ddb4');
  const busX = arrived ? Math.max(-110, 130 - (elapsed - 4.5) * 64) : 153;
  yellowBus(c, busX, 239, 0.8, elapsed < 7 ? elapsed : 0);
  if (arrived) {
    rect(c, 61, 171, 3, 41, '#6e6f50'); rect(c, 30, 167, 67, 15, '#c3a56b'); text(c, 'LILJEDAL', 37, 171, '#304b3e');
    for (let i = 0; i < 24; i++) { const x = 103 + i * 15 % 356; seg(c, x, 205 + i % 7, x + 2, 201 + i % 7, 1, '#547948'); }
  } else { rect(c, 356, 147, 89, 16, '#537655'); text(c, 'LILJEDAL >', 363, 152, '#f1e6bd'); seg(c, 370, 163, 370, 197, 2, '#6a7560'); }
}
