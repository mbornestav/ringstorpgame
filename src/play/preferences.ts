// The mute preference shares its key and format ('yes' | 'no') with the original game and the pilot.
const MUTED_KEY = 'ringstorp-muted';

export function readMuted(): boolean {
  try { return localStorage.getItem(MUTED_KEY) === 'yes'; } catch { return false; /* private mode */ }
}

export function writeMuted(muted: boolean): void {
  try { localStorage.setItem(MUTED_KEY, muted ? 'yes' : 'no'); } catch { /* private mode */ }
}
