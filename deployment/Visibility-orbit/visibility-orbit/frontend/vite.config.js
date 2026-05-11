import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  envDir: path.resolve(__dirname, '../../..'),
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/auth-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-api/, '/api'),
      },
      '/api': {
        target: 'http://localhost:8005',
        changeOrigin: true,
      }
    }
  }
})
