import Phaser from 'phaser';
import { RENDER_SCALE } from './config';

// A CRT finish for the retro build, as a camera filter: the picture is softened a little sideways (phosphor glow), each
// logical pixel row gets a scanline, the columns carry a faint aperture-grille tint, bright areas bloom slightly, and the
// world cameras add a gentle vignette. It keeps the pixel art's structure but takes the hard, "too pixelated" edge off.
// Every scene camera gets the same filter, so the world and the interface over it read as one screen.

const NODE = 'FilterRetroCrt';

const FRAGMENT = `
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 resolution;
uniform float uPixel;
uniform float uVignette;
varying vec2 outTexCoord;

vec4 tap(vec2 offset) { return texture2D(uMainSampler, outTexCoord + offset / resolution); }

void main() {
  float s = uPixel * 0.34;
  // Phosphor spread: mostly sideways, as a CRT beam smears along its line.
  vec4 base = tap(vec2(0.0)) * 0.5 + (tap(vec2(-s, 0.0)) + tap(vec2(s, 0.0))) * 0.2 + (tap(vec2(0.0, -s * 0.5)) + tap(vec2(0.0, s * 0.5))) * 0.05;
  // A little bloom from a wider ring of samples, only where it is bright.
  vec4 wide = (tap(vec2(-uPixel * 1.5, 0.0)) + tap(vec2(uPixel * 1.5, 0.0)) + tap(vec2(0.0, -uPixel)) + tap(vec2(0.0, uPixel))) * 0.25;
  vec3 colour = base.rgb + max(wide.rgb - 0.55 * wide.a, 0.0) * 0.35;
  // Scanlines: darkest between logical pixel rows.
  float row = fract(gl_FragCoord.y / uPixel);
  float scan = 0.78 + 0.22 * sin(row * 3.14159);
  // Aperture grille: a faint red, green, blue tint across each run of three device columns.
  float column = mod(floor(gl_FragCoord.x), 3.0);
  vec3 mask = vec3(column == 0.0 ? 1.06 : 0.97, column == 1.0 ? 1.06 : 0.97, column == 2.0 ? 1.06 : 0.97);
  colour *= scan * mask * 1.12;
  if (uVignette > 0.0) {
    vec2 d = outTexCoord - 0.5;
    colour *= 1.0 - uVignette * dot(d, d) * 1.6;
  }
  gl_FragColor = vec4(min(colour, vec3(base.a)), base.a);
}`;

class CrtController extends Phaser.Filters.Controller {
  constructor(camera: Phaser.Cameras.Scene2D.Camera, readonly vignette: number) { super(camera, NODE); }
}

class CrtNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) { super(NODE, manager, undefined, FRAGMENT); }

  setupUniforms(controller: CrtController, drawingContext: Phaser.Renderer.WebGL.DrawingContext): void {
    this.programManager.setUniform('resolution', [drawingContext.width, drawingContext.height]);
    this.programManager.setUniform('uPixel', RENDER_SCALE);
    this.programManager.setUniform('uVignette', controller.vignette);
  }
}

const registered = new WeakSet<Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager>();

/** Adds the CRT finish to a scene's main camera. `vignette` (0–1) darkens the corners; the interface camera uses 0. */
export function addCrt(scene: Phaser.Scene, vignette = 0.35): void {
  const renderer = scene.sys.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const nodes = renderer.renderNodes;
  if (!registered.has(nodes)) { nodes.addNodeConstructor(NODE, CrtNode); registered.add(nodes); }
  const camera = scene.cameras.main;
  camera.filters.internal.add(new CrtController(camera, vignette));
}
