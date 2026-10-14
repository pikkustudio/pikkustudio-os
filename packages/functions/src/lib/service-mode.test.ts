import { afterEach, describe, expect, test } from 'bun:test'
import { isLocalRequest } from './local-sign-in.js'
import { serviceModeOn } from './service-mode.js'
import { isServiceToken } from './sleep.js'

const token = process.env.PIKKU_STUDIO_SERVICE_TOKEN

afterEach(() => {
  if (token === undefined) delete process.env.PIKKU_STUDIO_SERVICE_TOKEN
  else process.env.PIKKU_STUDIO_SERVICE_TOKEN = token
})

describe('service mode', () => {
  test('is off without a token, and this computer may sign in', () => {
    delete process.env.PIKKU_STUDIO_SERVICE_TOKEN
    expect(serviceModeOn()).toBe(false)
    expect(isLocalRequest(new Headers({ host: 'localhost:4791' }))).toBe(true)
  })

  test('with a token, this computer is not trusted any more', () => {
    process.env.PIKKU_STUDIO_SERVICE_TOKEN = 'secret'
    expect(serviceModeOn()).toBe(true)
    expect(isLocalRequest(new Headers({ host: 'localhost:4791' }))).toBe(false)
  })

  test('accepts only the exact bearer token', () => {
    process.env.PIKKU_STUDIO_SERVICE_TOKEN = 'secret'
    expect(isServiceToken('Bearer secret')).toBe(true)
    expect(isServiceToken('Bearer wrong')).toBe(false)
    expect(isServiceToken('secret')).toBe(false)
    expect(isServiceToken(undefined)).toBe(false)
  })
})
