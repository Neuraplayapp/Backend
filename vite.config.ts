import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optimized Vite config for large dependencies
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate large dependencies into their own chunks
          plotly: ['plotly.js-dist-min'],
          vendor: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          framer: ['framer-motion']
        },
        chunkFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Optimize for large bundles
    minify: 'esbuild',
    target: 'esnext',
    chunkSizeWarningLimit: 2000, // Increase chunk size warning limit
    // Increase memory limit for large builds
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // Optimize dev server
  optimizeDeps: {
    include: ['plotly.js-dist-min'],
    exclude: ['@vite/client', '@vite/env']
  },
  resolve: {
    alias: {
      'react-plotly.js': '/src/shims/react-plotly-shim.ts',
      'react-plotly.js/dist/create-plotly-component': '/src/shims/react-plotly-shim.ts',
      'react-plotly.js/factory': '/src/shims/react-plotly-shim.ts'
    }
  },
  define: {
    // Use same server for both dev and prod - everything runs on port 3001
    'import.meta.env.VITE_API_BASE': JSON.stringify('http://localhost:3001'),
    'import.meta.env.VITE_WS_URL': JSON.stringify('ws://localhost:3001'),
    'import.meta.env.VITE_BRIDGE_SERVICE_URL': JSON.stringify('ws://localhost:3001'),
  },
  server: {
    port: 5173, // Vite dev server port
    // Proxy API calls through local server which then routes to Render backend
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxying API request through local server to Render backend:', req.url);
          });
          proxy.on('error', (err, req, res) => {
            console.error('❌ Proxy error:', err.message);
          });
        }
      }
    }
  }
});