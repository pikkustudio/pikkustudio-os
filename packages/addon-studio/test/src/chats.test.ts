import assert from 'node:assert'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { archiveChat, listChats } from '../../src/services/chats.js'

test('saved chats are listed per specialist, and chats saved before the split belong to build', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'chats-'))
  const said = (text: string) => [{ kind: 'user', text, at: 1 }]
  await archiveChat(dir, 'a', said('Reword the welcome'), 'emails')
  await archiveChat(dir, 'b', said('Add checkout'))
  assert.deepStrictEqual((await listChats(dir, 'emails')).map((c) => c.id), ['a'])
  assert.deepStrictEqual((await listChats(dir)).map((c) => c.id), ['b'])
  assert.deepStrictEqual(await listChats(dir, 'knowledge'), [])
})
