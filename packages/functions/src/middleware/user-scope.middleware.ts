import { asUser } from '@pikkustudio/addon-studio/services'
import { pikkuMiddleware, addHTTPMiddleware } from '#pikku/middleware'

/**
 * Makes the signed-in person of a request known to the code that has no wire to ask (an addon keeping a per-user secret):
 * the session is read lazily, so it is whatever the session middleware settled on.
 */
export const userScope = pikkuMiddleware({
  priority: 'lowest',
  func: async (_services, { getSession }, next) => {
    await asUser(async () => (await getSession?.())?.userId, next)
  },
})

addHTTPMiddleware('*', [userScope])
