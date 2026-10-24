import { ADDON_HEADER, addonScopeCap } from '@pikku/core/middleware'
import { pikkuMiddleware, addHTTPMiddleware } from '#pikku/middleware'
import { addonRoles } from '#pikku/screens/pikku-addon-roles.gen.js'
import { assertAddonMayReach } from '../lib/addon-reach.js'
import { sessionFromFrameToken } from '../lib/frame-token.js'

const cap = addonScopeCap({ resolve: (name) => addonRoles[name] })

export const addonUiCall = pikkuMiddleware({
  priority: 'lowest',
  func: async ({ ...services }, { http, setSession, getSession, ...wire }, next) => {
    const bearer = http?.request?.header('authorization')?.replace(/^Bearer /, '')
    const addon = http?.request?.header(ADDON_HEADER)
    if (setSession && bearer && addon && !(await getSession?.())) {
      const session = sessionFromFrameToken(bearer, addon, process.env.ADDONS_FRAME_SECRET)
      if (session) setSession(session)
    }
    await cap(services, { http, setSession, getSession, ...wire }, async () => {
      if (addon) assertAddonMayReach(addon, http?.request?.params?.().rpcName as string | undefined)
      await next()
    })
  },
})

addHTTPMiddleware('*', [addonUiCall])
