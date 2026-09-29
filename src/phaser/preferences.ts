/** The pilot shares preferences only. Wallets, scores and mission progress are never written. */
export function readMuted(): boolean {
  try { return localStorage.getItem('ringstorp-muted') === 'yes'; } catch { return false; }
}
export function writeMuted(muted: boolean): void {
  try { localStorage.setItem('ringstorp-muted', muted ? 'yes' : 'no'); } catch { /* private mode */ }
}
