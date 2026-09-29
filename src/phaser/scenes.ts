import Phaser from 'phaser';
import ddPortrait from '../side/dd-portrait-small.png';
import jumpAudio from './assets/jump.wav';
import dodgeAudio from './assets/dodge.wav';
import gunAudio from './assets/gun.wav';
import doorsAudio from './assets/doors.wav';
import illustratedCorridor from './assets/corridor-illustrated-v1.png';
import { t } from '../side/i18n';
import { loadContent } from './content';
import type { ContentBundle, RunState } from './content/types';
import { ActorArt, bakeEnvironment, canvasTexture, paintCeiling, paintMessage } from './art';
import { Movement, type MovementInput } from './movement';
import { Visit } from './session';
import { renderScale, type Presentation } from './presentation';
import { IllustratedDialogue } from './illustrated-dialogue';

export const PILOT_ENVIRONMENT = 'kurirgatan-28d-floor-8';
export class BootScene extends Phaser.Scene {
  private failed = false;
  constructor() { super('Boot'); }
  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.failed = true; this.game.events.emit('pilot:error', `Could not load ${file.key}. Reload to try again.`);
    });
    this.load.image('dd-portrait', ddPortrait);
    if (this.registry.get('presentation') === 'illustrated') this.load.image('illustrated-corridor', illustratedCorridor);
    for (const [key, url] of Object.entries({ jump: jumpAudio, dodge: dodgeAudio, gun: gunAudio, doors: doorsAudio })) this.load.audio(key, url);
  }
  create(): void {
    if (this.failed) return;
    try {
      const bundle = loadContent(PILOT_ENVIRONMENT);
      bakeEnvironment(this, bundle.environment, this.registry.get('presentation'));
      this.scene.start('Adventure', { run: this.registry.get('run') });
      this.scene.launch('UI');
    } catch (error) { this.game.events.emit('pilot:error', String(error)); }
  }
}
export class AdventureScene extends Phaser.Scene {
  content!: ContentBundle;
  visit!: Visit;
  movement!: Movement;
  ground!: Phaser.GameObjects.Zone;
  body!: Phaser.Physics.Arcade.Body;
  paused = false;
  transition = 0;
  get elapsed(): number { return this.visit.run.elapsed; }
  set elapsed(value: number) { this.visit.run.elapsed = value; }
  visualTime = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private playerArt!: ActorArt;
  private npcArt: ActorArt[] = [];
  private ceiling?: Phaser.Textures.CanvasTexture;
  private fade!: Phaser.GameObjects.Rectangle;
  private fadeTween!: Phaser.Tweens.Tween;
  private cues: Record<string, Phaser.Sound.BaseSound> = {};
  private focusRing?: Phaser.GameObjects.Ellipse;
  constructor() { super('Adventure'); }
  create({ run }: { run: RunState }): void {
    this.content = loadContent(run.location);
    this.registry.set('run', run);
    this.visit = new Visit(this.content, run); this.movement = new Movement();
    this.paused = false; this.transition = 0.35; this.visualTime = 0;
    const e = this.content.environment, spawn = e.spawns[e.entry], b = e.bounds;
    const presentation = this.registry.get('presentation') as Presentation, illustrated = presentation === 'illustrated';
    this.cameras.main.setBounds(0, 0, e.size.width, e.size.height).setZoom(renderScale(presentation)).centerOn(240 + e.camera.x, 135 + e.camera.y).setRoundPixels(!illustrated);
    this.add.image(0, 0, illustrated ? 'illustrated-corridor' : e.id).setOrigin(0).setDisplaySize(480, 270);
    this.ceiling = undefined;
    if (!illustrated) {
      this.ceiling = canvasTexture(this, 'ceiling', 480, 20); this.add.image(0, 0, 'ceiling').setOrigin(0);
    } else {
      for (const x of [82, 232, 382]) {
        const glow = this.add.image(x, 24, 'lamp-glow').setDisplaySize(90, 64).setAlpha(.18).setBlendMode(Phaser.BlendModes.ADD);
        if (!this.registry.get('reducedMotion')) this.tweens.add({ targets: glow, alpha: .26, duration: 2600 + x * 3, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      this.focusRing = this.add.ellipse(0, 0, 24, 5, 0xe9d9b0, .08).setStrokeStyle(.5, 0xffe7b4, .6).setDepth(2).setVisible(false);
    }
    this.ground = this.add.zone(spawn.x, spawn.y, 2, 2);
    this.physics.add.existing(this.ground);
    this.body = this.ground.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.physics.world.setBounds(b.left - 1, b.top - 1, b.right - b.left + 2, b.bottom - b.top + 2);
    this.npcArt = this.visit.actors.map(a => new ActorArt(this, a.id, presentation));
    this.playerArt = new ActorArt(this, 'player', presentation);
    if (!illustrated) this.add.image(0, 0, `${e.id}:atmosphere`).setOrigin(0).setDepth(800);
    this.fade = this.add.rectangle(0, 0, 480, 270, 0x0c1e23).setOrigin(0).setDepth(900);
    this.fadeTween = this.tweens.add({ targets: this.fade, alpha: 0, duration: 350 });
    this.cues = Object.fromEntries(['jump', 'dodge', 'gun', 'doors'].map(key => [key, this.sound.add(key)]));
    this.play(['doors']);
    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    keyboard.addCapture('SPACE,L,K,E,ESC');
    keyboard.on('keydown', this.keydown, this);
    this.game.events.on('pilot:interact', this.interact, this);
    this.game.events.on('pilot:pause', this.togglePause, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.focusLost, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.focusLost, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearInput(); keyboard.off('keydown', this.keydown, this); keyboard.removeAllKeys(true); keyboard.clearCaptures();
      this.game.events.off('pilot:interact', this.interact, this); this.game.events.off('pilot:pause', this.togglePause, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.focusLost, this); this.game.events.off(Phaser.Core.Events.HIDDEN, this.focusLost, this);
      this.playerArt.destroy(); this.npcArt.forEach(a => a.destroy()); if (this.ceiling) this.textures.remove('ceiling');
      Object.values(this.cues).forEach(sound => sound.destroy()); this.cues = {};
    });
    this.paint(); this.publish();
  }
  get player() { return { x: this.ground.x, y: this.ground.y, ...this.movement.state }; }
  get active(): boolean { return !this.paused && this.transition <= 0 && !this.visit.exit; }
  get interaction() { return this.visit.interaction(this.player, this.active); }
  private keydown(event: KeyboardEvent): void {
    // Consume the event through Phaser: the concurrent UI scene must not replay it.
    event.stopPropagation();
    if (event.repeat) return;
    if (event.code === 'Escape') { this.togglePause(); return; }
    if (event.code === 'KeyM') { this.game.events.emit('pilot:mute'); return; }
    if (this.paused || this.visit.exit) return;
    if (event.code === 'Space' || event.code === 'KeyL') this.movement.jump();
    if (event.code === 'KeyK') this.movement.dodge();
    if (event.code === 'KeyE') this.interact();
  }
  clearInput(): void { this.input.keyboard?.resetKeys(); this.movement.clearInput(); this.body.setVelocity(0); }
  focusLost(): void { this.clearInput(); if (!this.visit.exit && !this.paused) this.togglePause(); }
  togglePause(): void {
    if (this.visit.exit) return;
    this.paused = !this.paused; this.clearInput();
    if (this.paused) this.fadeTween.pause(); else this.fadeTween.resume();
    this.publish();
  }
  interact(): void {
    const target = this.interaction;
    if (!target) return;
    this.play(this.visit.interact(target, this.player));
    if (this.visit.exit) { this.clearInput(); this.game.events.emit('pilot:exit', this.visit.exit); }
    this.publish();
  }
  private play(sounds: string[]): void { for (const key of sounds) this.cues[key].play(); }
  update(time: number, rawDelta: number): void {
    const down = (...names: string[]) => names.some(n => this.keys[n].isDown);
    this.advance(time, rawDelta, { x: +down('D', 'RIGHT') - +down('A', 'LEFT'), y: +down('S', 'DOWN') - +down('W', 'UP'), sneak: down('SHIFT') });
  }
  /** Exactly one native Arcade integration per Phaser update, using the legacy bounded delta. */
  advance(time: number, rawDelta: number, input: MovementInput): void {
    const dt = Math.max(0, Math.min(rawDelta / 1000, 0.05));
    this.visualTime += dt;
    if (!this.paused && !this.visit.exit) {
      this.elapsed += dt;
      if (this.visit.message) this.visit.message.remaining = Math.max(0, this.visit.message.remaining - dt);
      if (this.transition > 0) this.transition = Math.max(0, this.transition - dt);
      else if (dt > 0) {
        const velocity = this.movement.step(dt, input);
        this.body.setVelocity(velocity.x, velocity.y);
        this.physics.world.update(time, dt * 1000);
        this.physics.world.postUpdate();
        this.play(velocity.sounds);
      }
    }
    this.paint(); this.publish();
  }
  paint(): void {
    if (this.ceiling) paintCeiling(this.ceiling, this.visualTime);
    this.visit.actors.forEach((n, i) => this.npcArt[i].npc(n, this.visualTime, i));
    this.playerArt.player(this.player, this.visit.run.cargo === 'carried', this.visualTime, !this.paused);
    if (this.focusRing) {
      const target = this.interaction;
      this.focusRing.setVisible(target?.kind === 'actor');
      if (target?.kind === 'actor') this.focusRing.setPosition(target.actor.x, target.actor.y + 1);
    }
  }
  publish(): void {
    const target = this.interaction, obj = this.content.environment.objective;
    this.game.events.emit('pilot:ui', {
      paused: this.paused, exited: !!this.visit.exit,
      cargo: this.visit.run.cargo, elapsed: this.elapsed,
      objective: t(this.visit.run.flags[obj.flag] ? obj.after : obj.before),
      interaction: target ? t(target.kind === 'actor' ? target.actor.label : target.exit.label) : '',
      message: !this.paused && !this.visit.exit ? this.visit.message : null,
    });
  }
  /** Used by the harness for a new visit. Mission progress belongs to the shared run. */
  reenter(run: RunState): void {
    run.location = this.content.environment.id;
    this.scene.restart({ run });
  }
  endTransition(): void { this.transition = 0; this.fadeTween.stop(); this.fade.alpha = 0; }
}

export class UIScene extends Phaser.Scene {
  private texture!: Phaser.Textures.CanvasTexture;
  private last = '';
  constructor() { super('UI'); }
  create(): void {
    if (this.registry.get('presentation') === 'illustrated') {
      this.cameras.main.setZoom(3).centerOn(240, 135).setRoundPixels(false);
      const dialogue = new IllustratedDialogue(this);
      const update = (state: { message: Visit['message'] }) => dialogue.update(state.message);
      this.game.events.on('pilot:ui', update);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('pilot:ui', update));
      return;
    }
    this.texture = canvasTexture(this, 'dialogue', 480, 100);
    this.add.image(0, 0, 'dialogue').setOrigin(0);
    const update = (state: { message: Visit['message'] }) => {
      const m = state.message;
      const signature = m ? JSON.stringify([m.key, m.portrait, Math.min(1, m.remaining * 2), t(m.key)]) : '';
      if (signature === this.last) return;
      this.last = signature;
      paintMessage(this.texture, state.message, this.textures.get('dd-portrait').getSourceImage() as HTMLImageElement);
    };
    this.game.events.on('pilot:ui', update);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.game.events.off('pilot:ui', update); this.textures.remove('dialogue'); this.last = ''; });
  }
}
