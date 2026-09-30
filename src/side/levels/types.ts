import type { Key } from '../i18n';
import type { Light } from '../night';
import type { EnemyKind, FrontKind, FurnitureKind, Surface } from '../stage';
import type { BuildingKind } from './catalogue';

// The Level Book's format: one street level as plain data. See docs/level-book.md for the guide, every field and the
// catalogue of building kinds. Positions are pixels along the street from its left end (12 px is one metre); the
// playable band runs from lane 176 (far pavement) to 248 (near kerb).

/** Words the player sees: a key from src/side/i18n.ts, or the level's own text in both languages. */
export type LevelText = Key | { sv: string; en: string };

/** A stretch of the street, from `from` to `to` pixels. */
export interface Stretch<T> { from: number; to: number; value: T }

export interface BuildingDef {
  /** What it is: picks the art, the look and any rule that goes with it (see the catalogue). */
  kind: BuildingKind;
  from: number;
  to: number;
  /** 0 (default) stands at the pavement, 1 further back behind gardens, smaller and hazier. */
  row?: 0 | 1;
  /** Where the door or entrance is, in pixels; defaults to the middle. */
  door?: number;
  /** Shown nowhere yet, but kept with the building: "Kurirgatan 28". */
  address?: string;
  /** Overrides the catalogue's colours: wall and roof as #rrggbb. */
  wall?: string;
  roof?: string;
  /** Overrides the catalogue's number of floors. */
  floors?: number;
}

export interface TreeDef { x: number; bush?: boolean; height?: number; variant?: number; row?: 0 | 1 }

/** Trees and bushes spread along a stretch, `gap` pixels apart (a random step between the two), kept out of `avoid`. */
export interface ScatterDef { from: number; to: number; seed?: number; gap?: [number, number]; bushes?: number; avoid?: Array<[number, number]> }

export interface PropDef { kind: FurnitureKind; x: number; near?: boolean; label?: string; variant?: number }

/** Where someone stands across the street: a lane in pixels, or one of three named lanes. */
export type Lane = number | 'far' | 'middle' | 'near';

/** A crew that holds the screen until it is beaten. Members stand `dx` pixels from `x`. */
export interface CrewDef {
  x: number;
  members: Array<{ kind: EnemyKind; dx?: number; lane?: Lane }>;
  /** Who runs in once the fight is on; by default one runner per bruiser, plus one for a group. */
  backup?: EnemyKind[];
}

export interface StreetDef {
  /** Optional bespoke destination instead of the Ringstorp terrace. */
  finish?: BuildingDef;
  /** One-use full heals that also become the latest retry point. */
  restStops?: Array<{ x: number; name: LevelText }>;
  waters?: Array<Stretch<'river' | 'harbour'>>;
  /** Street length in pixels; at least one screen (480). */
  length: number;
  /** Where the courier starts. */
  start: { x: number; lane?: Lane };
  /** The parcel to fetch. */
  parcel: { x: number; lane?: Lane };
  /** The door of home: the terrace is built around it, and the home crew waits there. */
  home: number;
  /** The crew waiting at home: it steps out from both sides when you arrive. */
  homeCrew: EnemyKind[];
  crews?: CrewDef[];
  /** Street names along the way, shown in the top bar. */
  names: Array<Stretch<string>>;
  /** Road surface: 'road' by default. */
  surfaces?: Array<Stretch<Surface>>;
  /** What stands between pavement and buildings: hedges, fences, walls, open forecourts. */
  fronts?: Array<Stretch<FrontKind>>;
  buildings: BuildingDef[];
  trees?: TreeDef[];
  scatter?: ScatterDef[];
  props?: PropDef[];
  /** Lamp posts every so many pixels, near and far pavement, as on the built-in streets. */
  lampsEvery?: number;
  /** Extra pools of light, for night levels (lamps and floodlights light themselves). */
  lights?: Light[];
}

export interface LevelDefinition {
  /** Board a bus after the final fight, then arrive at the reference cabin. */
  busHome?: 'liljedal';
  completion?: LevelText;
  credit?: LevelText;
  /** A short, unique, lowercase id: the URL uses it (`?level=<id>`). */
  id: string;
  /** Rules: 'brawl' is Level 1's: fetch the parcel, beat the crews, get home. */
  mode: 'brawl';
  title: LevelText;
  /** A line under the title on the level button. */
  subtitle?: LevelText;
  /** Listed on the title screen, after the built-in levels, by `order`. Off by default (reachable by URL). */
  menu?: boolean;
  order?: number;
  night?: boolean;
  /** The first message on screen. */
  intro?: LevelText;
  /** The objective line: before the parcel, during a fight and while a shop is ahead (both optional), on the way home. */
  objectives: { parcel: LevelText; crew?: LevelText; shop?: LevelText; home: LevelText };
  street: StreetDef;
}
