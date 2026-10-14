import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHmac } from 'node:crypto'
import {
  FRAME_AUDIENCE,
  FRAME_TOKEN_TTL_SECONDS,
  frameSecret,
  mintFrameToken,
  scopesFor,
} from './addon-frame-token.js'
import {
  FrameTokenError,
  sessionFromFrameToken,
  verifyFrameToken,
} from '../../../../addons-project/src/lib/frame-token.js'
import { OpenAddonsOutput } from '../functions/studio/addons/open-addons.function.js'
import { MintAddonTokenOutput } from '../functions/studio/addons/mint-addon-token.function.js'

const secret = 'frame-secret-for-tests'
const now = 1_800_000_000_000
const mint = (over: Partial<Parameters<typeof mintFrameToken>[0]> = {}) =>
  mintFrameToken({ secret, userId: 'user-1', scopes: ['spindle:library:read'], addon: 'spindle', now, ...over }).token

const verify = (token: string, over: Partial<Parameters<typeof verifyFrameToken>[1]> = {}) =>
  verifyFrameToken(token, { secret, addon: 'spindle', audience: FRAME_AUDIENCE, now, ...over })

const forge = (token: string, change: (claims: Record<string, unknown>) => void, key = secret) => {
  const [header, payload] = token.split('.') as [string, string]
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
  change(claims)
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return { tampered: `${header}.${body}.${token.split('.')[2]}`, resigned: `${header}.${body}.${createHmac('sha256', key).update(`${header}.${body}`).digest('base64url')}` }
}

describe('a frame token is good for one add-on, briefly, for the user it was minted for', () => {
  test('it carries the user, scopes, add-on and audience', () => {
    const claims = verify(mint())
    expect(claims).toMatchObject({ sub: 'user-1', scopes: ['spindle:library:read'], addon: 'spindle', aud: FRAME_AUDIENCE })
    expect(claims.exp - claims.iat).toBe(FRAME_TOKEN_TTL_SECONDS)
  })

  test('a token for add-on A is refused when the header names add-on B', () => {
    expect(() => verify(mint({ addon: 'spindle' }), { addon: 'diffui' })).toThrow(FrameTokenError)
    expect(sessionFromFrameToken(mint({ addon: 'spindle' }), 'diffui', secret, now)).toBeNull()
  })

  test('an expired token is refused', () => {
    const later = now + (FRAME_TOKEN_TTL_SECONDS + 1) * 1000
    expect(() => verify(mint(), { now: later })).toThrow(FrameTokenError)
    expect(sessionFromFrameToken(mint(), 'spindle', secret, later)).toBeNull()
    expect(sessionFromFrameToken(mint(), 'spindle', secret, now)).not.toBeNull()
  })

  test('a token for another audience is refused', () => {
    expect(() => verify(mint(), { audience: 'someone-else' })).toThrow(FrameTokenError)
  })

  test('a token signed with another secret is refused', () => {
    expect(() => verify(mint({ secret: 'not-the-secret' }))).toThrow(FrameTokenError)
  })

  test('tampered claims are refused', () => {
    const base = mint()
    for (const change of [
      (claims: Record<string, unknown>) => (claims.scopes = ['*']),
      (claims: Record<string, unknown>) => (claims.sub = 'someone-else'),
      (claims: Record<string, unknown>) => (claims.addon = 'diffui'),
      (claims: Record<string, unknown>) => (claims.exp = Number(claims.exp) + 86_400),
    ]) {
      const { tampered } = forge(base, change)
      expect(() => verify(tampered, { addon: 'diffui' })).toThrow(FrameTokenError)
      expect(() => verify(tampered)).toThrow(FrameTokenError)
    }
  })

  test('claims re-signed with a guessed secret are refused', () => {
    const { resigned } = forge(mint(), (claims) => (claims.scopes = ['*']), 'guess')
    expect(() => verify(resigned)).toThrow(FrameTokenError)
  })

  test('an unsigned token with alg none is refused', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = mint().split('.')[1]
    expect(() => verify(`${header}.${payload}.`)).toThrow(FrameTokenError)
  })

  test('garbage, empty and missing inputs yield no session', () => {
    for (const bearer of ['', 'abc', 'a.b', 'a.b.c', undefined]) {
      expect(sessionFromFrameToken(bearer, 'spindle', secret, now)).toBeNull()
    }
    expect(sessionFromFrameToken(mint(), undefined, secret, now)).toBeNull()
    expect(sessionFromFrameToken(mint(), 'spindle', undefined, now)).toBeNull()
  })
})

describe('a token never exceeds the user it was minted for', () => {
  test('the session built from a token has exactly the minted scopes', () => {
    expect(sessionFromFrameToken(mint({ scopes: ['spindle:library:read'] }), 'spindle', secret, now)).toEqual({
      userId: 'user-1',
      scopes: ['spindle:library:read'],
    })
  })

  test('the scopes come from the session, never from the request', () => {
    expect(scopesFor({ scopes: ['a:read'] })).toEqual(['a:read'])
    expect(scopesFor({ scopes: [] })).toEqual(['*'])
    expect(scopesFor({})).toEqual(['*'])
  })
})

describe('the frame never gets the master token', () => {
  test('the open and mint outputs have no room for it', () => {
    expect(Object.keys(OpenAddonsOutput.shape)).toEqual(['appUrl'])
    expect(Object.keys(MintAddonTokenOutput.shape).sort()).toEqual(['expiresAt', 'token'])
  })

  test('a minted token contains neither the master token nor the shared secret', () => {
    const master = 'master-studio-token-value'
    process.env.PIKKU_STUDIO_TOKEN = master
    const { token } = mintFrameToken({ secret, userId: 'user-1', scopes: ['*'], addon: 'spindle', now })
    const decoded = Buffer.from(token.split('.')[1]!, 'base64url').toString()
    expect(token).not.toContain(master)
    expect(decoded).not.toContain(master)
    expect(decoded).not.toContain(secret)
    delete process.env.PIKKU_STUDIO_TOKEN
  })

  test('the master token does not open a session', () => {
    expect(sessionFromFrameToken('master-studio-token-value', 'spindle', secret, now)).toBeNull()
  })
})

describe('the shared secret', () => {
  test('is created once, private to the owner, and reused', () => {
    const home = join(mkdtempSync(join(tmpdir(), 'studio-')), 'home')
    const first = frameSecret(home)
    expect(first.length).toBeGreaterThan(30)
    expect(frameSecret(home)).toBe(first)
    const file = join(home, 'env', 'addons.env')
    expect(statSync(file).mode & 0o777).toBe(0o600)
    expect(readFileSync(file, 'utf8')).toContain(`ADDONS_FRAME_SECRET=${first}`)
  })
})
