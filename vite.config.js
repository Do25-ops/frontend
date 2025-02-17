import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://backend-theta-two-99.vercel.app/',
        rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
});
