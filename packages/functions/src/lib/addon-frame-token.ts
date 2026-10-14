import { createHmac, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const FRAME_AUDIENCE = 'studio-addons'
export const FRAME_TOKEN_TTL_SECONDS = 300
export const FRAME_SECRET_NAME = 'ADDONS_FRAME_SECRET'

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

export function frameSecret(home: string): string {
  const file = join(home, 'env', 'addons.env')
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : []
  const present = lines.find((line) => line.startsWith(`${FRAME_SECRET_NAME}=`))
  if (present) return present.slice(FRAME_SECRET_NAME.length + 1).trim()
  const secret = randomBytes(32).toString('base64url')
  mkdirSync(join(home, 'env'), { recursive: true })
  const kept = lines.filter((line) => line.length > 0)
  writeFileSync(file, `${[...kept, `${FRAME_SECRET_NAME}=${secret}`].join('\n')}\n`, { mode: 0o600 })
  return secret
}

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
