import type Phaser from 'phaser';
import { CUES } from './cues';

/**
 * The original oscillator synth, running on Phaser's AudioContext so Phaser's unlock-on-first-input and its master mute apply.
 * Audio is optional: any failure is swallowed.
 */
/** How much louder than the original cue levels the effects play. */
export const EFFECTS_BOOST = 3;

export class Sfx {
  /** Only the WebAudio manager has a context; the no-audio and HTML5 managers leave the synth silent. */
  private readonly web: Partial<Pick<Phaser.Sound.WebAudioSoundManager, 'context' | 'destination'>>;

  constructor(private readonly manager: Phaser.Sound.BaseSoundManager) {
    this.web = manager as unknown as Partial<Pick<Phaser.Sound.WebAudioSoundManager, 'context' | 'destination'>>;
  }

  private get context(): AudioContext | null { return this.web.context ?? null; }

  /**
   * The cues keep the original game's per-note levels, which were meant for a quiet page; one boost brings effects up to
   * a normal loudness, above the music.
   */
  private boost: GainNode | null = null;
  private output(context: AudioContext): AudioNode {
    if (!this.boost) {
      this.boost = context.createGain();
      this.boost.gain.value = EFFECTS_BOOST;
      this.boost.connect(this.web.destination ?? context.destination);
    }
    return this.boost;
  }

  setMuted(muted: boolean): void { this.manager.mute = muted; }

  /** Names of the cues scheduled so far, newest last (kept short; the test bridge reads it). */
  readonly recent: string[] = [];

  play(name: string): void {
    this.recent.push(name);
    if (this.recent.length > 16) this.recent.shift();
    const cue = CUES[name], context = this.context;
    if (!cue || !context || this.manager.mute) return;
    try {
      if (context.state === 'suspended') void context.resume();
      // A cue scheduled on a suspended clock would all fire at once on unlock; skip it instead.
      if (context.state !== 'running') return;
      const destination = this.output(context);
      const now = context.currentTime;
      for (const [frequency, duration, delay] of cue.notes) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = cue.wave;
        osc.frequency.setValueAtTime(frequency, now + delay);
        if (cue.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency / 3), now + delay + duration);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(cue.gain, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        osc.connect(gain).connect(destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration + 0.01);
      }
    } catch { /* Audio is optional. */ }
  }

  /** One soft note (a toy piano's key), `frequency` Hz. */
  note(frequency: number, duration = 0.6): void {
    this.recent.push(`note:${Math.round(frequency)}`);
    if (this.recent.length > 16) this.recent.shift();
    const context = this.context;
    if (!context || this.manager.mute) return;
    try {
      if (context.state === 'suspended') void context.resume();
      if (context.state !== 'running') return;
      const now = context.currentTime, osc = context.createOscillator(), gain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(this.output(context));
      osc.start(now); osc.stop(now + duration + 0.02);
    } catch { /* Audio is optional. */ }
  }
}
