import { ForbiddenError } from '@pikku/core/errors'
import { ADDON_HEADER, addonScopeCap } from '@pikku/core/middleware'
import { pikkuMiddleware, addHTTPMiddleware } from '#pikku/middleware'
import { addonRoles } from '#pikku/screens/pikku-addon-roles.gen.js'
import { isLocalRequest } from '../lib/local-sign-in.js'

const cap = addonScopeCap({ resolve: (name) => addonRoles[name] })

/** A call made for an addon reaches only that addon's own functions, through the rpc route. */
export const addonMayCall = (addon: string, path: string | undefined) => {
  const call = /^\/rpc\/([^/]+)$/.exec(path ?? '')
  return !!call && decodeURIComponent(call[1]!).startsWith(`${addon}:`)
}

export const addonUiCall = pikkuMiddleware({
  priority: 'lowest',
  func: async ({ ...services }, { http, setInitialSession, getSession, ...wire }, next) => {
    const addon = http?.request?.header(ADDON_HEADER)
    if (addon && !addonMayCall(addon, http?.request?.path?.())) {
      throw new ForbiddenError(`The ${addon} addon can only call its own functions`)
    }
    const current = await getSession?.()
    const headers = { get: (name: string) => http?.request?.header(name) ?? null }
    if (addon && current && setInitialSession && isLocalRequest(headers)) {
      await setInitialSession({ ...current, scopes: ['*'] })
    }
    await cap(services, { http, setInitialSession, getSession, ...wire }, next)
  },
})

addHTTPMiddleware('*', [addonUiCall])
