// Reproducible export of the original Sound.play envelopes, using the browser's oscillator.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const notes = {
  jump: [[300, .07, 0], [420, .06, .04]], dodge: [[260, .08, 0]],
  doors: [[300, .05, 0], [220, .09, .05]], gun: [[330, .08, 0], [494, .08, .08], [659, .18, .16]],
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const dir = new URL('../src/phaser/assets/', import.meta.url); await mkdir(dir, { recursive: true });
  for (const [name, score] of Object.entries(notes)) {
    const samples = await page.evaluate(async ({ name, score }) => {
      const length = Math.ceil((Math.max(...score.map(([, duration, delay]) => duration + delay)) + .02) * 44100);
      const c = new OfflineAudioContext(1, length, 44100);
      for (const [frequency, duration, delay] of score) {
        const osc = c.createOscillator(), gain = c.createGain(); osc.type = 'square';
        osc.frequency.setValueAtTime(frequency, delay);
        if (name === 'dodge') osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency / 3), delay + duration);
        gain.gain.setValueAtTime(.0001, delay); gain.gain.exponentialRampToValueAtTime(.035, delay + .01);
        gain.gain.exponentialRampToValueAtTime(.0001, delay + duration);
        osc.connect(gain).connect(c.destination); osc.start(delay); osc.stop(delay + duration + .01);
      }
      return Array.from((await c.startRendering()).getChannelData(0));
    }, { name, score });
    const wav = Buffer.alloc(44 + samples.length * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(44100, 24); wav.writeUInt32LE(88200, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
    samples.forEach((v, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
    await writeFile(new URL(`${name}.wav`, dir), wav);
  }
  console.log('Exported four original sound cues.');
} finally { await browser.close(); }
