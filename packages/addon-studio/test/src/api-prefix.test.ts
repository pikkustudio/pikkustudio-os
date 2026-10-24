import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apiPrefixOf, withApiPrefix } from '../../src/lib/api-prefix.js'

const projectWith = (config: object | null) => {
  const dir = mkdtempSync(join(tmpdir(), 'api-prefix-'))
  if (config) writeFileSync(join(dir, 'pikku.config.json'), JSON.stringify(config))
  return dir
}

test('a project with globalHTTPPrefix has its rpc calls sent under the prefix', () => {
  const prefix = apiPrefixOf(projectWith({ globalHTTPPrefix: '/api' }))
  assert.equal(withApiPrefix('/rpc/console:getAllMeta', prefix), '/api/rpc/console:getAllMeta')
})

test('preview and app routes are not prefixed', () => {
  const prefix = apiPrefixOf(projectWith({ globalHTTPPrefix: '/api' }))
  assert.equal(withApiPrefix('/app', prefix), '/app')
  assert.equal(withApiPrefix('/', prefix), '/')
})

test('a project without a prefix is unchanged', () => {
  assert.equal(apiPrefixOf(projectWith({})), '')
  assert.equal(apiPrefixOf(projectWith(null)), '')
  assert.equal(withApiPrefix('/rpc/x', ''), '/rpc/x')
})

test('a prefix is normalised', () => {
  assert.equal(apiPrefixOf(projectWith({ globalHTTPPrefix: 'api/' })), '/api')
})
