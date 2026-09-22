import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync } from 'node:fs'
import type { HtmlTagDescriptor, Plugin } from 'vite'
import { SITE } from './src/config/site'

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

/**
 * What search engines and link previews read before any script runs: the title, the description,
 * Open Graph and Twitter cards, ownership codes for Google and Bing, and a schema.org WebSite with
 * the site search, all from src/config/site.ts. Each page then sets its own title, description and
 * canonical address as it opens (usePageTitle).
 */
function siteMeta(): Plugin {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      const title = `${SITE.name}: ${SITE.tagline}`
      const image = `${SITE.url}/brand/og-image.png`
      const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: 'meta', attrs, injectTo: 'head' })
      const website = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.name,
        alternateName: 'BibleMap',
        url: `${SITE.url}/`,
        description: SITE.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      }
      const tags: HtmlTagDescriptor[] = [
        meta({ name: 'description', content: SITE.description }),
        meta({ name: 'robots', content: 'index, follow' }),
        meta({ name: 'application-name', content: SITE.name }),
        meta({ name: 'theme-color', content: '#fcfbf8', media: '(prefers-color-scheme: light)' }),
        meta({ name: 'theme-color', content: '#1c1b19', media: '(prefers-color-scheme: dark)' }),
        meta({ property: 'og:site_name', content: SITE.name }),
        meta({ property: 'og:type', content: 'website' }),
        meta({ property: 'og:locale', content: 'en_US' }),
        meta({ property: 'og:title', content: title }),
        meta({ property: 'og:description', content: SITE.description }),
        meta({ property: 'og:image', content: image }),
        meta({ property: 'og:image:width', content: '1200' }),
        meta({ property: 'og:image:height', content: '630' }),
        meta({ property: 'og:image:alt', content: `${SITE.name}: ${SITE.tagline}` }),
        meta({ name: 'twitter:card', content: 'summary_large_image' }),
        meta({ name: 'twitter:title', content: title }),
        meta({ name: 'twitter:description', content: SITE.description }),
        meta({ name: 'twitter:image', content: image }),
        ...(SITE.verification.google ? [meta({ name: 'google-site-verification', content: SITE.verification.google })] : []),
        ...(SITE.verification.bing ? [meta({ name: 'msvalidate.01', content: SITE.verification.bing })] : []),
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(website), injectTo: 'head' },
      ]
      return { html: html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`), tags }
    },
  }
}

const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), spaFallback(), devApi(), siteMeta()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // The project lives on a Windows mount under WSL, where native file events do not fire.
    watch: { usePolling: true, interval: 600, ignored: ['**/data/raw/**', '**/.screenshots/**', '**/dist/**'] },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
})
