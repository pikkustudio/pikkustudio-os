import { defineHTTPRoutes, wireHTTPRoutes } from '#pikku/http'
import { oauthServerMetadata, openIdMetadata } from './functions/studio/oauth-metadata.function.js'

const oauthMetadataRoutes = defineHTTPRoutes({
  auth: false,
  tags: ['oauth'],
  routes: {
    serverRoot: { method: 'get', route: '/.well-known/oauth-authorization-server', func: oauthServerMetadata },
    serverIssuer: { method: 'get', route: '/.well-known/oauth-authorization-server/api/auth', func: oauthServerMetadata },
    serverUnderAuth: { method: 'get', route: '/api/auth/.well-known/oauth-authorization-server', func: oauthServerMetadata },
    openIdRoot: { method: 'get', route: '/.well-known/openid-configuration', func: openIdMetadata },
    openIdIssuer: { method: 'get', route: '/.well-known/openid-configuration/api/auth', func: openIdMetadata },
    openIdUnderAuth: { method: 'get', route: '/api/auth/.well-known/openid-configuration', func: openIdMetadata },
  },
})

wireHTTPRoutes({ routes: { oauthMetadata: oauthMetadataRoutes } })
