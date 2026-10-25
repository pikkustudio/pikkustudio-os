import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { fileURLToPath, URL } from 'node:url'
import { testIds } from './tools/testids.plugin.ts'
import { inlangProject } from '../../scripts/inlang-project.mjs'
import { routeIgnorePattern } from '../../scripts/route-ignore.mjs'

const base = process.env.PIKKUSTUDIO_FRONTEND_BASE || '/'

// Plain TanStack Start config (Node target) — used for local sandbox dev. This
// template is deploy-provider agnostic: it ships NO @cloudflare/vite-plugin. At
// deploy, cloud CI injects the CF adapter (vite.config.cf.ts merges cloudflare()
// on top of this config) to emit the CF Workers SSR bundle. Do not add cloudflare
// here — that would double-apply it and couple the template to a provider.
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:4740'
const remoteApi = apiTarget.startsWith('https://')
const remoteOrigin = remoteApi ? new URL(apiTarget).origin : ''

const remoteProxy = remoteApi
  ? {
      changeOrigin: true,
      secure: true,
      cookieDomainRewrite: 'localhost',
      configure: (proxy: any) => {
        proxy.on('proxyReq', (proxyReq: any) => {
          if (proxyReq.getHeader('origin')) proxyReq.setHeader('origin', remoteOrigin)
          if (proxyReq.getHeader('referer')) proxyReq.setHeader('referer', `${remoteOrigin}/`)
        })
        proxy.on('proxyRes', (proxyRes: any) => {
          const cookies = proxyRes.headers['set-cookie']
          if (cookies) {
            proxyRes.headers['set-cookie'] = cookies.map((c: string) =>
              c
                .replace(/;\s*Secure/gi, '')
                .replace(/;\s*Partitioned/gi, '')
                .replace(/;\s*SameSite=None/gi, '; SameSite=Lax'),
            )
          }
        })
      },
    }
  : { changeOrigin: false }

// Web-edition dev (scripts/dev-hosted.sh): the bundle calls its own origin (VITE_API_URL=http://localhost:4741), because the
// real API's CORS does not allow a localhost origin and its session cookie is for .pikkustudio.app. Every API path is
// forwarded unrewritten to the remote API instead, with the cookie made host-only so it sticks to localhost. Browser
// navigations (Accept: text/html) stay with Vite, since the frontend has pages under some of these prefixes.
const hostedDev = process.env.VITE_STUDIO_LOCAL === 'false'
const hostedProxy = hostedDev
  ? {
      '^/(rpc|auth|api|studio|workspace|p|upload|content)(/|$)': {
        target: apiTarget,
        ...remoteProxy,
        cookieDomainRewrite: '',
        ws: true,
        bypass: (req: any) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
    }
  : undefined

export default defineConfig(() => {
  return {
  base,
  plugins: [
    // Compile messages/*.json → src/paraglide so `m` resolves, with HMR
    // on message edits. Must run first.
    paraglideVitePlugin({ project: inlangProject(fileURLToPath(new URL('.', import.meta.url))), outdir: './src/paraglide' }),
    tailwindcss(),
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: '/index.html' } }, router: { routeFileIgnorePattern: routeIgnorePattern(fileURLToPath(new URL('.', import.meta.url))) } }),
    // Stamps the `data-testid`s browser scenarios address controls by, derived from each
    // control's i18n message key. A standalone pre-transform rather than a `babel` option
    // on react(): @vitejs/plugin-react@6 (rolldown/oxc) drops that option, and this must
    // not quietly stop running on the bump. NOT dev-only — scenarios drive the built app.
    testIds(),
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', '@pikku/react', '@pikku/fetch', '@tanstack/react-query', 'lucide-react'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    // Local dev only — mirrors the sandbox edge (Caddy): /api/auth/* keeps its
    // prefix (Better Auth mounts there), every other /api/* reaches the pikku
    // dev server unprefixed (/rpc/...). In the sandbox Caddy handles /api
    // before Vite, so this proxy never fires there.
    // changeOrigin stays false so the backend sees Host = the app origin —
    // Better Auth trusts the request origin only when it matches Host.
    proxy: hostedProxy ?? {
      '/api/auth': {
        target: apiTarget,
        ...remoteProxy,
      },
      '/api': {
        target: apiTarget,
        ...remoteProxy,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Forward the WebSocket upgrade too, so a pikku channel over /api works
        // the day someone adds one. Nothing here opens a socket yet; without
        // this the handshake would stop at Vite and fail in local dev only,
        // since Caddy already carries upgrades in the sandbox.
        ws: true,
      },
      // File content: the pikku dev server serves uploads (PUT) and assets (GET)
      // AT these prefixes (pikku.config.json content.uploadUrlPrefix/assetUrlPrefix),
      // so proxy them through WITHOUT a rewrite. `/content` (not `/assets`) avoids
      // colliding with Vite/TanStack's own built asset paths. In the sandbox Caddy
      // handles these before Vite, so this proxy only fires in local dev.
      '^/p/': {
        target: apiTarget,
        ...remoteProxy,
      },
      '/upload': {
        target: apiTarget,
        ...remoteProxy,
      },
      '/content': {
        target: apiTarget,
        ...remoteProxy,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? req.url : undefined),
      },
    },
  },
}
})
