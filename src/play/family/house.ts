import { ACTIVITIES, type Activity, type ActivityId } from './games/hemma';

// What Carl-Otto has done at home, remembered between visits: the activities finished (a sticker on the map for each) and
// the latest pictures from the craft corner, which hang on the walls around the house. Kept in localStorage, like the sound
// preference; a browser that refuses storage simply starts afresh each time.

const KEY = 'carl-otto-hemma';
/** How many pictures are kept: the newest first. */
export const MAX_DRAWINGS = 6;

export interface HomeProgress { done: ActivityId[]; drawings: string[] }
type Store = Pick<Storage, 'getItem' | 'setItem'>;

const known = new Set<string>(ACTIVITIES.map(a => a.id));
const local = (): Store | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function readProgress(store: Store | null = local()): HomeProgress {
  try {
    const raw = JSON.parse(store?.getItem(KEY) ?? 'null') as Partial<HomeProgress> | null;
    const done = Array.isArray(raw?.done) ? raw.done.filter((id): id is ActivityId => known.has(id)) : [];
    const drawings = Array.isArray(raw?.drawings) ? raw.drawings.filter(d => typeof d === 'string').slice(0, MAX_DRAWINGS) : [];
    return { done: [...new Set(done)], drawings };
  } catch { return { done: [], drawings: [] }; /* private mode, or something else wrote the key */ }
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

/** Keeps a picture (a data URL), newest first. */
export function addDrawing(url: string, store: Store | null = local()): HomeProgress {
  const progress = readProgress(store);
  progress.drawings = [url, ...progress.drawings].slice(0, MAX_DRAWINGS);
  write(progress, store);
  return progress;
}

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
