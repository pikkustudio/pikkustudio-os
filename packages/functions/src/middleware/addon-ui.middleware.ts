import { ForbiddenError } from '@pikku/core/errors'
import { ADDON_HEADER, addonScopeCap } from '@pikku/core/middleware'
import { pikkuMiddleware, addHTTPMiddleware } from '#pikku/middleware'
import { addonRoles } from '#pikku/screens/pikku-addon-roles.gen.js'
import { pikkuState } from '@pikku/core/state'
import { isLocalRequest } from '../lib/local-sign-in.js'

/**
 * The role a call naming an addon is capped to. An addon with screens has the one generated from its functions'
 * scopes. A remote addon (wireRemoteAddon, e.g. `cloud`) has no functions here, only a contract it forwards to its own
 * host, which checks the caller itself: its role here is empty, as for an addon whose functions need no scope. Any
 * other name is unknown and refused.
 */
export const addonRoleOf = (name: string): readonly string[] | undefined => {
  if (Object.hasOwn(addonRoles, name)) return addonRoles[name]
  const wired = pikkuState(null, 'addons', 'packages').get(name) as { remote?: boolean } | undefined
  return wired?.remote ? [] : undefined
}

const cap = addonScopeCap({ resolve: addonRoleOf })

/**
 * A call made for an addon goes only through the rpc route, to an addon's function. Which addons it may reach (its
 * own, and the ones it lists in `uses`) Pikku checks on that route, from the same header.
 */
export const addonMayCall = (path: string | undefined) => {
  const call = /^\/rpc\/([^/]+)$/.exec(path ?? '')
  return !!call && /^[^:]+:[^:]/.test(decodeURIComponent(call[1]!))
}

export const addonUiCall = pikkuMiddleware({
  priority: 'lowest',
  func: async ({ ...services }, { http, setInitialSession, getSession, ...wire }, next) => {
    const addon = http?.request?.header(ADDON_HEADER)
    if (addon && !addonMayCall(http?.request?.path?.())) {
      throw new ForbiddenError(`The ${addon} addon can only call addon functions, through the rpc route`)
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
