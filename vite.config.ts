import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: 'index.html', legacy: 'legacy.html', phaser: 'phaser.html' },
      // Phaser is large and changes rarely; keep it in its own chunk so it caches across deploys.
      output: { manualChunks: { 'phaser-engine': ['phaser'] } },
    },
  },
});
