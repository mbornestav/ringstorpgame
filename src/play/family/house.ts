import { ACTIVITIES, type Activity, type ActivityId } from './games/hemma';

// What Carl-Otto has done at home, remembered between visits: the activities finished (a sticker on the map for each), the
// pictures from the craft corner and the photos from the mirror (newest first), and which of them hangs in each room: the
// living room (over the sofa), the hall (the magnet board) and his own room (over the desk). Kept in localStorage, like
// the sound preference; a browser that refuses storage simply starts afresh each time.

const KEY = 'carl-otto-hemma';
/** How many pictures are kept: the newest first. */
export const MAX_DRAWINGS = 12;

export type WallRoom = 'living' | 'hall' | 'bedroom';
export const WALL_ROOMS: WallRoom[] = ['living', 'hall', 'bedroom'];
export interface HomeProgress { done: ActivityId[]; drawings: string[]; hung: Record<WallRoom, number> }
type Store = Pick<Storage, 'getItem' | 'setItem'>;

const known = new Set<string>(ACTIVITIES.map(a => a.id));
const local = (): Store | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const fresh = (): HomeProgress => ({ done: [], drawings: [], hung: { living: 0, hall: 0, bedroom: 0 } });

export function readProgress(store: Store | null = local()): HomeProgress {
  try {
    const raw = JSON.parse(store?.getItem(KEY) ?? 'null') as Partial<HomeProgress> | null;
    const done = Array.isArray(raw?.done) ? raw.done.filter((id): id is ActivityId => known.has(id)) : [];
    const drawings = Array.isArray(raw?.drawings) ? raw.drawings.filter(d => typeof d === 'string').slice(0, MAX_DRAWINGS) : [];
    const hung = fresh().hung;
    for (const room of WALL_ROOMS) { const i = (raw?.hung as Record<string, unknown> | undefined)?.[room]; if (typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < drawings.length) hung[room] = i; }
    return { done: [...new Set(done)], drawings, hung };
  } catch { return fresh(); /* private mode, or something else wrote the key */ }
}

function write(progress: HomeProgress, store: Store | null): void {
  try { store?.setItem(KEY, JSON.stringify(progress)); } catch { /* private mode, or full */ }
}

/** Marks an activity finished. Returns the progress as it now is. */
export function markDone(id: ActivityId, store: Store | null = local()): HomeProgress {
  const progress = readProgress(store);
  if (!progress.done.includes(id)) { progress.done.push(id); write(progress, store); }
  return progress;
}

/**
 * Keeps a picture (a data URL), newest first. A new picture hangs in the living room; the other rooms keep the picture
 * they had (its place in the list moves down one).
 */
export function addDrawing(url: string, store: Store | null = local()): HomeProgress {
  const progress = readProgress(store);
  const kept = progress.drawings.length;
  progress.drawings = [url, ...progress.drawings].slice(0, MAX_DRAWINGS);
  for (const room of WALL_ROOMS) {
    if (!kept) progress.hung[room] = 0;
    else if (room === 'living') progress.hung[room] = 0;
    else progress.hung[room] = Math.min(progress.drawings.length - 1, progress.hung[room] + 1);
  }
  write(progress, store);
  return progress;
}

/** Hangs picture `i` in a room. */
export function hangDrawing(i: number, room: WallRoom, store: Store | null = local()): HomeProgress {
  const progress = readProgress(store);
  if (i >= 0 && i < progress.drawings.length) { progress.hung[room] = i; write(progress, store); }
  return progress;
}

/** Throws picture `i` away; a room it hung in gets the newest picture instead. */
export function removeDrawing(i: number, store: Store | null = local()): HomeProgress {
  const progress = readProgress(store);
  if (i < 0 || i >= progress.drawings.length) return progress;
  progress.drawings.splice(i, 1);
  for (const room of WALL_ROOMS) { const h = progress.hung[room]; progress.hung[room] = h === i ? 0 : h > i ? h - 1 : h; }
  write(progress, store);
  return progress;
}

/** The picture hanging in a room, if there is one. */
export const hungIn = (progress: HomeProgress, room: WallRoom): string | undefined => progress.drawings[progress.hung[room]] ?? progress.drawings[0];

/** The next playable activity in the evening's order that is not done yet, if any. */
export function nextUp(done: readonly ActivityId[]): Activity | null {
  return ACTIVITIES.find(a => a.scene && !done.includes(a.id)) ?? null;
}

/** Every playable evening activity is done (the moon comes up over the map), and the morning (the sun). */
export function eveningDone(done: readonly ActivityId[]): boolean {
  const evening = ACTIVITIES.filter(a => a.scene && !a.morning);
  return evening.length > 0 && evening.every(a => done.includes(a.id));
}
export function morningDone(done: readonly ActivityId[]): boolean {
  return ACTIVITIES.some(a => a.morning && a.scene && done.includes(a.id));
}
