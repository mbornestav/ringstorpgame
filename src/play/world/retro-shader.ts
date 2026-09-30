import Phaser from 'phaser';
import { MAX_COLOURS, type Palette } from '../../side/retro';

// Shows a low-resolution canvas texture as retro pixel art. The fragment shader runs at screen resolution but works in the
// texture's own pixels: it samples each source pixel at its centre (a crisp nearest-neighbour upscale at any size), pushes it
// by a 4×4 Bayer threshold for that pixel, and replaces it with the nearest palette colour. Doing this on the GPU costs
// nothing measurable; the same work on the CPU (read back, snap, upload) took 6–9 ms a frame.

const FRAGMENT = `
#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec3 uPalette[${MAX_COLOURS}];
uniform float uCount;
uniform float uSpread;
uniform vec2 uSize;
varying vec2 outTexCoord;

float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(a * 0.5) * 0.25 + bayer2(a) + 1.0 / 32.0 - 0.5; }

void main() {
  vec2 uv = outTexCoord;
  vec2 texel = min(floor(uv * uSize), uSize - 1.0);
  vec3 colour = texture2D(uMainSampler, (texel + 0.5) / uSize).rgb * 255.0 + bayer4(texel) * uSpread;
  vec3 best = uPalette[0];
  float bestD = 1e12;
  for (int i = 0; i < ${MAX_COLOURS}; i++) {
    if (float(i) >= uCount) break;
    vec3 p = uPalette[i] * 255.0;
    float rm = (colour.r + p.r) * 0.5;
    vec3 d = colour - p;
    float dist = (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
    if (dist < bestD) { bestD = dist; best = uPalette[i]; }
  }
  gl_FragColor = vec4(best, 1.0);
}`;

export interface RetroSource { palette: Palette; spread: number }

/**
 * A quad at (x, y) of `width` × `height` world units showing `texture` (whose size is the pixel grid) through the palette
 * that `source()` returns each frame.
 */
export function addRetroImage(scene: Phaser.Scene, texture: string, x: number, y: number, width: number, height: number,
  source: () => RetroSource): Phaser.GameObjects.Shader {
  const frame = scene.textures.getFrame(texture);
  let last: Palette | null = null, colours: Float32Array = new Float32Array(MAX_COLOURS * 3);
  const shader = scene.add.shader({
    name: 'RetroPalette',
    fragmentSource: FRAGMENT,
    setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
      const { palette, spread } = source();
      if (palette !== last) { last = palette; colours = palette.uniform(); }
      setUniform('uMainSampler', 0);
      setUniform('uPalette[0]', colours);
      setUniform('uCount', palette.colours.length);
      setUniform('uSpread', spread);
      setUniform('uSize', [frame.width, frame.height]);
    },
  }, x, y, width, height, [texture]);
  shader.setOrigin(0, 0);
  return shader;
}
