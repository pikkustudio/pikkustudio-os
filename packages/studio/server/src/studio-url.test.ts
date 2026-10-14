import { test } from 'node:test'
import assert from 'node:assert/strict'
import { studioUrl } from './studio-url.js'

test('production and staging APIs map to their studio host', () => {
  assert.equal(studioUrl('https://api.pikkustudio.app', ''), 'https://cloud.pikkustudio.app')
  assert.equal(studioUrl('https://api.pikkufabric.cloud/', ''), 'https://studio.pikkufabric.cloud')
})

test('a self-hosted api.<domain> maps to studio.<domain>', () => assert.equal(studioUrl('https://api.acme.example', ''), 'https://studio.acme.example'))

test('localhost points at the local app port', () => assert.equal(studioUrl('http://localhost:4740', ''), 'http://localhost:4741'))

test('STUDIO_URL wins and loses its trailing slash', () => assert.equal(studioUrl('https://api.pikkustudio.app', 'https://s.example/'), 'https://s.example'))
