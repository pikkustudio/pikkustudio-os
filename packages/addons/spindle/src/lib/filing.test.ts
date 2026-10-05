import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Model } from './describe.js'
import { askLibrary, asSentence, groupUnplaced, kbCode, placeByModel, tidyName } from './filing.js'
import { createKnowledgeBase, placeAsset, registerAsset } from './library.js'
import { openProposals } from './proposals.js'
import { indexAsset, type Embedder } from './search.js'
import { memoryDb } from './sqlite-test-db.js'

const embedder: Embedder = { model: 'f', passages: async (t) => t.map(() => Float32Array.of(1)), query: async () => Float32Array.of(1) }
const fake = (answer: (user: string) => unknown): Model => ({ name: 'fake', json: async (_s, u) => answer(u) })
const seed = (db: ReturnType<typeof memoryDb>, assetId: string, step: string, result: unknown) =>
  db.insertInto('spindle_extraction').values({ extraction_id: crypto.randomUUID(), asset_id: assetId, step, status: 'done', result: JSON.stringify(result) } as never).execute()

const summarised = async (db: ReturnType<typeof memoryDb>, name: string, text: string) => {
  const a = await registerAsset(db, { contentKey: name, fileName: `${name}.pdf`, mimeType: 'application/pdf', sizeBytes: 1 })
  await seed(db, a.asset_id, 'summarise', { summary: text, keyPoints: [], tags: [] })
  await seed(db, a.asset_id, 'extract', { pages: [{ page: 1, text }] })
  await db.updateTable('spindle_asset').set({ status: 'extracted' } as never).where('asset_id', '=', a.asset_id).execute()
  return a
}

test('small helpers: code, sentence, shelf label', () => {
  assert.equal(kbCode('Ceramic glazes'), 'CER')
  assert.equal(asSentence(' fits well  '), 'Fits well.')
  assert.equal(tidyName('Clay Body TESTING UMF'), 'Clay body TESTING UMF')
})

test('placement keeps confident fits, drops weak ones and never touches the owner\'s decision', async () => {
  const db = memoryDb()
  const a = await summarised(db, 'a', 'About glazes')
  const glazes = await createKnowledgeBase(db, { name: 'Glazes', description: 'surfaces' })
  const clay = await createKnowledgeBase(db, { name: 'Clay', description: 'bodies' })
  const kilns = await createKnowledgeBase(db, { name: 'Kilns', description: 'firing' })
  await placeAsset(db, { kbId: kilns.kb_id, assetId: a.asset_id, source: 'member', state: 'removed' })
  const model = fake((u) => ({ fits: [{ n: 1, confidence: 0.9, reason: 'about glaze' }, { n: 2, confidence: 0.3, reason: 'meh' }] }))
  const r = await placeByModel(db, model, a.asset_id)
  assert.deepEqual(r.placements.map((p) => p.name), ['Clay'])
  const rows = await db.selectFrom('spindle_placement').select(['kb_id', 'source', 'state']).where('asset_id', '=', a.asset_id).execute()
  assert.equal(rows.filter((x) => x.source === 'workflow').length, 1)
  assert.equal(rows.find((x) => x.kb_id === kilns.kb_id)!.state, 'removed')
  assert.ok(glazes.kb_id)
})

test('grouping proposes shelves for what fits nowhere, once, and never what was dismissed', async () => {
  const db = memoryDb()
  const a = await summarised(db, 'a', 'Celadon glaze recipes')
  const b = await summarised(db, 'b', 'Copper red glaze recipes')
  await summarised(db, 'c', 'Tax return')
  const model = fake(() => ({ groups: [{ name: 'Glaze Recipes', description: 'recipes', reason: 'both are glazes', members: [{ n: 1, fit: 0.9, note: 'celadon' }, { n: 2, fit: 0.8, note: 'copper' }, { n: 9, fit: 1, note: 'ghost' }] }] }))
  assert.deepEqual(await groupUnplaced(db, model), { considered: 3, proposed: 1 })
  const [p] = await openProposals(db)
  assert.equal(p!.name, 'Glaze recipes')
  assert.deepEqual(p!.assets.map((x: { asset_id?: string; assetId?: string }) => x.asset_id ?? x.assetId).sort(), [a.asset_id, b.asset_id].sort())
  assert.deepEqual(await groupUnplaced(db, model), { considered: 1, proposed: 0 })
})

test('an answer cites the passages it used, drops markers that name nothing, and admits what it cannot answer', async () => {
  const db = memoryDb()
  const a = await summarised(db, 'a', 'Celadon glazes need reduction firing')
  await indexAsset(db, embedder, a.asset_id)
  const ok = await askLibrary(db, embedder, fake(() => ({ answer: 'Use reduction [1][7].', unanswerable: false, used: [] })), { question: 'celadon' })
  assert.equal(ok.unanswerable, false)
  assert.equal(ok.answer, 'Use reduction [1].')
  assert.equal(ok.citations[0]!.title, 'a')
  const no = await askLibrary(db, embedder, fake(() => ({ answer: 'Not here [1]', unanswerable: true, used: [] })), { question: 'celadon' })
  assert.deepEqual([no.unanswerable, no.answer], [true, 'Not here'])
  const none = await askLibrary(memoryDb(), embedder, fake(() => ({})), { question: 'celadon' })
  assert.equal(none.unanswerable, true)
})
