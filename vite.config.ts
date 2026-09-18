import { defineConfig, loadEnv } from 'vite'
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

/**
 * Serves api/*.js (the Vercel Functions) from the dev server, so the feedback board works under
 * `pnpm dev`. Without Redis credentials in .env.local it keeps posts in memory.
 */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), '')
      for (const k of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ADMIN_TOKEN']) {
        if (env[k] && !process.env[k]) process.env[k] = env[k]
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const name = /^\/api\/([a-z-]+)(?:[?#]|$)/.exec(req.url ?? '')?.[1]
        if (!name) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
          const request = new Request(new URL(req.url ?? '/', 'http://localhost'), { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined })
          const response: Response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          next(e)
        }
      })
    },
  }
}

const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), spaFallback(), devApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // The project lives on a Windows mount under WSL, where native file events do not fire.
    watch: { usePolling: true, interval: 600, ignored: ['**/data/raw/**', '**/.screenshots/**', '**/dist/**'] },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
})
