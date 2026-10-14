import { pikkuMiddleware } from '#pikku/middleware'
import { holdConnection } from '../lib/sleep.js'

export const studioAccess = pikkuMiddleware(async (_services, _wire, next) => {
  const release = holdConnection()
  try {
    await next()
  } finally {
    release()
  }
})
