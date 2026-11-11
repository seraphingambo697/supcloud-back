import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Auth et fichiers Gateway FastAPI
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/files': { target: 'http://localhost:8000', changeOrigin: true },
      '/share/resolve': { target: 'http://localhost:8000', changeOrigin: true },
      '/share/links': { target: 'http://localhost:8000', changeOrigin: true },
      '/share/internal': { target: 'http://localhost:8000', changeOrigin: true },
      '/share/with-me': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
})
