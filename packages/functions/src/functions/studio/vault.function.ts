import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'

const SecretKey = z.string().regex(/^[A-Za-z0-9_.-]{1,128}$/)

export const VaultSecretsInput = z.object({})

export const VaultSecretsOutput = z.object({
  publicKey: z.string(),
  keyId: z.string(),
  secrets: z.array(z.object({ key: z.string() })),
})

export const vaultSecrets = pikkuFunc({
  expose: true,
  auth: true,
  description: 'The names of the secrets in the vault, and the key a new one is sealed to.',
  input: VaultSecretsInput,
  output: VaultSecretsOutput,
  func: async ({ vaultAdmin }) => {
    const { publicKey, keyId } = await vaultAdmin.sealingKey()
    const keys = await vaultAdmin.keys()
    return { publicKey, keyId, secrets: keys.map((key) => ({ key })) }
  },
})

export const PutVaultSecretOutput = z.object({ ok: z.literal(true) })

export const PutVaultSecretInput = z.object({ key: SecretKey, sealed: z.string().min(1) })

export const putVaultSecret = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Store a secret that was sealed in the browser. The value never reaches Studio unsealed.',
  input: PutVaultSecretInput,
  output: PutVaultSecretOutput,
  func: async ({ vaultAdmin }, { key, sealed }) => {
    await vaultAdmin.put(key, sealed)
    return { ok: true as const }
  },
})

export const DeleteVaultSecretInput = z.object({ key: SecretKey })

export const DeleteVaultSecretOutput = z.object({ ok: z.literal(true) })

export const deleteVaultSecret = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Remove a secret from the vault.',
  input: DeleteVaultSecretInput,
  output: DeleteVaultSecretOutput,
  func: async ({ vaultAdmin }, { key }) => {
    await vaultAdmin.remove(key)
    return { ok: true as const }
  },
})

export const VaultActivityInput = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
})

export const VaultActivityOutput = z.object({
  intact: z.boolean(),
  nextCursor: z.number().nullable(),
  events: z.array(
    z.object({
      at: z.string(),
      who: z.string(),
      action: z.string(),
      key: z.string().nullable(),
      outcome: z.string(),
    })
  ),
})

export const vaultActivity = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Who read, wrote or removed secrets, newest first, and whether the record is intact.',
  input: VaultActivityInput,
  output: VaultActivityOutput,
  func: async ({ vaultAdmin }, { limit, offset }) => {
    const trail = await vaultAdmin.activity(limit ?? 50, offset ?? 0)
    return {
      intact: trail.intact,
      nextCursor: trail.nextCursor,
      events: trail.events.map((event) => ({
        at: event.occurredAt,
        who: event.userIdentity?.userId ?? 'unknown',
        action: event.type,
        key: typeof event.metadata?.key === 'string' ? event.metadata.key : null,
        outcome: event.outcome ?? 'success',
      })),
    }
  },
})
