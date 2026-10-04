#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const serverDir = fileURLToPath(new URL('.', import.meta.url))

/** Starts the design server for `root`, resolving with the URL it serves on. */
export async function startDesignServer({ root, port, base } = {}) {
  const workspace = resolve(root ?? process.env.PIKKU_DESIGN_ROOT ?? process.cwd())
  process.env.PIKKU_DESIGN_ROOT = workspace
  if (port !== undefined) process.env.PIKKU_DESIGN_PORT = String(port)
  if (base) process.env.PIKKU_DESIGN_BASE = base
  const { createServer, loadConfigFromFile } = await import('vite')
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    resolve(serverDir, 'vite.config.ts'),
    serverDir,
    undefined,
    undefined,
    'runner',
  )
  const server = await createServer({ ...loaded.config, root: serverDir, configFile: false })
  await server.listen()
  const url = server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${server.config.server.port}/`
  return { url, close: () => server.close() }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: { root: { type: 'string' }, port: { type: 'string' }, base: { type: 'string' } },
  })
  const { url } = await startDesignServer(values)
  console.log(`Pikku design server on ${url}`)
}
