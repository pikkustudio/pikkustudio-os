import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { UnauthorizedError } from '@pikku/core/errors'
import { canMintAddonToken } from '../../../permissions/can-mint-addon-token.js'
import { frameSecret, mintFrameToken, scopesFor } from '../../../lib/addon-frame-token.js'

export const MintAddonTokenInput = z.object({ addon: z.string().min(1).max(128) })

export const MintAddonTokenOutput = z.object({ token: z.string(), expiresAt: z.number() })

export const mintAddonToken = pikkuFunc({
  expose: true,
  auth: true,
  description: 'A short-lived token for one add-on screen: it carries the signed-in user and the add-on name, and is good only for that add-on.',
  permissions: { addon: [canMintAddonToken] },
  input: MintAddonTokenInput,
  output: MintAddonTokenOutput,
  func: async ({ studio }, { addon }, { session }) => {
    if (!session?.userId) throw new UnauthorizedError()
    return mintFrameToken({ secret: frameSecret(studio.home), userId: session.userId, scopes: scopesFor(session), addon })
  },
})
