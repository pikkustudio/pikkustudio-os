import { createHash, timingSafeEqual } from 'node:crypto'
import { UnauthorizedError } from '@pikku/core/errors'
import { pikkuMiddleware } from '#pikku/addon/middleware'

export const STUDIO_COOKIE = 'studio_token'
export const SERVICE_USER_ID = 'studio-service'

export const serviceModeOn = () => Boolean(process.env.PIKKU_STUDIO_SERVICE_TOKEN)

const digest = (value: string) => createHash('sha256').update(value).digest()

export const isServiceToken = (authorization: string | undefined | null, expected = process.env.PIKKU_STUDIO_SERVICE_TOKEN) => {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '')
  if (!expected || !match) return false
  return timingSafeEqual(digest(match[1]!.trim()), digest(expected))
}

export const credentialFrom = (authorization: string | null | undefined, cookie: string | null | undefined) =>
  authorization ?? (cookie ? `Bearer ${cookie}` : undefined)

export const serviceGate = pikkuMiddleware(async (_services, { http, setSession }, next) => {
  if (serviceModeOn()) {
    const bearer = http?.request?.header('authorization')
    const cookie = http?.request?.cookie(STUDIO_COOKIE)
    if (!setSession || !isServiceToken(credentialFrom(bearer, cookie))) throw new UnauthorizedError()
    setSession({ userId: SERVICE_USER_ID })
    if (bearer && !cookie) {
      http?.response?.cookie(STUDIO_COOKIE, bearer.replace(/^Bearer\s+/i, '').trim(), {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 8 * 60 * 60,
      })
    }
  }
  await next()
})
