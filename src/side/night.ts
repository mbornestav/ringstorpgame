import type { Car } from './game';
import { HEIGHT, WIDTH } from './layout';
import { mix, rand, rect, disc } from './pixel';

// Night for the heist: a dark sky, everything drawn so far tinted blue, then light pooled back in
// around lamps, canopies, windows and headlamps. Actors are drawn after the tint, so they stay readable.

const SKY_H = 150;

/** A lamp, window or canopy that lights the ground and air around it. */
export interface Light { x: number; y: number; r: number; color: string; a?: number; flicker?: boolean }

export function bakeNightSky(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = SKY_H;
  const c = canvas.getContext('2d')!;
  const stops: Array<[number, string]> = [[0, '#141c3c'], [0.5, '#26305a'], [0.85, '#4a4a70'], [1, '#7a5a5e']];
  const colour = (t: number) => {
    for (let k = 1; k < stops.length; k++) if (t <= stops[k][0]) return mix(stops[k - 1][1], stops[k][1], (t - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]));
    return stops[stops.length - 1][1];
  };
  for (let y = 0; y < SKY_H; y++) {
    const band = Math.floor(y / 6) * 6;
    const t0 = band / SKY_H, t1 = Math.min(1, (band + 6) / SKY_H);
    for (let x = 0; x < WIDTH; x++) {
      c.fillStyle = colour(y - band >= 4 && (x + y) % 2 === 0 ? t1 : t0);
      c.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand(i, 1) * WIDTH), y = Math.floor(rand(i, 2) * 96);
    rect(c, x, y, 1, 1, rand(i, 3) > 0.8 ? '#ffffff' : '#a9b4d8');
  }
  // A thin moon.
  for (const [r, a] of [[26, 0.06], [16, 0.1]] as Array<[number, number]>) { c.fillStyle = `rgba(200, 215, 255, ${a})`; c.beginPath(); c.arc(392, 44, r, 0, Math.PI * 2); c.fill(); }
  disc(c, 392, 44, 8, '#e8eeff');
  disc(c, 396, 42, 7, '#26305a');
  return canvas;
}

/** Everything drawn so far goes dark and blue. */
export function nightTint(c: CanvasRenderingContext2D): void {
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = '#586a9e';
  c.fillRect(0, 0, WIDTH, HEIGHT);
  c.globalCompositeOperation = 'source-over';
}

/** A gentle tint for the people and cars, so they sit in the night without vanishing. */
export function actorTint(c: CanvasRenderingContext2D): void {
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = '#b9c1de';
  c.fillRect(0, 0, WIDTH, HEIGHT);
  c.globalCompositeOperation = 'source-over';
}

export function drawLights(c: CanvasRenderingContext2D, lights: Light[], cam: number, elapsed: number): void {
  c.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const x = l.x - cam;
    if (x < -l.r || x > WIDTH + l.r) continue;
    const flick = l.flicker ? 0.85 + Math.sin(elapsed * 23 + l.x) * 0.08 + rand(Math.floor(elapsed * 12), l.x) * 0.08 : 1;
    const g = c.createRadialGradient(x, l.y, 0, x, l.y, l.r);
    g.addColorStop(0, withAlpha(l.color, (l.a ?? 0.5) * flick));
    g.addColorStop(1, withAlpha(l.color, 0));
    c.fillStyle = g;
    c.fillRect(x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  c.globalCompositeOperation = 'source-over';
}

/** Headlamp beams thrown along the road, and the pool of light on the tarmac ahead. */
export function drawBeams(c: CanvasRenderingContext2D, cars: Car[], cam: number): void {
  c.globalCompositeOperation = 'lighter';
  for (const car of cars) {
    if (!car.lights) continue;
    const half = car.kind === 'truck' ? 104 : car.kind === 'police' ? 54 : 52;
    const fx = car.x - cam + car.dir * (half + 2), fy = car.y - 15;
    if (fx < -220 || fx > WIDTH + 220) continue;
    const reach = car.kind === 'police' ? 150 : 190;
    const g = c.createLinearGradient(fx, 0, fx + car.dir * reach, 0);
    g.addColorStop(0, 'rgba(255, 244, 190, 0.42)');
    g.addColorStop(1, 'rgba(255, 244, 190, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(fx, fy - 3); c.lineTo(fx + car.dir * reach, fy - 34); c.lineTo(fx + car.dir * reach, fy + 22); c.lineTo(fx, fy + 4);
    c.closePath(); c.fill();
    const glow = c.createRadialGradient(fx, fy, 0, fx, fy, 16);
    glow.addColorStop(0, 'rgba(255, 246, 200, 0.5)'); glow.addColorStop(1, 'rgba(255, 246, 200, 0)');
    c.fillStyle = glow; c.fillRect(fx - 16, fy - 16, 32, 32);
  }
  c.globalCompositeOperation = 'source-over';
}

export function nightAtmosphere(c: CanvasRenderingContext2D): void {
  c.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let y = 0; y < HEIGHT; y += 3) c.fillRect(0, y, WIDTH, 1);
  const vignette = c.createRadialGradient(WIDTH / 2, HEIGHT / 2, 100, WIDTH / 2, HEIGHT / 2, 320);
  vignette.addColorStop(0, 'rgba(2, 6, 18, 0)'); vignette.addColorStop(1, 'rgba(2, 6, 18, 0.5)');
  c.fillStyle = vignette; c.fillRect(0, 0, WIDTH, HEIGHT);
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
}
