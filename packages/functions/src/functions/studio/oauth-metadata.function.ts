import { z } from 'zod'
import { oauthProviderAuthServerMetadata, oauthProviderOpenIdConfigMetadata } from '@better-auth/oauth-provider'
import { pikkuSessionlessFunc } from '#pikku/function'

const metadataRequest = (path: string, header: (name: string) => string | null | undefined) => {
  const proto = header('x-forwarded-proto')?.split(',')[0]?.trim() || 'http'
  const host = header('x-forwarded-host')?.split(',')[0]?.trim() || header('host') || 'localhost'
  return new Request(`${proto}://${host}${path}`)
}

const metadata = (kind: 'server' | 'openid', path: string) =>
  pikkuSessionlessFunc({
    description: kind === 'server' ? 'OAuth authorization server metadata.' : 'OpenID configuration metadata.',
    input: z.object({}),
    output: z.record(z.string(), z.unknown()),
    func: async ({ auth }, _input, { http }) => {
      const instance = await (auth as () => Promise<Parameters<typeof oauthProviderAuthServerMetadata>[0] & Parameters<typeof oauthProviderOpenIdConfigMetadata>[0]>)()
      const request = metadataRequest(path, (name) => http?.request?.header(name))
      const answer = await (kind === 'server' ? oauthProviderAuthServerMetadata(instance) : oauthProviderOpenIdConfigMetadata(instance))(request)
      http?.response?.header('Cache-Control', 'public, max-age=15')
      return (await answer.json()) as Record<string, unknown>
    },
  })

export const oauthServerMetadata = metadata('server', '/api/auth/.well-known/oauth-authorization-server')
export const openIdMetadata = metadata('openid', '/api/auth/.well-known/openid-configuration')
