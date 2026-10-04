import Phaser from 'phaser';
import { A11yMirror } from '../a11y/mirror';
import { RENDER_SCALE } from '../config';
import { isRetro } from '../../side/pixel';
import { UI_W } from '../theme';
import { Chrome } from '../ui/chrome';
import { HudCards } from '../ui/hud';
import type { Button } from '../ui/kit/button';
import { PanelHost } from '../ui/panel-host';
import { PhoneDrawer } from '../ui/phone-drawer';
import { PromptBar } from '../ui/prompt';
import { WorldHud } from '../ui/world-hud';
import { TouchPad } from '../ui/touch-pad';
import { isTouch } from '../input/touch';
import type { WorldScene } from './world';
import { controlsModel, footerModel, hudModel, mastheadModel, panelModel, phoneModel, promptModel, worldHudModel } from '../ui/models';
import { sessionOf } from './shared';
import { CRT } from '../look';
import { addCrt } from '../crt';

/** Visible on screen: itself and every container above it is shown and not faded out. */
function shown(object: Phaser.GameObjects.GameObject): boolean {
  for (let o: Phaser.GameObjects.GameObject | Phaser.GameObjects.Container | null = object; o; o = (o as Phaser.GameObjects.Components.Visible & { parentContainer?: Phaser.GameObjects.Container }).parentContainer ?? null) {
    const v = o as unknown as { visible: boolean; alpha: number };
    if (!v.visible || v.alpha < 0.05) return false;
  }
  return true;
}

/**
 * Everything drawn over the world, authored in a fixed 1440x810 space that the camera scales to the canvas: the top and
 * bottom chrome, HUD cards, prompt, overlay panels and the phone. Each frame the pure models are built once, handed to the
 * widgets, and mirrored into the hidden DOM for screen readers and keyboard focus.
 */
export class UIScene extends Phaser.Scene {
  private chrome!: Chrome;
  private cards!: HudCards;
  private worldHud!: WorldHud;
  private prompt!: PromptBar;
  private panels!: PanelHost;
  private phone!: PhoneDrawer;
  private mirror: A11yMirror | null = null;
  /** The on-screen stick and buttons, on touch screens only. */
  private touch: TouchPad | null = null;

  constructor() { super('UI'); }

  create(): void {
    const session = sessionOf(this);
    this.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE / 3);
    // Retro: whole-pixel positions keep the pixel fonts crisp; the CRT finish softens them like a screen would.
    if (isRetro()) this.cameras.main.setRoundPixels(true);
    if (CRT) addCrt(this, 0);
    // Back to front. The panels sit under the chrome, so the language and sound buttons stay bright and reachable.
    this.worldHud = new WorldHud(this);
    this.panels = new PanelHost(this, session);
    this.chrome = new Chrome(this, session);
    this.cards = new HudCards(this);
    if (isTouch()) this.touch = new TouchPad(this, session, () => (this.scene.get('World') as WorldScene | null)?.controls ?? null);
    this.prompt = new PromptBar(this, session);
    this.phone = new PhoneDrawer(this, session);
    const root = document.getElementById('a11y');
    if (root) this.mirror = new A11yMirror(root, session, id => this.showFocus(id));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.mirror?.destroy(); this.mirror = null; });
  }

  /** Every button that can be pressed by pointer, whether or not it is showing. */
  private controls(): Button[] {
    return [...this.panels.actions, this.chrome.lang, this.chrome.sound, this.chrome.chooser, this.prompt.button, this.phone.launcher, this.phone.action, this.phone.cancel, this.phone.pocket, ...(this.touch ? [this.touch.pause] : [])];
  }

  /**
   * Where a button is on the canvas, in game pixels, or null if it is not showing. Tests use it to click with a real mouse.
   */
  boundsOf(id: string): { x: number; y: number; width: number; height: number } | null {
    const button = this.controls().find(b => b.id === id && shown(b)), zoom = this.cameras.main.zoom;
    if (!button) {
      const pad = this.touch?.boundsOf(id);
      return pad ? { x: pad.x * zoom, y: pad.y * zoom, width: pad.width * zoom, height: pad.height * zoom } : null;
    }
    const m = button.getWorldTransformMatrix();
    return { x: m.tx * zoom, y: m.ty * zoom, width: button.width * m.scaleX * zoom, height: button.height * m.scaleY * zoom };
  }

  /** The DOM proxy that holds keyboard focus, drawn as a ring on the matching canvas control. */
  private showFocus(id: string | null): void {
    this.chrome.setFocus(id);
    this.prompt.setFocus(id === 'interact');
    this.phone.setFocus(id);
    this.panels.setFocus(id);
  }

  update(time: number): void {
    const session = sessionOf(this);
    if (session.section === 'hub') { this.scene.stop('World'); this.scene.start('Hub'); return; }
    const masthead = mastheadModel(session), hud = hudModel(session), footer = footerModel(session), controls = controlsModel(session);
    const panel = panelModel(session), prompt = promptModel(session), phone = phoneModel(session), world = worldHudModel(session);
    // On a touch screen the key hints are left out: the on-screen controls take their place.
    this.chrome.update(masthead, hud, footer, this.touch ? [] : controls);
    this.touch?.update(controls, session.game.mode === 'playing' && !session.game.phoneOpen);
    this.cards.update(hud, UI_W);
    this.worldHud.setLift(this.chrome.stripRows > 1 ? 36 : 0);
    this.worldHud.update(world, time / 1000);
    this.prompt.update(prompt);
    this.phone.update(phone);
    this.panels.update(panel);
    this.mirror?.sync({ masthead, hud, panel, prompt, phone, controls, footer, world });
  }
}
