import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createKnowledgeBase, deleteKnowledgeBase, listAssets, listKnowledgeBases, placeAsset, registerAsset } from './library.js'
import { memoryDb } from './sqlite-test-db.js'

const pdf = { contentKey: 'k', fileName: 'Glazes.pdf', mimeType: 'application/pdf', sizeBytes: 10 }

test('every table the migration creates carries the extension prefix', () => {
  const sql = readdirSync(new URL('../../db/sqlite/', import.meta.url))
    .map((file) => readFileSync(new URL(`../../db/sqlite/${file}`, import.meta.url), 'utf8'))
    .join('\n')
  const tables = [...sql.matchAll(/create table "([^"]+)"/g)].map((m) => m[1]!)
  assert.ok(tables.length > 0)
  assert.deepEqual(tables.filter((t) => !t.startsWith('spindle_')), [])
})

test('registered assets get consecutive catalogue numbers and a kind from the file', async () => {
  const db = memoryDb()
  const a = await registerAsset(db, pdf)
  const b = await registerAsset(db, { ...pdf, fileName: 'talk.mp3', mimeType: 'audio/mpeg' })
  assert.deepEqual([a.catalogue_number, b.catalogue_number], [1, 2])
  assert.equal(a.kind, 'document')
  assert.equal(a.status, 'extracting')
  const { assets, kindCounts } = await listAssets(db)
  assert.deepEqual(assets.map((x) => x.catalogue_number), [2, 1])
  assert.deepEqual(kindCounts, { document: 1, audio: 1 })
})

test('an unsupported file is refused', async () => {
  await assert.rejects(registerAsset(memoryDb(), { ...pdf, fileName: 'a.exe', mimeType: '' }), /Unsupported/)
})

test('a placed asset leaves the unplaced list, and a removed one comes back', async () => {
  const db = memoryDb()
  const asset = await registerAsset(db, pdf)
  const kb = await createKnowledgeBase(db, { name: 'Glazing', description: 'glaze notes' })
  assert.equal((await listAssets(db, { unplaced: true })).assets.length, 1)
  await placeAsset(db, { kbId: kb.kb_id, assetId: asset.asset_id, source: 'workflow', confidence: 0.9 })
  assert.equal((await listAssets(db, { unplaced: true })).assets.length, 0)
  assert.equal((await listKnowledgeBases(db))[0]!.assetCount, 1)
  await placeAsset(db, { kbId: kb.kb_id, assetId: asset.asset_id, source: 'member', state: 'removed' })
  assert.equal((await listAssets(db, { unplaced: true })).assets.length, 1)
})

test('a member decision survives a workflow re-run', async () => {
  const db = memoryDb()
  const asset = await registerAsset(db, pdf)
  const kb = await createKnowledgeBase(db, { name: 'Glazing', description: '' })
  await placeAsset(db, { kbId: kb.kb_id, assetId: asset.asset_id, source: 'member', state: 'removed' })
  assert.equal(await placeAsset(db, { kbId: kb.kb_id, assetId: asset.asset_id, source: 'workflow' }), false)
  assert.equal((await listKnowledgeBases(db))[0]!.assetCount, 0)
})

test('deleting a knowledge base keeps its assets', async () => {
  const db = memoryDb()
  const asset = await registerAsset(db, pdf)
  const kb = await createKnowledgeBase(db, { name: 'Glazing', description: '' })
  await placeAsset(db, { kbId: kb.kb_id, assetId: asset.asset_id, source: 'workflow' })
  await deleteKnowledgeBase(db, kb.kb_id)
  assert.equal((await listAssets(db)).assets.length, 1)
  assert.equal((await listKnowledgeBases(db)).length, 0)
})

test('knowledge base names are unique and required', async () => {
  const db = memoryDb()
  await createKnowledgeBase(db, { name: 'A', description: '' })
  await assert.rejects(createKnowledgeBase(db, { name: 'A', description: '' }))
  await assert.rejects(createKnowledgeBase(db, { name: '  ', description: '' }), /needs a name/)
})
