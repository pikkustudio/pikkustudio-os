import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const project = join(here, '..', '..')
const modules = realpathSync(join(project, 'node_modules'))
const real = (name: string) => realpathSync(join(project, 'node_modules', name))
const sources = [real('@pikkustudio/blocks/src'), real('@pikkustudio/addon-spindle/dist')]

writeFileSync(join(here, 'src', 'sources.gen.css'), sources.map((dir) => `@source '${dir}';`).join('\n') + '\n')

const api = process.env.VITE_API_PROXY ?? 'http://localhost:4003'

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: { jsx: 'automatic' },
  resolve: {
    dedupe: ['react', 'react-dom', '@pikku/react', '@pikku/fetch', 'lucide-react'],
  },
  server: {
    host: '127.0.0.1',
    allowedHosts: true,
    fs: { allow: [project, dirname(modules)] },
    headers: { 'Content-Security-Policy': "frame-ancestors *" },
    proxy: Object.fromEntries(['/rpc', '/content', '/upload', '/api'].map((path) => [path, { target: api, changeOrigin: true }])),
  },
})
