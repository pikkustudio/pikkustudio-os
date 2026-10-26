import { randomBytes } from 'node:crypto'
import { connectVault } from '@pikkustudio/vault/connect'

export interface SecretKeeper {
  has(name: string): Promise<boolean>
  get(name: string): Promise<string>
  set(name: string, value: string): Promise<void>
}

/** A secret of Studio's own, made once as 32 random bytes and kept in the vault under `name`. */
export async function ensureSecret(keeper: SecretKeeper, name: string): Promise<string> {
  if (await keeper.has(name)) return keeper.get(name)
  const secret = randomBytes(32).toString('base64url')
  await keeper.set(name, secret)
  return secret
}

export const vaultKeeper = (home: string): SecretKeeper => ({
  has: async (name) => (await connectVault(home)).secrets.hasSecret(name),
  get: async (name) => (await (await connectVault(home)).secrets.getSecret(name)).reveal(),
  set: async (name, value) => (await connectVault(home)).secrets.setSecret(name, value),
})
