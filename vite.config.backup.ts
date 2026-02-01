import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic'
    })
    // Removed splitVendorChunkPlugin - was causing empty main bundle
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'framer-motion'
    ],
    exclude: [
      'lucide-react',
      '@elevenlabs/elevenlabs-js'
    ],
    // Force pre-bundling of heavy dependencies
    force: true
  },
  
  // Enable tree shaking
  esbuild: {
    // Remove console logs and debugger statements in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Enable tree shaking
    treeShaking: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://neuraplay.onrender.com',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Render:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Render:', proxyRes.statusCode, req.url);
          });
        },
      }
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    watch: {
      // Wait for file writes to finish before triggering updates
      awaitWriteFinish: {
        // Wait 500ms for file writes to stabilize
        stabilityThreshold: 500,
        // Poll every 100ms to check if file is stable
        pollInterval: 100
      },
      // Exclude large static assets from file watching
      ignored: [
        // Video files
        '**/public/assets/Videos/**',
        '**/assets/Videos/**',
        '**/*.mp4',
        '**/*.mov',
        '**/*.avi',
        '**/*.wmv',
        '**/*.flv',
        '**/*.webm',
        
        // Large audio files  
        '**/public/assets/music/**',
        '**/assets/music/**',
        '**/*.mp3',
        '**/*.wav',
        '**/*.flac',
        '**/*.m4a',
        
        // Large image files
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg',
        '**/*.gif',
        '**/*.bmp',
        '**/*.tiff',
        
        // Other large assets
        '**/*.wasm',
        '**/*.zip',
        '**/*.exe',
        
        // Specific large files
        '**/fast-noise-lite.js',
        '**/Implement the transitional animatio.txt',
        
        // Node modules and build outputs
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
      ]
    }
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',
  build: {
    // Enable minification
    minify: 'esbuild',
    // Reduce bundle size
    target: 'esnext',
    // Enable source maps for debugging (only in dev)
    sourcemap: process.env.NODE_ENV === 'development',
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // CSS code splitting
    cssCodeSplit: true,
    rollupOptions: {
      // Exclude legacy folders from the build
      external: [
        'src/components/legacy/**',
        'src/services/legacy/**'
      ],
      
      // Optimize bundle size
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks: (id) => {
          // Only split LARGE node modules, keep main app code together
          if (id.includes('node_modules')) {
            // Chart libraries chunk (heavy)
            if (id.includes('plotly') || id.includes('react-plotly')) {
              return 'charts';
            }
            // Canvas and drawing libraries (heavy)
            if (id.includes('konva') || id.includes('react-konva')) {
              return 'canvas';
            }
            // Animation libraries (heavy)
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            // Audio libraries (heavy)
            if (id.includes('elevenlabs') || id.includes('howler')) {
              return 'audio';
            }
            // Keep React and core dependencies in main bundle for faster loading
            // DON'T split React, components, or services - they're needed immediately
          }
          // Don't split app code - keep it all in main bundle
        },
      },
    },
  },
});
