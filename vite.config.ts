import { defineConfig } from 'vite';

// The workflow supplies the Pages base_path, including project/custom-domain cases.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
});
