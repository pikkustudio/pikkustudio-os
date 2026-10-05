import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VaultAdmin } from '../src/admin.ts'
import { VaultClientSecretService } from '../src/client.ts'
import { startVault, vaultPaths, type RunningVault } from '../src/server.ts'

let home: string
let vault: RunningVault
let admin: VaultClientSecretService
let control: VaultAdmin

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), 'vault-'))
  vault = (await startVault(home))!
  const paths = vaultPaths(home)
  const connection = { socketPath: paths.socket, token: readFileSync(paths.adminToken, 'utf8').trim() }
  admin = new VaultClientSecretService(connection)
  control = new VaultAdmin(connection)
})

afterAll(async () => {
  await vault.close()
  rmSync(home, { recursive: true, force: true })
})

test('round trips a secret and audits the read', async () => {
  await admin.setSecret('api', { token: 'sk-1' })
  expect((await admin.getSecret<{ token: string }>('api')).reveal()).toEqual({ token: 'sk-1' })
  const trail = await control.activity()
  expect(trail.intact).toBe(true)
  expect(trail.events.map((e) => e.type)).toContain('secret.read')
})

test('a scoped token reads only its keys and cannot write', async () => {
  await admin.setSecret('other', 'x')
  const token = await control.mintToken('project-a', ['api'])
  const scoped = new VaultClientSecretService({ socketPath: vaultPaths(home).socket, token })
  expect((await scoped.getSecret<{ token: string }>('api')).reveal().token).toBe('sk-1')
  await expect(scoped.getSecret('other')).rejects.toThrow('403')
  await expect(scoped.setSecret('api', 'y')).rejects.toThrow('403')
})

test('missing key and wrong-key envelope are rejected', async () => {
  await expect(admin.getSecret('nope')).rejects.toThrow('Requested secret not found: nope')
  const forged = JSON.stringify({ alg: 'sealed-x25519-v1', kid: 'other', epk: 'a', iv: 'a', ct: 'a', tag: 'a' })
  await expect(admin.setEncryptedSecret('k', forged)).rejects.toThrow('400')
})
