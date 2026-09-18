import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // The project lives on a Windows mount under WSL, where native file events do not fire.
    watch: { usePolling: true, interval: 600, ignored: ['**/data/raw/**', '**/public/data/**', '**/.screenshots/**', '**/dist/**'] },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
})
