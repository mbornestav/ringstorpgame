// Development-only bridge. Omitted entirely from the production entrypoint.
import Phaser from 'phaser';
import { AdventureScene } from './scenes';
import { createMotion, type MovementInput } from './movement';
import { setLang, TABLE_KEYS, t, type Lang } from '../side/i18n';

export function installTesting(game: Phaser.Game): void {
  const scene = () => game.scene.getScene('Adventure') as AdventureScene;
  const api = {
    game,
    scene,
    snapshot: () => {
      const s = scene();
      return { player: s.player, run: structuredClone(s.visit.run), actors: structuredClone(s.visit.actors), message: s.visit.message, paused: s.paused, transition: s.transition, exit: s.visit.exit,
        bodies: s.physics.world.bodies.size, textures: game.textures.getTextureKeys().length, sounds: game.sound.getAll('').length, listeners: game.events.listenerCount('pilot:interact') };
    },
    freeze: () => { game.loop.sleep(); scene().endTransition(); scene().clearInput(); },
    step: (dt: number, input: MovementInput, action?: 'jump' | 'dodge') => {
      const s = scene(); if (action) s.movement[action](); s.advance(0, dt * 1000, input); return api.snapshot();
    },
    place: (x: number, y: number) => { const s = scene(); s.body.reset(x, y); s.publish(); },
    fixture: (shot: { lang: string; state: { player: Record<string, number | boolean>; npcs: { id: string; x: number; y: number; facing: number; talked: number }[]; cargo: string; received: boolean; mode: string; message: string; messageTimer: number; elapsed: number } }, time: number) => {
      api.freeze(); const s = scene(), p = shot.state.player; setLang(shot.lang as Lang);
      s.body.reset(Number(p.x), Number(p.y));
      s.movement.state = createMotion(); Object.keys(s.movement.state).forEach(k => Object.assign(s.movement.state, { [k]: p[k] }));
      s.visit.actors.forEach(a => Object.assign(a, shot.state.npcs.find(n => n.id === a.id)));
      s.visit.run.flags.received = shot.state.received; s.visit.run.cargo = shot.state.cargo as 'none' | 'carried'; s.visit.exit = null;
      s.paused = shot.state.mode === 'paused'; s.elapsed = shot.state.elapsed; s.visualTime = time;
      const key = TABLE_KEYS.find(k => t(k) === shot.state.message);
      s.visit.message = key && shot.state.messageTimer > 0 ? { key, remaining: shot.state.messageTimer, portrait: key.startsWith('msg.dd') ? 'dd' : undefined } : null;
      s.paint(); s.publish();
    },
    render: () => {
      // One Phaser-owned render without advancing the simulation.
      game.scene.scenes.forEach(s => s.sys.displayList.depthSort());
      game.renderer.preRender(); game.scene.render(game.renderer); game.renderer.postRender();
      return game.canvas.toDataURL();
    },
  };
  Object.assign(window, { __phaserPilot: api });
  game.events.once(Phaser.Core.Events.DESTROY, () => { delete (window as Window & { __phaserPilot?: unknown }).__phaserPilot; });
}
