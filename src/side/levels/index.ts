import type { LevelDefinition } from './types';

// Every `*.level.ts` file in this folder is a level; adding one is all it takes. Files starting with an underscore
// (the template) are not levels.

const files = import.meta.glob<{ default: LevelDefinition }>('./*.level.ts', { eager: true });

export const LEVELS: readonly LevelDefinition[] = Object.entries(files)
  .filter(([path]) => !path.split('/').pop()!.startsWith('_'))
  .map(([, module]) => module.default)
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));

export const levelById = (id: string): LevelDefinition | undefined => LEVELS.find(l => l.id === id);
/** The levels listed on the title screen after the three built-in ones. */
export const menuLevels = (): LevelDefinition[] => LEVELS.filter(l => l.menu);

export type { LevelDefinition } from './types';
export { compileLevel } from './compile';
export { levelText } from './text';
export { validateLevel } from './validate';
