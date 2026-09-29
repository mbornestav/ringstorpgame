import Phaser from 'phaser';
import type { Session } from '../session';
import { decideKey, movementFrom, type Command } from './keymap';

/**
 * Phaser's keyboard plugin feeding the pure keymap. Held keys are tracked by `KeyboardEvent.key` (layout-aware) rather than
 * by Phaser Key objects, exactly as the original window listeners did.
 */
export class Controls {
  readonly held = new Set<string>();
  private readonly off: Array<() => void> = [];

  constructor(scene: Phaser.Scene, private readonly session: Session) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable');
    const down = (event: KeyboardEvent) => this.down(event);
    const up = (event: KeyboardEvent) => this.up(event);
    keyboard.on('keydown', down);
    keyboard.on('keyup', up);
    const lose = () => { this.session.blur(); };
    scene.game.events.on(Phaser.Core.Events.BLUR, lose);
    scene.game.events.on(Phaser.Core.Events.HIDDEN, lose);
    this.off.push(
      () => { keyboard.off('keydown', down); keyboard.off('keyup', up); },
      () => { scene.game.events.off(Phaser.Core.Events.BLUR, lose); scene.game.events.off(Phaser.Core.Events.HIDDEN, lose); },
      session.onClearInput(() => this.held.clear()),
    );
  }

  /**
   * Phaser 4 re-runs its whole key queue on every DOM key event and only clears it once per frame, so within one slow frame
   * a keydown is delivered again when its keyup (or the next key) arrives. Its overridden `stopPropagation` marks an event
   * consumed for good; without this a single Escape would toggle pause twice.
   */
  private consume(event: KeyboardEvent): void { event.stopPropagation(); }

  private down(event: KeyboardEvent): void {
    this.consume(event);
    const g = this.session.game;
    const key = event.key.toLowerCase();
    const decision = decideKey(key, event.repeat, { ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey }, {
      mode: g.mode, level: g.level, hasPhone: g.hasPhone, phoneOpen: g.phoneOpen,
      titleView: this.session.titleView, hasCheckpoint: g.checkpoint !== null,
      buttonFocused: document.activeElement instanceof HTMLButtonElement,
    });
    for (const command of decision.commands) this.run(command);
    if (decision.hold) this.held.add(key);
  }

  private up(event: KeyboardEvent): void {
    this.consume(event);
    // macOS sends no keyup for keys released while Cmd is down, so forget everything when it lifts.
    if (event.key === 'Meta') this.held.clear();
    this.held.delete(event.key.toLowerCase());
  }

  private run(command: Command): void {
    const g = this.session.game;
    if ('ui' in command) { this.session.dispatch(command.ui, 'key'); return; }
    if (command.queue === 'attack') g.queueAttack();
    else if (command.queue === 'dodge') g.queueDodge();
    else if (command.queue === 'shot') g.queueShot();
    else g.queueJump();
  }

  /** Copies the held keys into the simulation. Called once per frame before `game.update`. */
  poll(): void {
    const g = this.session.game;
    const m = movementFrom(this.held);
    g.setMovement(m.x, m.y);
    g.setSneak(m.sneak);
    g.setUse(m.use);
  }

  destroy(): void {
    for (const off of this.off) off();
    this.off.length = 0;
    this.held.clear();
  }
}
