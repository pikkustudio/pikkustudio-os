import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { beforeAll, describe, test } from 'bun:test'
import { betterAuth } from 'better-auth'
import { getMigrations } from 'better-auth/db/migration'
import { studioOAuth } from '../../lib/oauth-provider.js'
import { oauthServerMetadata, openIdMetadata } from './oauth-metadata.function.js'

describe('well-known metadata functions', () => {
  let auth: unknown

  beforeAll(async () => {
    const oauth = studioOAuth({})
    const options = { secret: randomBytes(32).toString('hex'), baseURL: oauth.baseURL, database: new Database(':memory:'), disabledPaths: oauth.disabledPaths, plugins: oauth.plugins }
    await (await getMigrations(options)).runMigrations()
    auth = betterAuth(options)
  })

  const run = async (fn: typeof oauthServerMetadata, headers: Record<string, string>) => {
    const sent: Record<string, string> = {}
    const http = { request: { header: (name: string) => headers[name.toLowerCase()] }, response: { header: (name: string, value: string) => void (sent[name] = value) } }
    const body = await (fn as unknown as { func: (s: unknown, i: unknown, w: unknown) => Promise<Record<string, unknown>> }).func({ auth: async () => auth }, {}, { http })
    return { body, sent }
  }

  test('the authorization server document is built for the host the client called', async () => {
    const { body, sent } = await run(oauthServerMetadata, { host: '127.0.0.1:4740' })
    assert.equal(body.issuer, 'http://127.0.0.1:4740/api/auth')
    assert.equal(body.authorization_endpoint, 'http://127.0.0.1:4740/api/auth/oauth2/authorize')
    assert.equal(body.registration_endpoint, 'http://127.0.0.1:4740/api/auth/oauth2/register')
    assert.ok(sent['Cache-Control'])
  })

  test('behind a proxy the forwarded host and scheme win', async () => {
    const { body } = await run(openIdMetadata, { host: 'internal:4740', 'x-forwarded-host': 'studio.example.com', 'x-forwarded-proto': 'https' })
    assert.equal(body.issuer, 'https://studio.example.com/api/auth')
    assert.equal(body.jwks_uri, 'https://studio.example.com/api/auth/jwks')
  })
})
