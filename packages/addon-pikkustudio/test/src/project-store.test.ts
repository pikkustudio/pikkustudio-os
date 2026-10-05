import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createSqliteKysely } from '../../../../node_modules/@pikku/cli/dist/src/functions/db/sqlite/sqlite-kysely.js'
import { kyselyProjectStore } from '../../src/services/project-store.js'
import { withSlugs } from '../../src/services/projects.js'

const open = () => {
  const database = new DatabaseSync(':memory:')
  for (const file of ['0008-studio-project.sql', '0009-studio-project-owner.sql'])
    database.exec(readFileSync(new URL(`../../../../db/sqlite/${file}`, import.meta.url), 'utf8'))
  return createSqliteKysely<any>({ db: database as never, camelCase: true })
}

const entry = (id: string, slug: string, owner = 'maya') => ({ id, path: `/x/${slug}`, addedAt: `2026-01-0${id.length}`, slug, owner, name: slug })

test('imports the old registry once, then round-trips', async () => {
  const store = kyselyProjectStore(open(), { load: async () => [{ id: 'a', path: '/x/bakery', addedAt: '2026-01-01' }], save: async () => {} })
  assert.deepStrictEqual((await store.load()).map((e) => [e.id, e.slug, e.owner]), [['a', undefined, undefined]])
  await store.save([entry('a', 'bakery'), entry('bb', 'kiln')])
  assert.deepStrictEqual((await store.load()).map((e) => `${e.owner}/${e.slug}`), ['maya/bakery', 'maya/kiln'])
  await store.save([])
  assert.deepStrictEqual(await store.load(), [])
})

test('a slug is unique per owner, not globally', async () => {
  const store = kyselyProjectStore(open())
  await store.save([entry('a', 'ac', 'maya'), entry('bb', 'ac', 'sam')])
  assert.deepStrictEqual((await store.load()).map((e) => `${e.owner}/${e.slug}`), ['maya/ac', 'sam/ac'])
  await assert.rejects(store.save([entry('a', 'ac', 'maya'), entry('bb', 'ac', 'maya')]))
})

test('withSlugs gives each owner its own namespace and keeps existing slugs', async () => {
  const done = await withSlugs([{ id: 'a', path: '/x/ac', addedAt: 'x', slug: 'ac', owner: 'maya' }, { id: 'b', path: '/y/ac', addedAt: 'x' }, { id: 'c', path: '/z/ac', addedAt: 'x', owner: 'sam' }], 'maya')
  assert.deepStrictEqual(done.map((e) => `${e.owner}/${e.slug}`), ['maya/ac', 'maya/ac-2', 'sam/ac'])
})
