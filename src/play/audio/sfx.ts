import type Phaser from 'phaser';
import { CUES } from './cues';

/**
 * The original oscillator synth, running on Phaser's AudioContext so Phaser's unlock-on-first-input and its master mute apply.
 * Audio is optional: any failure is swallowed.
 */
export class Sfx {
  /** Only the WebAudio manager has a context; the no-audio and HTML5 managers leave the synth silent. */
  private readonly web: Partial<Pick<Phaser.Sound.WebAudioSoundManager, 'context' | 'destination'>>;

  constructor(private readonly manager: Phaser.Sound.BaseSoundManager) {
    this.web = manager as unknown as Partial<Pick<Phaser.Sound.WebAudioSoundManager, 'context' | 'destination'>>;
  }

  private get context(): AudioContext | null { return this.web.context ?? null; }

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
      const destination = this.web.destination ?? context.destination;
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
}
