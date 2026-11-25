import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH: '/naichun-room/' for GitHub Pages, '/' for Cloudflare Pages or local.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
