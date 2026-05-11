import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5181,
    proxy: {
      // Auth Service — /api/auth/* (login, register, me)
      '/api/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Auth Service — /api/brands/* (brand & project CRUD)
      '/api/brands': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Auth Service — /api/organizations/* (org data)
      '/api/organizations': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Auth Service — /api/projects/* (project detail)
      '/api/projects': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Discover Orbit — routes: /api/v1/*
      '/api/discover': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/discover/, '/api/v1')
      },
      // Knowledge Core — routes: /api/* (NO /v1 prefix)
      '/api/knowledge': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/knowledge/, '/api')
      },
      // Create Orbit — routes: /api/* (NO /v1 prefix)
      '/api/create': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/create/, '/api')
      },
      // Optimize Orbit — routes: /api/* (NO /v1 prefix)
      '/api/optimize': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/optimize/, '/api')
      },
      // Visibility Orbit — routes: /api/v1/*
      '/api/visibility': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/visibility/, '/api/v1')
      }
    }
  }
})
