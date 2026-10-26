import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, test } from 'node:test'
import { createSqliteKysely } from '../../../../node_modules/@pikku/cli/dist/src/functions/db/sqlite/sqlite-kysely.js'
import { asUser, currentUserId } from '../../src/services/current-user.js'
import { kyselyProfile, UNNAMED_OWNER } from '../../src/services/profile.js'

const open = () => {
  const database = new DatabaseSync(':memory:')
  for (const file of ['0001-better-auth.sql', '0019-setting.sql']) database.exec(readFileSync(new URL(`../../../../db/sqlite/${file}`, import.meta.url), 'utf8'))
  const now = new Date().toISOString()
  const add = (id: string, name: string, at: string) =>
    database.exec(`insert into "user" (id, name, email, email_verified, created_at, updated_at) values ('${id}', '${name}', '${id}@x.test', 1, '${at}', '${now}')`)
  add('u1', UNNAMED_OWNER, '2026-01-01')
  add('u2', 'Grace', '2026-01-02')
  return createSqliteKysely<any>({ db: database as never, camelCase: true })
}

describe('profile', () => {
  test('the name is the user name, and the placeholder reads as no name yet', async () => {
    const db = open()
    const profile = kyselyProfile(db)
    assert.deepEqual(await profile.read('u1'), { name: null, about: null })
    await profile.write('u1', { name: 'Ada', about: 'Bakes bread' })
    assert.deepEqual(await profile.read('u1'), { name: 'Ada', about: 'Bakes bread' })
    assert.equal((await db.selectFrom('user').select('name').where('id', '=', 'u1').executeTakeFirstOrThrow()).name, 'Ada')
    assert.equal((await db.selectFrom('setting').select('key').execute()).some((row) => row.key === 'settings'), false)
  })

  test('about is per user: two users do not share it', async () => {
    const profile = kyselyProfile(open())
    await profile.write('u1', { name: 'Ada', about: 'Bakes bread' })
    assert.deepEqual(await profile.read('u2'), { name: 'Grace', about: null })
    await profile.write('u2', { about: 'Writes compilers' })
    assert.equal((await profile.read('u1')).about, 'Bakes bread')
    assert.equal((await profile.read('u2')).about, 'Writes compilers')
    await profile.write('u1', { about: null })
    assert.equal((await profile.read('u1')).about, null)
    assert.equal((await profile.read('u2')).about, 'Writes compilers')
  })

  test('the owner is the first user', async () => {
    const profile = kyselyProfile(open())
    await profile.write('u1', { name: 'Ada' })
    assert.equal((await profile.owner()).name, 'Ada')
  })

  test('a request names its user; outside one it is the owner', async () => {
    const db = open()
    assert.equal(await currentUserId(db), 'u1')
    assert.equal(await asUser(async () => 'u2', () => currentUserId(db)), 'u2')
    assert.equal(await asUser(async () => undefined, () => currentUserId(db)), 'u1')
  })
})
