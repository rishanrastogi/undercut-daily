/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves 404.html for unknown paths; a copy of index.html lets deep links like /p/3 load the SPA.
const spaFallback = (): Plugin => ({
  name: 'spa-404-fallback',
  apply: 'build',
  closeBundle() {
    const out = resolve(import.meta.dirname, 'dist')
    copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
  },
})

export default defineConfig({
  // Project Pages site lives at https://<user>.github.io/undercut-daily/
  base: process.env.BASE_PATH ?? '/undercut-daily/',
  plugins: [react(), spaFallback()],
  test: {
    environment: 'node',
  },
})
