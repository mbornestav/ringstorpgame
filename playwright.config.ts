import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser.spec.ts', 'visual.spec.ts', 'legacy.spec.ts', 'phaser.spec.ts', 'family.spec.ts'],
  // The pilot's docs say to run with a dev server already up; reuse it when it is, start one otherwise.
  webServer: {
    command: 'npm run dev:test',
    url: 'http://127.0.0.1:5173/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
    headless: true,
  },
});
