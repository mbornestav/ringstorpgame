import type { BikeRun } from './bike-run';

type C = CanvasRenderingContext2D;
const fill = (c: C, color: string, x: number, y: number, w: number, h: number) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
function oval(c: C, color: string, x: number, y: number, rx: number, ry: number): void {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}
function line(c: C, color: string, width: number, points: number[][]): void {
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
}

export function apple(c: C, x: number, y: number, size = 1): void {
  c.save(); c.translate(x, y); c.scale(size, size);
  oval(c, '#be3c32', -4, 1, 7, 9); oval(c, '#e35239', 4, 1, 7, 9);
  line(c, '#76563b', 2.5, [[0, -6], [2, -13]]);
  c.save(); c.translate(6, -11); c.rotate(-0.4); oval(c, '#5d7a39', 0, 0, 5, 2.5); c.restore();
  oval(c, '#ffb593', -5, -2, 1.8, 3); c.restore();
}

function tree(c: C, x: number, y: number, scale: number, fruit: boolean): void {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  oval(c, '#506d3a22', 0, 0, 63, 10);
  line(c, '#746045', 17, [[-2, 0], [0, -107], [-22, -151]]);
  line(c, '#746045', 8, [[0, -76], [36, -132]]);
  for (const [dx, dy, rx, ry, color] of [
    [-41, -145, 51, 43, '#5b793e'], [38, -146, 55, 43, '#769247'],
    [-11, -178, 63, 46, '#769247'], [9, -154, 58, 39, '#88a051'],
    [-23, -187, 39, 26, '#9aaa5e'],
  ] as const) oval(c, color, dx, dy, rx, ry);
  if (fruit) for (const [ax, ay] of [[-49, -146], [-18, -176], [38, -163], [19, -130], [-13, -137]]) apple(c, ax, ay, 0.65);
  c.restore();
}

function home(c: C, x: number): void {
  // Low white garages, flat roofs and a timber garden fence from the house reference.
  fill(c, '#ecebda', x, 272, 340, 109); fill(c, '#7e8880', x - 4, 268, 348, 8);
  fill(c, '#c7d0c1', x + 10, 287, 90, 46);
  fill(c, '#576f68', x + 15, 292, 80, 35);
  fill(c, '#ebece1', x + 53, 287, 5, 46);
  for (let i = 0; i < 2; i++) {
    fill(c, '#bfc8bc', x + 135 + i * 101, 292, 84, 89);
    for (let j = 0; j < 10; j++) fill(c, '#d9ded2', x + 138 + i * 101, 296 + j * 8, 78, 2);
  }
  for (let i = 0; i < 16; i++) fill(c, '#aa9a79', x - 65 + i * 10, 351 + (i % 3), 7, 46);
  fill(c, '#897d63', x - 67, 369, 164, 4);
}

export function preschool(c: C, x: number): void {
  // One low, flat-roofed building. All facade and trim surfaces stay solid red.
  oval(c, '#55704420', x + 187, 393, 219, 15);
  fill(c, '#be4338', x, 281, 388, 107);
  fill(c, '#9b352e', x + 388, 285, 20, 103);
  fill(c, '#8e332d', x - 7, 274, 420, 10);
  fill(c, '#d25142', x, 285, 388, 5);
  for (const wx of [20, 88, 236, 304]) {
    fill(c, '#92362d', x + wx - 5, 304, 59, 56);
    fill(c, '#b8dce0', x + wx, 309, 49, 45);
    fill(c, '#dcf0e5', x + wx + 4, 313, 19, 19);
    fill(c, '#a63b32', x + wx + 23, 309, 4, 45);
  }
  fill(c, '#922f29', x + 164, 305, 50, 83);
  fill(c, '#b1d6d3', x + 172, 313, 33, 40);
  oval(c, '#edc06f', x + 204, 366, 2.3, 2.3);
  c.fillStyle = '#fff0cf'; c.font = 'bold 12px "IBM Plex Sans", sans-serif'; c.textAlign = 'center';
  c.fillText('FÖRSKOLAN', x + 189, 298);
  // A small garden and parked scooters make the destination welcoming.
  for (let i = 0; i < 4; i++) { line(c, '#638e57', 2, [[x + 21 + i * 15, 388], [x + 21 + i * 15, 373]]); oval(c, '#edc062', x + 21 + i * 15, 373, 4, 4); }
  line(c, '#d8aa58', 4, [[x + 328, 382], [x + 351, 382], [x + 353, 360], [x + 347, 360]]);
  oval(c, '#455b58', x + 328, 386, 4, 4); oval(c, '#455b58', x + 352, 386, 4, 4);
}

export function cyclist(c: C, x: number, y: number, time: number, scale = 1): void {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  oval(c, '#3e514230', 0, 1, 54, 9);
  const spin = time * 8;
  for (const wx of [-32, 34]) {
    oval(c, '#344744', wx, -20, 21, 21); oval(c, '#eef0d6', wx, -20, 17, 17);
    for (let i = 0; i < 6; i++) {
      const angle = spin + i * Math.PI / 3;
      line(c, '#a9b9ae', 1.2, [[wx, -20], [wx + Math.cos(angle) * 16, -20 + Math.sin(angle) * 16]]);
    }
    oval(c, '#445d57', wx, -20, 3, 3);
  }
  line(c, '#3e8272', 5, [[-32, -20], [-14, -48], [5, -22], [-32, -20]]);
  line(c, '#3e8272', 5, [[-14, -48], [23, -48], [5, -22], [34, -20], [23, -48]]);
  line(c, '#405d52', 3, [[23, -48], [19, -64], [30, -66]]);
  line(c, '#344744', 6, [[-22, -50], [-6, -50]]);
  line(c, '#343d3b', 9, [[-12, -63], [-24, -42], [3 + Math.cos(spin) * 9, -20 + Math.sin(spin) * 7]]);
  line(c, '#788479', 10, [[-14, -65], [5, -47], [4 - Math.cos(spin) * 9, -20 - Math.sin(spin) * 7]]);
  line(c, '#e3dfca', 6, [[-1 - Math.cos(spin) * 9, -18 - Math.sin(spin) * 7], [10 - Math.cos(spin) * 9, -18 - Math.sin(spin) * 7]]);
  // Dark outdoor jacket with subtle camouflage patches, as in the reference.
  line(c, '#37413b', 24, [[-13, -66], [-5, -92]]);
  line(c, '#596257', 8, [[-20, -78], [-9, -76]]);
  line(c, '#252e2d', 8, [[-13, -89], [-4, -85]]);
  line(c, '#50594e', 10, [[-1, -87], [13, -68], [25, -67]]);
  oval(c, '#edbc8d', 27, -67, 5, 4);
  oval(c, '#efc498', 5, -108, 15, 18);
  oval(c, '#e5b384', -5, -106, 4, 5);
  oval(c, '#efc498', 19, -105, 4, 4);
  oval(c, '#ddbd70', 1, -118, 14, 8);
  line(c, '#d8b667', 3, [[10, -118], [14, -113]]);
  oval(c, '#314443', 13, -109, 1.4, 1.7);
  line(c, '#b57157', 1.5, [[14, -99], [18, -100]]);
  // The distinctive bright blue bicycle helmet.
  c.fillStyle = '#268ec1'; c.beginPath(); c.ellipse(1, -122, 23, 20, -0.15, Math.PI, Math.PI * 2); c.lineTo(24, -117); c.lineTo(-21, -114); c.closePath(); c.fill();
  line(c, '#60b3da', 4, [[-15, -132], [-5, -139], [7, -138]]);
  line(c, '#1c5d7b', 3, [[-2, -138], [1, -131]]);
  line(c, '#1c5d7b', 3, [[11, -135], [13, -129]]);
  line(c, '#344744', 2, [[-12, -116], [0, -94], [14, -115]]);
  oval(c, '#afbfbd', -13, -117, 3, 3);
  c.restore();
}

export function drawRide(c: C, ride: Pick<BikeRun, 'distance' | 'x' | 'y' | 'apples' | 'invulnerable' | 'elapsed'>): void {
  const sky = c.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, '#c3e2df'); sky.addColorStop(1, '#f0eed1');
  c.fillStyle = sky; c.fillRect(0, 0, 960, 540);
  oval(c, '#fff4cb', 785, 119, 38, 38); oval(c, '#fff4cb33', 785, 119, 55, 55);
  for (let i = 0; i < 5; i++) {
    const x = ((i * 267 + 100 - ride.distance * 0.06) % 1300 + 1300) % 1300 - 130;
    oval(c, '#f8f7e9cc', x, 116 + i % 2 * 48, 54, 13);
    oval(c, '#f8f7e9cc', x - 13, 108 + i % 2 * 48, 26, 19);
  }
  fill(c, '#c3cd9b', 0, 299, 960, 100);
  for (let i = -1; i < 10; i++) {
    const x = i * 152 - ride.distance * 0.2 % 152;
    oval(c, i % 2 ? '#b3c18c' : '#a7ba84', x, 299, 101, 56);
  }
  fill(c, '#a5b878', 0, 361, 960, 60);
  home(c, 16 - ride.distance * 0.85);
  for (let i = 0; i < 20; i++) {
    const x = 475 + i * 222 - ride.distance;
    if (x < -140 || x > 1100 || i * 222 > 3080) continue;
    tree(c, x, 386, 0.9 + i % 3 * 0.13, true);
  }
  preschool(c, 3600 - ride.distance + 280);
  fill(c, '#dfc99d', 0, 398, 960, 98);
  fill(c, '#ecd9b0', 0, 400, 960, 4);
  fill(c, '#b8a780', 0, 494, 960, 3);
  fill(c, '#94a96a', 0, 497, 960, 43);
  for (let i = 0; i < 65; i++) {
    const x = ((i * 81 - ride.distance * 1.2) % 1000 + 1000) % 1000;
    const y = 410 + i * 19 % 80;
    fill(c, '#c4ac813b', x, y, 4 + i % 4, 1.5);
    if (i % 3 === 0) { line(c, '#748e51', 1.5, [[x, 529], [x + 3, 519], [x + 7, 526]]); oval(c, '#f3e8b6', x + 3, 516, 2.5, 2.5); }
  }
  for (const a of ride.apples) {
    c.save(); c.globalAlpha = a.landed > 0 ? Math.max(0, 1 - a.landed / 0.6) : 1;
    oval(c, '#87592f22', a.x, a.y, 25, 8);
    c.strokeStyle = a.warning > 0 ? '#c45c38' : '#bd6a43'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(a.x, a.y, 24 + Math.sin(ride.elapsed * 9) * 3, 9, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  if (!ride.invulnerable || Math.floor(ride.elapsed * 12) % 2 === 0) cyclist(c, ride.x, ride.y, ride.elapsed);
  for (const a of ride.apples) {
    c.save(); c.globalAlpha = a.warning > 0 ? 0.55 : a.landed > 0 ? Math.max(0, 1 - a.landed / 0.6) : 1;
    apple(c, a.x, a.y - Math.max(8, a.height), 1.05); c.restore();
  }
}

export function drawRunPreview(c: C): void {
  fill(c, '#243b43', 0, 0, 960, 540);
  oval(c, '#eacb90', 778, 107, 34, 34);
  for (let i = 0; i < 7; i++) {
    const x = i * 156 - 35, y = 240 + i % 3 * 16;
    fill(c, i % 2 ? '#a5946d' : '#bbac86', x, y, 140, 170);
    c.fillStyle = '#4b4f48'; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 70, y - 53); c.lineTo(x + 148, y); c.fill();
    for (const dx of [16, 81]) for (const dy of [20, 90]) {
      fill(c, '#d8b76e', x + dx, y + dy, 36, 40); fill(c, '#807958', x + dx + 16, y + dy, 4, 40);
    }
  }
  fill(c, '#737565', 0, 402, 960, 20); fill(c, '#3a4b4b', 0, 422, 960, 118);
  for (let i = 0; i < 7; i++) fill(c, '#d7c798', i * 156 - 20, 491, 70, 4);
  line(c, '#293c3b', 7, [[705, 421], [705, 219], [734, 219]]);
  oval(c, '#efd78c', 735, 226, 12, 5); oval(c, '#efd78c0d', 735, 317, 61, 86);
  c.save(); c.translate(460, 464);
  oval(c, '#172c2c66', 0, 0, 41, 9);
  line(c, '#263233', 17, [[-5, -53], [-21, -3]]); line(c, '#344746', 17, [[4, -53], [24, -3]]);
  line(c, '#677567', 38, [[-3, -65], [0, -104]]);
  oval(c, '#d4ab83', 0, -130, 17, 21); oval(c, '#684f3c', -2, -143, 17, 10);
  line(c, '#697e6c', 12, [[-14, -99], [-33, -69]]); line(c, '#697e6c', 12, [[15, -97], [37, -77]]);
  fill(c, '#b38a56', 22, -84, 34, 32); fill(c, '#e0b474', 34, -84, 9, 32);
  c.restore();
}
