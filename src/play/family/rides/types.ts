/**
 * One of Carl-Otto's bike rides, as data. Distances are pixels in the 960 × 540 illustrated world; the rider covers
 * `speed` pixels a second, so `length / speed` is roughly how long the ride takes.
 */
export interface RideDefinition {
  id: string;
  title: { sv: string; en: string };
  length: number;
  speed: number;
  apples: {
    /** Seconds before the first apple. */
    firstAfter: number;
    /** Seconds between apples: a random time between the two. */
    every: [number, number];
    /** Share of apples aimed at the rider (0–1); the rest fall anywhere on the path. */
    aimed: number;
    /** The last stretch of this many pixels has no apples, so arriving feels like a reward. */
    clearEnd: number;
  };
  scenery: {
    /** Apple trees along the way: the first at `from`, then every `every` pixels up to `until`. */
    trees: { from: number; every: number; until: number };
    /** What waits at the end. */
    destination: 'preschool';
  };
}
