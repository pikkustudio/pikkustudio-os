import { ADDON_HEADER, addonScopeCap } from '@pikku/core/middleware'
import { pikkuMiddleware, addHTTPMiddleware } from '#pikku/middleware'
import { addonRoles } from '#pikku/screens/pikku-addon-roles.gen.js'
import { isLocalRequest } from '../lib/local-sign-in.js'

const cap = addonScopeCap({ resolve: (name) => addonRoles[name] })

export const addonUiCall = pikkuMiddleware({
  priority: 'lowest',
  func: async ({ ...services }, { http, setSession, getSession, ...wire }, next) => {
    const current = await getSession?.()
    const headers = { get: (name: string) => http?.request?.header(name) ?? null }
    if (http?.request?.header(ADDON_HEADER) && current && setSession && isLocalRequest(headers)) {
      setSession({ ...current, scopes: ['*'] })
    }
    await cap(services, { http, setSession, getSession, ...wire }, next)
  },
})

addHTTPMiddleware('*', [addonUiCall])
