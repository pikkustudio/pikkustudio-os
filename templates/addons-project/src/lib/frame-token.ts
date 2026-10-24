import { createHmac, timingSafeEqual } from 'node:crypto'

export const FRAME_AUDIENCE = 'studio-addons'

export type FrameClaims = {
  sub: string
  scopes: string[]
  addon: string
  aud: string
  iat: number
  exp: number
}

export class FrameTokenError extends Error {}

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')

const signature = (secret: string, signingInput: string) =>
  createHmac('sha256', secret).update(signingInput).digest()

const reject = (reason: string): never => {
  throw new FrameTokenError(reason)
}

export function verifyFrameToken(
  token: string,
  expected: { secret: string; addon: string; audience: string; now?: number }
): FrameClaims {
  const parts = token.split('.')
  if (parts.length !== 3) return reject('malformed')
  const [header, payload, presented] = parts as [string, string, string]
  if (header !== HEADER) return reject('algorithm')
  const given = Buffer.from(presented, 'base64url')
  const wanted = signature(expected.secret, `${header}.${payload}`)
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return reject('signature')
  let claims: FrameClaims
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return reject('payload')
  }
  const nowSeconds = Math.floor((expected.now ?? Date.now()) / 1000)
  if (claims.aud !== expected.audience) return reject('audience')
  if (claims.addon !== expected.addon) return reject('addon')
  if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return reject('expired')
  if (typeof claims.iat !== 'number' || claims.iat > nowSeconds + 60) return reject('issued in the future')
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) return reject('subject')
  if (!Array.isArray(claims.scopes) || !claims.scopes.every((scope) => typeof scope === 'string')) return reject('scopes')
  return claims
}

export function sessionFromFrameToken(
  bearer: string | undefined,
  addon: string | undefined,
  secret: string | undefined,
  now?: number
): { userId: string; scopes: string[] } | null {
  if (!bearer || !addon || !secret) return null
  try {
    const claims = verifyFrameToken(bearer, { secret, addon, audience: FRAME_AUDIENCE, now })
    return { userId: claims.sub, scopes: claims.scopes }
  } catch (error) {
    if (error instanceof FrameTokenError) return null
    throw error
  }
}
