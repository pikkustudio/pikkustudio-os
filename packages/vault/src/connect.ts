import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { connect } from 'node:net'
import { fileURLToPath } from 'node:url'
import type { SecretService } from '@pikku/core/services'
import { VaultAdmin } from './admin.js'
import { VaultClientSecretService } from './client.js'
import { startVault, vaultPaths } from './server.js'

const live = (socket: string): Promise<boolean> =>
  new Promise((resolve) => {
    if (!existsSync(socket)) return resolve(false)
    const probe = connect(socket)
    probe.once('connect', () => {
      probe.destroy()
      resolve(true)
    })
    probe.once('error', () => resolve(false))
  })

export const isCompiled = (url: string = import.meta.url): boolean => url.includes('/$bunfs/') || url.includes('~BUN')

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface ConnectedVault {
  secrets: VaultClientSecretService
  admin: VaultAdmin
  socketPath: string
}

export const connectVault = async (
  home: string,
  fallback?: SecretService
): Promise<ConnectedVault> => {
  const paths = vaultPaths(home)
  if (!(await live(paths.socket)) && isCompiled()) {
    await startVault(home)
  }
  if (!(await live(paths.socket))) {
    const runtime = (globalThis as { Bun?: unknown }).Bun ? process.execPath : 'bun'
    const entry = fileURLToPath(new URL('./main.ts', import.meta.url))
    spawn(runtime, [entry], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PIKKU_VAULT_HOME: home },
    }).unref()
    for (let i = 0; i < 100 && !(await live(paths.socket)); i++) await wait(100)
    if (!(await live(paths.socket))) throw new Error(`Vault did not start at ${paths.socket}`)
  }
  const token = readFileSync(paths.adminToken, 'utf8').trim()
  const connection = { socketPath: paths.socket, token }
  return {
    secrets: new VaultClientSecretService({ ...connection, fallback }),
    admin: new VaultAdmin(connection),
    socketPath: paths.socket,
  }
}
