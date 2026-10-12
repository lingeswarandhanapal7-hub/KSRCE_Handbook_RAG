import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor';
          if (id.includes('node_modules/framer-motion')) return 'motion';
          if (id.includes('node_modules/@radix-ui')) return 'radix';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-gfm')) return 'markdown';
        },
      },
    },
  },
})
