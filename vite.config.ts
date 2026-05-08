import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Your Render Backend URL
        target: 'https://studentprogreessmodel-backend.onrender.com/', 
        changeOrigin: true,
      },
    },
  },
})
