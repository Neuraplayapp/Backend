import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal Vite config to fix broken bundle issue
export default defineConfig({
  plugins: [react()],
  build: {
    // Disable all chunking - put everything in one bundle
    rollupOptions: {
      output: {
        manualChunks: undefined // Disable manual chunking completely
      }
    },
    // Ensure proper bundling
    minify: 'esbuild',
    target: 'esnext'
  }
});
