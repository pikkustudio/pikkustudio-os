import { UnauthorizedError } from '@pikku/core/errors'
import { pikkuMiddleware } from '#pikku/middleware'
import { isServiceToken } from '../lib/sleep.js'
import { SERVICE_USER_ID, serviceModeOn } from '../lib/service-mode.js'

export const STUDIO_COOKIE = 'studio_token'

// Previews load in iframes and cannot send an Authorization header, so a verified Bearer call
// also leaves an HttpOnly cookie that the same check accepts. The cookie carries the token itself.
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
