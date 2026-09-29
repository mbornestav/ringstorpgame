import type { ContentBundle } from './types';
import { validateContent } from './validate';

const modules = import.meta.glob<{ default: ContentBundle }>('./*.environment.ts', { eager: true });
export const content = Object.values(modules).map(m => m.default);
export function loadContent(id: string): ContentBundle {
  validateContent(content);
  const bundle = content.find(b => b.environment.id === id);
  if (!bundle) throw new Error(`Unknown environment: ${id}`);
  return bundle;
}
