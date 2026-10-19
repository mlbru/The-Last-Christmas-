import { defineConfig } from 'vite';

// Relative base so the production build also works from a sub-folder or file server.
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
  server: { port: 5173, open: false },
});
