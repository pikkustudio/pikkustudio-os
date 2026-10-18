import { createHmac, timingSafeEqual } from 'node:crypto'

export const INBOX_AUDIENCE = 'studio-inbox'
export const INBOX_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

export interface InboxClaims {
  projectKey: string
  stage: string | null
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

const sign = (secret: string, input: string) =>
  createHmac('sha256', createHmac('sha256', secret).update(INBOX_AUDIENCE).digest()).update(input).digest('base64url')

export function mintInboxToken(args: {
  secret: string
  projectKey: string
  stage?: string | null
  now?: number
  ttlSeconds?: number
}): { token: string; expiresAt: number } {
  const issuedAt = Math.floor((args.now ?? Date.now()) / 1000)
  const expiresAt = issuedAt + (args.ttlSeconds ?? INBOX_TOKEN_TTL_SECONDS)
  const signingInput = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    projectKey: args.projectKey,
    stage: args.stage ?? null,
    aud: INBOX_AUDIENCE,
    iat: issuedAt,
    exp: expiresAt,
  })}`
  return { token: `${signingInput}.${sign(args.secret, signingInput)}`, expiresAt: expiresAt * 1000 }
}

export function verifyInboxToken(args: { secret: string; token: string; now?: number }): InboxClaims | null {
  const parts = args.token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts as [string, string, string]
  const expected = Buffer.from(sign(args.secret, `${header}.${payload}`))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      projectKey?: unknown
      stage?: unknown
      aud?: unknown
      exp?: unknown
    }
    if (claims.aud !== INBOX_AUDIENCE) return null
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= (args.now ?? Date.now())) return null
    if (typeof claims.projectKey !== 'string' || !claims.projectKey) return null
    return { projectKey: claims.projectKey, stage: typeof claims.stage === 'string' ? claims.stage : null }
  } catch {
    return null
  }
}
