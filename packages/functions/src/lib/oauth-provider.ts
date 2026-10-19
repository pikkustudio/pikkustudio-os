import { jwt } from 'better-auth/plugins'
import { oauthProvider } from '@better-auth/oauth-provider'

export const MCP_PATH = '/mcp'
export const CONNECT_SIGN_IN_PATH = '/connect/sign-in'
export const CONNECT_PATH = '/connect'

const origin = (value: string | null | undefined) => value?.trim().replace(/\/+$/, '') ?? ''

export const connectPages = (appUrl: string | null | undefined) => {
  const base = origin(appUrl)
  return { loginPage: `${base}${CONNECT_SIGN_IN_PATH}`, consentPage: `${base}${CONNECT_PATH}` }
}

export const mcpResources = (publicUrl: string | null | undefined, port: string | null | undefined) => {
  const explicit = origin(publicUrl)
  const origins = explicit ? [explicit] : [`http://127.0.0.1:${port || '4740'}`, `http://localhost:${port || '4740'}`]
  return origins.map((o) => `${o}${MCP_PATH}`)
}

export const mcpAudiences = (requestOrigin: string) => [requestOrigin, `${requestOrigin}${MCP_PATH}`]

export const oauthIssuer = (requestOrigin: string) => ({
  issuer: `${requestOrigin}/api/auth`,
  audience: mcpAudiences(requestOrigin),
})

export const authBaseURL = (publicUrl: string | null | undefined) => {
  const explicit = origin(publicUrl)
  return explicit || { allowedHosts: ['*'], protocol: 'auto' as const }
}

export const studioOAuth = (options: { appUrl?: string | null; publicUrl?: string | null; port?: string | null }) => ({
  baseURL: authBaseURL(options.publicUrl),
  disabledPaths: ['/token'],
  plugins: [
    jwt(),
    oauthProvider({
      ...connectPages(options.appUrl),
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      resources: mcpResources(options.publicUrl, options.port),
      enforcePerClientResources: false,
      clientRegistrationDefaultApplicationType: 'infer',
    }),
  ],
})
