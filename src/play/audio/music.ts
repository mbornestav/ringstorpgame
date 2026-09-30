import type Phaser from 'phaser';
import { SONGS, compile, frequency, type CompiledSong, type DrumEvent, type NoteEvent, type TrackId } from './songs';

// Plays the chiptune tracks in songs.ts on Phaser's AudioContext, through Phaser's master mute (so the game's sound
// button silences the music too). Notes are scheduled a little ahead on the audio clock by a short timer, the usual
// Web Audio way, so the tempo holds steady even when frames are slow. One player per game; scenes ask for a track and
// it crossfades. Audio is optional: without a context every call quietly does nothing.

/** Overall music level, under the sound effects. */
const MASTER = 0.045;
const LEVEL: Record<NoteEvent['instrument'], number> = { lead: 0.42, arp: 0.13, bass: 0.62, drums: 0.5 };
const AHEAD = 0.15;
const FADE_OUT = 0.6, FADE_IN = 0.5;

interface Voice { song: CompiledSong; gain: GainNode; step: number; next: number; startAt: number; stopped: boolean }

export class Music {
  /** The track playing (or about to), for tests and for not restarting a track that is already on. */
  track: TrackId | null = null;
  private readonly context: AudioContext | null;
  private readonly out: AudioNode | null;
  private master: GainNode | null = null;
  private voices: Voice[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private waves = new Map<number, PeriodicWave>();
  private noise: AudioBuffer | null = null;
  private compiled = new Map<TrackId, CompiledSong>();
  private duck = 1;
  enabled = true;

  constructor(manager: Phaser.Sound.BaseSoundManager) {
    const web = manager as unknown as Partial<Pick<Phaser.Sound.WebAudioSoundManager, 'context' | 'destination'>>;
    this.context = web.context ?? null;
    this.out = web.destination ?? this.context?.destination ?? null;
  }

  /** Switches to `id` (null: silence), fading the old track out. `delay` seconds holds the new one back, after a jingle. */
  play(id: TrackId | null, delay = 0): void {
    if (id === this.track) return;
    this.track = id;
    const c = this.context;
    if (!c || !this.out) return;
    try {
      this.master ??= this.makeMaster(c);
      const now = c.currentTime;
      for (const v of this.voices) this.fade(v, now);
      if (id && this.enabled) {
        let song = this.compiled.get(id);
        if (!song) { song = compile(SONGS[id]); this.compiled.set(id, song); }
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(1, now + delay + FADE_IN);
        gain.connect(this.master);
        this.voices.push({ song, gain, step: 0, next: now + delay + 0.05, startAt: now + delay, stopped: false });
      }
      this.timer ??= setInterval(() => this.tick(), 25);
    } catch { /* Audio is optional. */ }
  }

  /** Quieter while the game is paused. */
  setDucked(ducked: boolean): void {
    const k = ducked ? 0.35 : 1;
    if (k === this.duck || !this.master || !this.context) return;
    this.duck = k;
    this.master.gain.setTargetAtTime(MASTER * k, this.context.currentTime, 0.15);
  }

  stop(): void { this.play(null); }

  /** How far the current track has got, in steps (for tests: it moves once audio is allowed to run). */
  get position(): number { return this.voices.find(v => !v.stopped)?.step ?? -1; }

  private makeMaster(c: AudioContext): GainNode {
    const g = c.createGain();
    g.gain.value = MASTER * this.duck;
    g.connect(this.out!);
    return g;
  }

  private fade(v: Voice, now: number): void {
    if (v.stopped) return;
    v.stopped = true;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), now);
    v.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_OUT);
    setTimeout(() => { try { v.gain.disconnect(); } catch { /* already gone */ } }, (FADE_OUT + AHEAD + 0.2) * 1000);
  }

  private tick(): void {
    const c = this.context!;
    this.voices = this.voices.filter(v => !v.stopped || v.next < c.currentTime + 1);
    const playing = this.voices.filter(v => !v.stopped);
    if (!playing.length) { if (this.timer) clearInterval(this.timer); this.timer = null; return; }
    // Before the first click or key the browser keeps audio suspended; wait, then start from the top.
    if (c.state !== 'running') { for (const v of playing) { v.step = 0; v.next = c.currentTime + 0.05; } return; }
    const now = c.currentTime;
    for (const v of playing) {
      // After a stall (a background tab) skip ahead rather than play the backlog all at once.
      if (v.next < now - 0.25) v.next = now + 0.05;
      while (v.next < now + AHEAD) {
        for (const e of v.song.events[v.step]) this.sound(e, v.next, v.song.stepSeconds, v.gain);
        v.step = (v.step + 1) % v.song.steps;
        v.next += v.song.stepSeconds;
      }
    }
  }

  private sound(e: NoteEvent | DrumEvent, at: number, step: number, out: AudioNode): void {
    const c = this.context!;
    if (e.instrument === 'drums') { this.drum((e as DrumEvent).hit, at, out); return; }
    const n = e as NoteEvent;
    const osc = c.createOscillator(), g = c.createGain();
    if (n.instrument === 'bass') osc.type = 'triangle';
    else osc.setPeriodicWave(this.pulse(n.instrument === 'lead' ? 0.25 : 0.125));
    osc.frequency.setValueAtTime(frequency(n.midi), at);
    const len = n.steps * step, peak = LEVEL[n.instrument];
    // A quick attack, a short decay to a sustain, and a release before the next note.
    const hold = Math.max(0.03, len * 0.92 - 0.03);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.006);
    g.gain.exponentialRampToValueAtTime(peak * (n.instrument === 'arp' ? 0.35 : 0.7), at + Math.min(hold, 0.09));
    g.gain.setValueAtTime(peak * (n.instrument === 'arp' ? 0.35 : 0.7), at + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, at + hold + 0.04);
    if (n.instrument === 'lead' && len > 0.35) {
      // A gentle vibrato on long notes, after they have settled.
      const lfo = c.createOscillator(), depth = c.createGain();
      lfo.frequency.value = 5.5; depth.gain.setValueAtTime(0, at); depth.gain.linearRampToValueAtTime(frequency(n.midi) * 0.006, at + 0.3);
      lfo.connect(depth).connect(osc.frequency); lfo.start(at); lfo.stop(at + hold + 0.05);
    }
    osc.connect(g).connect(out);
    osc.start(at); osc.stop(at + hold + 0.06);
  }

  private drum(hit: DrumEvent['hit'], at: number, out: AudioNode): void {
    const c = this.context!, level = LEVEL.drums;
    if (hit === 'k') {
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, at); osc.frequency.exponentialRampToValueAtTime(42, at + 0.12);
      g.gain.setValueAtTime(level * 1.6, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      osc.connect(g).connect(out); osc.start(at); osc.stop(at + 0.18);
      return;
    }
    const src = c.createBufferSource(), filter = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise ??= this.makeNoise(c);
    const len = hit === 's' ? 0.13 : hit === 'o' ? 0.16 : 0.035;
    filter.type = hit === 's' ? 'bandpass' : 'highpass';
    filter.frequency.value = hit === 's' ? 1900 : 7200;
    g.gain.setValueAtTime(level * (hit === 's' ? 0.9 : 0.35), at); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(filter).connect(g).connect(out);
    src.start(at, Math.random() * 0.5); src.stop(at + len + 0.01);
  }

  /** A pulse wave of the given duty cycle, as the old sound chips made (0.5 would be a square). */
  private pulse(duty: number): PeriodicWave {
    let wave = this.waves.get(duty);
    if (!wave) {
      const n = 32, real = new Float32Array(n), imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      wave = this.context!.createPeriodicWave(real, imag);
      this.waves.set(duty, wave);
    }
    return wave;
  }

  private makeNoise(c: AudioContext): AudioBuffer {
    const buffer = c.createBuffer(1, c.sampleRate, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

const players = new WeakMap<Phaser.Game, Music>();
/** The game's one music player. `?music=off` (or a missing audio context) keeps it silent. */
export function musicOf(game: Phaser.Game): Music {
  let m = players.get(game);
  if (!m) {
    m = new Music(game.sound);
    try { m.enabled = new URLSearchParams(location.search).get('music') !== 'off'; } catch { /* not in a browser */ }
    players.set(game, m);
  }
  return m;
}
