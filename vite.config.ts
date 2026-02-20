// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production-grade chunk splitting configuration
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  build: {
    chunkSizeWarningLimit: 1000, // raise warning threshold slightly
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // Supabase SDK
            if (id.includes('@supabase')) {
              return 'supabase';
            }

            // React Router
            if (id.includes('react-router')) {
              return 'router';
            }

            // Charts (if using recharts / d3)
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts';
            }

            // Animations
            if (id.includes('framer-motion')) {
              return 'motion';
            }

            // Default vendor chunk
            return 'vendor';
          }
        },
      },
    },
  },
});
