import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const importsOf = (file: string) => [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : path.endsWith('.ts') ? [path] : [];
});

/** Modules that must stay free of Phaser so they run under plain Vitest. */
const PURE = [
  'actions.ts', 'preferences.ts', 'session.ts', 'input/keymap.ts', 'audio/cues.ts', 'ui/text.ts', 'ui/models.ts',
].map(file => join(ROOT, 'src', 'play', file)).filter(existsSync);

describe('module boundaries', () => {
  it('keeps the pure play modules free of Phaser and of the DOM-only view code', () => {
    expect(PURE.length).toBeGreaterThanOrEqual(6);
    for (const file of PURE) {
      for (const spec of importsOf(file)) {
        expect(spec, relative(ROOT, file)).not.toMatch(/^phaser$/);
        expect(spec, relative(ROOT, file)).not.toMatch(/\/(scenes|world|kit)\//);
      }
    }
  });

  it('keeps the simulation free of Phaser and of the play layer', () => {
    // side/main.ts, render.ts and phone.ts are the legacy DOM/Canvas shell; everything else is the simulation.
    const legacy = new Set(['main.ts', 'render.ts', 'phone.ts']);
    const files = walk(join(ROOT, 'src', 'side')).filter(f => !legacy.has(f.slice(join(ROOT, 'src', 'side').length + 1)));
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      for (const spec of importsOf(file)) {
        expect(spec, relative(ROOT, file)).not.toMatch(/^phaser$/);
        expect(spec, relative(ROOT, file)).not.toMatch(/play\//);
      }
    }
  });
});
