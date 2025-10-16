import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/': {
        target: 'http://localhost:3000', // Express
        changeOrigin: true
      }
    }
  },
})