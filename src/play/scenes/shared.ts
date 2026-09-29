import type Phaser from 'phaser';
import type { Session } from '../session';

/** The Session is created before the Phaser.Game and handed to every scene through the registry. */
export function sessionOf(scene: Phaser.Scene): Session {
  const session = scene.registry.get('session') as Session | undefined;
  if (!session) throw new Error('Session missing from the registry');
  return session;
}
