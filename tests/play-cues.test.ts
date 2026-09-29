import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUES, CUE_NAMES } from '../src/play/audio/cues';

const SIDE = join(__dirname, '..', 'src', 'side');

/** Every sound the simulation asks for, read from its `events.push('name', ...)` calls. */
function pushedEvents(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of readdirSync(SIDE).filter(f => f.endsWith('.ts') && f !== 'main.ts' && f !== 'render.ts')) {
    const source = readFileSync(join(SIDE, file), 'utf8');
    for (const call of source.matchAll(/events\.push\(([^)]*)\)/g)) {
      for (const name of call[1].matchAll(/'([a-z]+)'/g)) found.set(name[1], file);
    }
  }
  return found;
}

describe('sound cues', () => {
  it('has a cue for every event the simulation pushes', () => {
    const events = pushedEvents();
    expect(events.size).toBeGreaterThan(20);
    for (const [name, file] of events) expect(CUES[name], `${name} (pushed in ${file})`).toBeDefined();
  });

  it('keeps the original wave and gain choices', () => {
    expect(CUES.hit.wave).toBe('sawtooth');
    expect(CUES.siren.wave).toBe('triangle');
    expect(CUES.jump.wave).toBe('square');
    expect(CUES.siren.gain).toBe(0.05);
    expect(CUES.warn.gain).toBe(0.012);
    expect(CUES.brake.gain).toBe(0.012);
    expect(CUES.start.gain).toBe(0.035);
    expect(CUES.shot.glide).toBe(true);
    expect(CUES.hit.glide).toBe(false);
  });

  it('has only well-formed notes', () => {
    for (const name of CUE_NAMES) {
      expect(CUES[name].notes.length, name).toBeGreaterThan(0);
      for (const [frequency, duration, delay] of CUES[name].notes) {
        expect(frequency, name).toBeGreaterThan(0);
        expect(duration, name).toBeGreaterThan(0);
        expect(delay, name).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
