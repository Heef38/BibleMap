import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/** GitHub Pages serves 404.html for unknown paths; a copy of index.html makes client-side routes work there. */
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      try {
        copyFileSync('dist/index.html', 'dist/404.html')
      } catch {
        /* dev server: nothing to copy */
      }
    },
  }
}

const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // The project lives on a Windows mount under WSL, where native file events do not fire.
    watch: { usePolling: true, interval: 600, ignored: ['**/data/raw/**', '**/.screenshots/**', '**/dist/**'] },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
})
