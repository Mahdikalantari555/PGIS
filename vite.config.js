import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 3000,
    open: true
  },
  define: {
    'process.env': {}
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
