import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser.spec.ts', 'phaser.spec.ts'],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
    headless: true,
  },
});
