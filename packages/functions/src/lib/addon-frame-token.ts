import { createHmac } from 'node:crypto'
import { ensureSecret, type SecretKeeper } from './vault-secret.js'

export const FRAME_AUDIENCE = 'studio-addons'
export const FRAME_TOKEN_TTL_SECONDS = 300
export const FRAME_SECRET_NAME = 'ADDONS_FRAME_SECRET'

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** The secret that signs the tokens addon screens carry; made once and kept in the vault. */
export const frameSecret = (keeper: SecretKeeper): Promise<string> => ensureSecret(keeper, FRAME_SECRET_NAME)

export function scopesFor(session: { scopes?: readonly string[] }): string[] {
  return session.scopes && session.scopes.length > 0 ? [...session.scopes] : ['*']
}

export function mintFrameToken(args: {
  secret: string
  userId: string
  scopes: readonly string[]
  addon: string
  now?: number
  ttlSeconds?: number
}): { token: string; expiresAt: number } {
  const issuedAt = Math.floor((args.now ?? Date.now()) / 1000)
  const expiresAt = issuedAt + (args.ttlSeconds ?? FRAME_TOKEN_TTL_SECONDS)
  const signingInput = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: args.userId,
    scopes: [...args.scopes],
    addon: args.addon,
    aud: FRAME_AUDIENCE,
    iat: issuedAt,
    exp: expiresAt,
  })}`
  const signature = createHmac('sha256', args.secret).update(signingInput).digest('base64url')
  return { token: `${signingInput}.${signature}`, expiresAt: expiresAt * 1000 }
}
