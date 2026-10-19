import { betterAuthOAuthAccessToken } from '@pikku/better-auth'
import { addGlobalMiddleware } from '#pikku/middleware'
import { oauthIssuer } from '../lib/oauth-provider.js'

// Medium priority runs ahead of the stateless cookie session (lowest) and stands down when a
// session is already set, so the service-token gate and cookie sign-in behave exactly as before.
addGlobalMiddleware([betterAuthOAuthAccessToken({ issuer: oauthIssuer })])
