import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VaultClientSecretService } from '../src/client.js'
import { connectVault, isCompiled, projectVaultEnv } from '../src/connect.js'
import { startVault } from '../src/server.js'

test('detects the compiled binary virtual filesystem', () => {
  expect(isCompiled('file:///$bunfs/root/vault/connect.ts')).toBe(true)
  expect(isCompiled('file:///Users/x/packages/vault/src/connect.ts')).toBe(false)
})

test('a project token sees its generated secrets, kept once written', async () => {
  const home = mkdtempSync(join(tmpdir(), 'vault-'))
  const vault = (await startVault(home))!
  try {
    const first = await projectVaultEnv(home, 'p1', { BETTER_AUTH_SECRET: 'one' })
    const again = await projectVaultEnv(home, 'p1', { BETTER_AUTH_SECRET: 'two' })
    const other = await projectVaultEnv(home, 'p2', { BETTER_AUTH_SECRET: 'three' })
    const read = (env: { PIKKU_VAULT_SOCKET: string; PIKKU_VAULT_TOKEN: string }) =>
      new VaultClientSecretService({ socketPath: env.PIKKU_VAULT_SOCKET, token: env.PIKKU_VAULT_TOKEN }).getSecret<string>('BETTER_AUTH_SECRET')
    expect((await read(first)).reveal()).toBe('one')
    expect((await read(again)).reveal()).toBe('one')
    expect((await read(other)).reveal()).toBe('three')
    expect((await (await connectVault(home)).admin.keys()).sort()).toEqual(['project:p1:BETTER_AUTH_SECRET', 'project:p2:BETTER_AUTH_SECRET'])
  } finally {
    await vault.close()
    rmSync(home, { recursive: true, force: true })
  }
})
