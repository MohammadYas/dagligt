import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Only VITE_* reaches the bundle; .env Dropbox/DeepSeek keys never do.
  envPrefix: 'VITE_',
  server: {
    // Local development talks to the fixture server (scripts/preview-test.mjs), never live Dropbox.
    proxy: { '/api': 'http://127.0.0.1:8091' },
  },
  build: { outDir: 'dist', emptyOutDir: true, target: 'safari16' },
});
