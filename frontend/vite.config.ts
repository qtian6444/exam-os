import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages serves this app under /exam-os/, so asset paths must be
// root-relative to that base (no leading absolute /, no localhost).
export default defineConfig({
  base: '/exam-os/',
  plugins: [react()],
})
