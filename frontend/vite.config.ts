/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Read the process env *and* `frontend/.env[.local]` so VITE_API_BASE_URL set
  // in either place really redirects the API/WS proxy targets.
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:8000'

  /*
   * One proxy map shared by the dev server and `vite preview`.
   *
   * The production demo serves the built SPA, so every `/api` and `/ws` call —
   * plus the optional microservices — must reach the same backends it does in
   * development. Duplicating this map is how `npm run preview` silently breaks.
   */
  const proxy = {
    '/api/world-state': {
      target: 'http://localhost:8006',
      changeOrigin: true,
    },
    '/api/graph': {
      target: 'http://localhost:8005',
      changeOrigin: true,
    },
    '/api/simulation/': {
      target: 'http://localhost:8007',
      changeOrigin: true,
    },
    '/api': {
      target: apiBase,
      changeOrigin: true,
      rewrite: (path: string) => '/api/v1' + path.replace('/api', ''),
      configure: (proxyServer: { on: (event: string, handler: () => void) => void }) => {
        proxyServer.on('error', () => {})
      },
    },
    '/ws/graph': {
      target: 'ws://localhost:8005',
      ws: true,
    },
    '/ws/simulation': {
      target: 'ws://localhost:8007',
      ws: true,
    },
    '/ws': {
      target: apiBase.replace(/^http/, 'ws'),
      ws: true,
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 600,
    },
    test: {
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost/',
        },
      },
      setupFiles: './src/__tests__/setup.ts',
    },
    server: {
      port: 3000,
      proxy,
    },
    // `npm run preview` serves the production build with the same API/WS wiring.
    preview: {
      port: 3000,
      host: true,
      proxy,
    },
  }
})
