import { createAuthEndpoint, APIError } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import type { BetterAuthPlugin } from 'better-auth'
import { serviceModeOn } from './service-mode.js'

export const STUDIO_OWNER = { email: 'owner@studio.local', name: 'Studio owner' }

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const PROXY_MARKERS = ['forwarded', 'x-forwarded-for', 'x-forwarded-host']

export const isLocalRequest = (headers: Pick<Headers, 'get'> | undefined): boolean => {
  if (!headers || serviceModeOn()) return false
  if (PROXY_MARKERS.some((marker) => headers.get(marker))) return false
  try {
    return LOCAL_HOSTNAMES.has(new URL(`http://${headers.get('host') ?? ''}`).hostname)
  } catch {
    return false
  }
}

export const studioLocalSignIn = () =>
  ({
    id: 'studio-local',
    endpoints: {
      signInLocal: createAuthEndpoint('/sign-in/local', { method: 'POST' }, async (ctx) => {
        if (!isLocalRequest(ctx.headers)) {
          throw new APIError('FORBIDDEN', { message: 'Studio only signs in from this computer' })
        }
        const found = await ctx.context.internalAdapter.findUserByEmail(STUDIO_OWNER.email)
        const user =
          found?.user ??
          (await ctx.context.internalAdapter.createUser({ ...STUDIO_OWNER, emailVerified: true }, { method: 'local' }))
        if (!user) throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Could not create the Studio owner' })
        const session = await ctx.context.internalAdapter.createSession(user.id)
        if (!session) throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Could not start a session' })
        await setSessionCookie(ctx, { session, user })
        return ctx.json({ userId: user.id })
      }),
    },
  }) satisfies BetterAuthPlugin
