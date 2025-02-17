import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://backend-nur7ybavd-do25-ops-projects.vercel.app',
        rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
});
