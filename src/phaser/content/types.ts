import type { Key } from '../../side/i18n';

export interface Point { x: number; y: number }
export interface ActorDefinition extends Point {
  id: string;
  appearance: string;
  facing: 1 | -1;
  dialogue?: string;
  event?: string;
  label: Key;
}
export interface DialogueDefinition {
  id: string;
  speaker: string;
  lines: Key[];
  repeat: 'cycle' | 'last';
  portrait?: 'dd';
  duration: number;
}
export type MissionAction =
  | { type: 'dialogue'; id: string }
  | { type: 'flag'; id: string; value: boolean }
  | { type: 'cargo'; value: 'none' | 'carried' }
  | { type: 'exit'; id: string };
export interface MissionDefinition {
  id: string;
  flags: string[];
  rules: { event: string; when?: { flag: string; equals: boolean }; actions: MissionAction[]; sound?: string }[];
}
export interface EnvironmentDefinition {
  id: string;
  size: { width: number; height: number };
  bounds: { left: number; right: number; top: number; bottom: number };
  spawns: Record<string, Point>;
  entry: string;
  artwork: { kind: 'kurirgatan-corridor'; floor: number };
  camera: { kind: 'fixed'; x: number; y: number };
  atmosphere: 'ringstorp';
  actors: ActorDefinition[];
  population?: {
    kind: 'kurirgatan-neighbours'; floor: number; candidates: string[];
    avoid: { x: number; distance: number };
  };
  interactions: { policy: 'nearest-horizontal-then-exit'; reachX: number; reachY: number };
  exits: { id: string; xLessThan: number; label: Key; event: string; destination: string; spawn: string; boundary: boolean }[];
  mission: string;
  objective: { flag: string; before: Key; after: Key };
}
export interface ContentBundle { environment: EnvironmentDefinition; dialogues: DialogueDefinition[]; mission: MissionDefinition }
export interface RunState {
  version: 1;
  seed: number;
  location: string;
  elapsed: number;
  flags: Record<string, boolean>;
  cargo: 'none' | 'carried';
}
export interface ExitRequest { destination: string; spawn: string; state: RunState }
