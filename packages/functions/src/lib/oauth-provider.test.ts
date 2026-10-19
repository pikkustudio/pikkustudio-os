import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, test } from 'bun:test'
import { betterAuth } from 'better-auth'
import { getMigrations } from 'better-auth/db/migration'
import { betterAuthOAuthAccessToken } from '@pikku/better-auth'
import { oauthProviderAuthServerMetadata, oauthProviderOpenIdConfigMetadata } from '@better-auth/oauth-provider'
import { connectPages, mcpResources, oauthIssuer, studioOAuth } from './oauth-provider.js'
import { studioLocalSignIn } from './local-sign-in.js'

describe('oauth provider settings', () => {
  test('sign-in and consent pages sit on the app origin, or are relative without one', () => {
    assert.deepEqual(connectPages('http://127.0.0.1:4741/'), {
      loginPage: 'http://127.0.0.1:4741/connect/sign-in',
      consentPage: 'http://127.0.0.1:4741/connect',
    })
    assert.deepEqual(connectPages(undefined), { loginPage: '/connect/sign-in', consentPage: '/connect' })
  })

  test('the MCP resource is the public URL when set, else both loopback names on the API port', () => {
    assert.deepEqual(mcpResources('https://studio.example.com/', '4740'), ['https://studio.example.com/mcp'])
    assert.deepEqual(mcpResources(undefined, '5000'), ['http://127.0.0.1:5000/mcp', 'http://localhost:5000/mcp'])
    assert.deepEqual(mcpResources(undefined, undefined), ['http://127.0.0.1:4740/mcp', 'http://localhost:4740/mcp'])
  })

  test('tokens are verified against the auth route of the request origin, for the origin or its MCP URL', () => {
    assert.deepEqual(oauthIssuer('http://127.0.0.1:4740'), {
      issuer: 'http://127.0.0.1:4740/api/auth',
      audience: ['http://127.0.0.1:4740', 'http://127.0.0.1:4740/mcp'],
    })
  })

  test('the base URL is the configured public URL, else any host the request arrives on', () => {
    assert.equal(studioOAuth({ publicUrl: 'https://studio.example.com/' }).baseURL, 'https://studio.example.com')
    assert.deepEqual(studioOAuth({}).baseURL, { allowedHosts: ['*'], protocol: 'auto' })
  })

  test('the better-auth /token route is switched off, the jwt plugin owns tokens', () => {
    assert.deepEqual(studioOAuth({}).disabledPaths, ['/token'])
  })
})

const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url')

type Auth = {
  handler: (request: Request) => Promise<Response>
  $context: Promise<{ internalAdapter: { findUserByEmail: (email: string) => Promise<{ user: { id: string } }> } }>
}

describe('MCP sign-in against a real better-auth instance', () => {
  let server: ReturnType<typeof Bun.serve>
  let origin = ''
  let auth: Auth
  const redirectUri = 'http://127.0.0.1:9/callback'

  beforeAll(async () => {
    server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: (request: Request) => (new URL(request.url).pathname.startsWith('/api/auth') ? auth.handler(request) : new Response('no', { status: 404 })) })
    origin = `http://127.0.0.1:${server.port}`
    const oauth = studioOAuth({ appUrl: 'http://127.0.0.1:4741', port: String(server.port) })
    const options = {
      secret: randomBytes(32).toString('hex'),
      baseURL: origin,
      database: new Database(':memory:'),
      disabledPaths: oauth.disabledPaths,
      plugins: [studioLocalSignIn(), ...oauth.plugins],
    }
    await (await getMigrations(options)).runMigrations()
    auth = betterAuth(options) as unknown as Auth
  })

  afterAll(() => server.stop(true))

  const call = (path: string, init?: RequestInit) => fetch(`${origin}${path}`, { redirect: 'manual', ...init })

  test('both well-known documents are served and name the same issuer', async () => {
    const request = new Request(`${origin}/api/auth/.well-known/oauth-authorization-server`)
    const server_ = await (await oauthProviderAuthServerMetadata(auth as never)(request)).json()
    const openid = await (await oauthProviderOpenIdConfigMetadata(auth as never)(request)).json()
    assert.equal(server_.issuer, `${origin}/api/auth`)
    assert.equal(openid.issuer, `${origin}/api/auth`)
    assert.equal(server_.registration_endpoint, `${origin}/api/auth/oauth2/register`)
    assert.deepEqual(server_.code_challenge_methods_supported, ['S256'])
  })

  test('a client registers itself, signs in, consents, and the token it gets is accepted as a session', async () => {
    const registered = await call('/api/auth/oauth2/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_name: 'Claude Code', redirect_uris: [redirectUri], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }),
    })
    assert.equal(registered.status, 201, await registered.clone().text())
    const client = (await registered.json()) as { client_id: string }

    const verifier = randomBytes(32).toString('base64url')
    const authorize = `/api/auth/oauth2/authorize?${new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: redirectUri,
      scope: 'openid offline_access',
      state: 'abc',
      code_challenge: challenge(verifier),
      code_challenge_method: 'S256',
      resource: `${origin}/mcp`,
    })}`

    const signedOut = await call(authorize)
    assert.equal(signedOut.status, 302)
    assert.ok(signedOut.headers.get('location')?.startsWith('http://127.0.0.1:4741/connect/sign-in?'))
    const oauthQuery = new URL(signedOut.headers.get('location')!).search.slice(1)

    const signedIn = await call('/api/auth/sign-in/local', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ oauth_query: oauthQuery }) })
    assert.equal(signedIn.status, 200)
    const next = ((await signedIn.json()) as { url: string }).url
    assert.ok(next.startsWith('http://127.0.0.1:4741/connect?'), next)
    const cookie = signedIn.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')

    const consentQuery = new URL(next).search.slice(1)
    const consent = await call('/api/auth/oauth2/consent', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', cookie }, body: JSON.stringify({ accept: true, oauth_query: consentQuery }) })
    assert.equal(consent.status, 200)
    const back = new URL(((await consent.json()) as { url: string }).url)
    assert.equal(back.origin + back.pathname, redirectUri)
    assert.equal(back.searchParams.get('state'), 'abc')

    const token = await call('/api/auth/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: back.searchParams.get('code')!, redirect_uri: redirectUri, client_id: client.client_id, code_verifier: verifier, resource: `${origin}/mcp` }),
    })
    assert.equal(token.status, 200)
    const { access_token } = (await token.json()) as { access_token: string }
    assert.equal(access_token.split('.').length, 3)

    const sessionFor = async (authorization: string | undefined) => {
      let session: unknown
      const headers: Record<string, string | undefined> = { authorization, host: `127.0.0.1:${server.port}` }
      const wire = {
        http: { request: { header: (name: string) => headers[name.toLowerCase()] } },
        setInitialSession: async (value: unknown) => {
          session = value
        },
        getSession: () => undefined,
        session: undefined,
      }
      const middleware = betterAuthOAuthAccessToken({ issuer: oauthIssuer }) as unknown as (services: unknown, wire: unknown, next: () => Promise<void>) => Promise<void>
      await middleware({ logger: { warn: () => {} } }, wire, async () => {})
      return session as { userId?: string } | undefined
    }

    const user = await auth.$context.then((c) => c.internalAdapter.findUserByEmail('owner@studio.local'))
    assert.equal((await sessionFor(`Bearer ${access_token}`))?.userId, user.user.id)
    assert.equal(await sessionFor(`Bearer ${access_token.slice(0, -4)}AAAA`), undefined)
    assert.equal(await sessionFor(undefined), undefined)
  })
})
