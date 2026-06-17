import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite/Rollup/Rolldown plugin to rename variables starting with `require_` in es-toolkit files to avoid collisions in bundling/pre-bundling
const viteFixEsToolkitPlugin = {
  name: 'fix-es-toolkit-collision-vite',
  transform(code, id) {
    if (id.includes('es-toolkit') && id.endsWith('.js')) {
      if (code.includes('require_')) {
        return {
          code: code.replaceAll('require_', 'req_'),
          map: null
        };
      }
    }
    return null;
  }
};

export default defineConfig({
  plugins: [
    react(),
    viteFixEsToolkitPlugin
  ],
  optimizeDeps: {
    rolldownOptions: {
      plugins: [viteFixEsToolkitPlugin]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/react-icons')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})