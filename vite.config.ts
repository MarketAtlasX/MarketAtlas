import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    proxy: {
      '/api/world-state': {
        target: 'http://localhost:8004',
        changeOrigin: true,
      },
      '/api/graph': {
        target: 'http://localhost:8005',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => '/api/v1' + path.replace('/api', ''),
        configure: (proxy) => {
          proxy.on('error', () => {})
        },
      },
      '/ws/graph': {
        target: 'ws://localhost:8005',
        ws: true,
      },
      '/ws': {
        target: (process.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
})
