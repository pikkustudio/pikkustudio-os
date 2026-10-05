import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createKnowledgeBase, placeAsset, registerAsset } from './library.js'
import { cutPage, indexAsset, keywordQuery, passagesOf, searchPassages, type Embedder } from './search.js'
import { memoryDb } from './sqlite-test-db.js'

const CONCEPTS: Record<string, number> = { glaze: 0, glazes: 0, enamel: 0, coating: 0, kiln: 1, oven: 1, fire: 1, clay: 2 }

const embed = (text: string) => {
  const v = new Float32Array(3)
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) if (w in CONCEPTS) v[CONCEPTS[w]!] += 1
  const norm = Math.hypot(...v) || 1
  return v.map((x) => x / norm)
}

const embedder: Embedder = {
  model: 'fake',
  passages: async (texts) => texts.map(embed),
  query: async (text) => embed(text),
}

const extract = (db: Awaited<ReturnType<typeof memoryDb>>, assetId: string, step: string, result: unknown) =>
  db
    .insertInto('spindle_extraction')
    .values({ extraction_id: crypto.randomUUID(), asset_id: assetId, step, status: 'done', result: JSON.stringify(result) } as never)
    .execute()

const library = async () => {
  const db = memoryDb()
  const pdf = await registerAsset(db, { contentKey: 'k', fileName: 'glazes.pdf', mimeType: 'application/pdf', sizeBytes: 1 })
  const talk = await registerAsset(db, { contentKey: 'k', fileName: 'kilns.mp3', mimeType: 'audio/mpeg', sizeBytes: 1 })
  await extract(db, pdf.asset_id, 'extract', { pages: [{ page: 3, text: 'Glazes are a glassy coating on pottery.' }] })
  await extract(db, talk.asset_id, 'transcribe', {
    segments: [{ start: 0, end: 10, text: 'The oven must reach cone six before we fire.' }],
  })
  await indexAsset(db, embedder, pdf.asset_id)
  await indexAsset(db, embedder, talk.asset_id)
  return { db, pdf, talk }
}

test('a page becomes passages that remember their page; speech remembers its seconds', () => {
  const drafts = passagesOf([
    { step: 'extract', status: 'done', result: { pages: [{ page: 2, text: 'one two' }] } },
    { step: 'transcribe', status: 'done', result: { segments: [{ start: 5, end: 9, text: 'hello' }] } },
  ])
  assert.deepEqual(drafts.map((d) => [d.source, d.page, d.startSeconds]), [['page', 2, null], ['speech', null, 5]])
})

test('a failed step contributes no passages', () => {
  assert.deepEqual(passagesOf([{ step: 'extract', status: 'failed', result: { pages: [{ page: 1, text: 'x' }] } }]), [])
})

test('a long page is cut with an overlap and nothing is lost', () => {
  const text = Array.from({ length: 80 }, (_, i) => `Sentence number ${i}.`).join(' ')
  const pieces = cutPage(text)
  assert.ok(pieces.length > 1)
  assert.ok(pieces.every((p) => p.length <= 800))
  assert.ok(pieces[0]!.includes('Sentence number 0.') && pieces.at(-1)!.includes('Sentence number 79.'))
})

test('the keyword query keeps words only, so a searcher can never inject an operator', () => {
  assert.equal(keywordQuery('the glaze" OR NEAR(a b) *'), '"glaze" OR "or" OR "near"'.replace(' OR "or"', ''))
  assert.equal(keywordQuery('what is the'), null)
  assert.match(keywordQuery('clay glazes')!, /^"clay" OR "glazes"$/)
})

test('searching by exact words finds the page and says where it came from', async () => {
  const { db } = await library()
  const [hit] = await searchPassages(db, embedder, { query: 'glassy', limit: 5 })
  assert.equal(hit!.matchedBy, 'words')
  assert.equal(hit!.page, 3)
})

test('searching by meaning finds a passage that shares no word with the question', async () => {
  const { db, talk } = await library()
  const hits = await searchPassages(db, embedder, { query: 'kiln', limit: 5 })
  assert.equal(hits[0]!.assetId, talk.asset_id)
  assert.equal(hits[0]!.matchedBy, 'meaning')
  assert.equal(hits[0]!.startSeconds, 0)
})

test('a passage that matches on both sides is marked both and ranks first', async () => {
  const { db, pdf } = await library()
  const hits = await searchPassages(db, embedder, { query: 'glazes coating', limit: 5 })
  assert.equal(hits[0]!.assetId, pdf.asset_id)
  assert.equal(hits[0]!.matchedBy, 'both')
})

test('stemming: "glaze" finds "Glazes"', async () => {
  const { db } = await library()
  const hits = await searchPassages(db, embedder, { query: 'glaze', limit: 5 })
  assert.ok(hits.some((h) => h.text.startsWith('Glazes')))
})

test('a search scoped to a knowledge base sees only what it holds', async () => {
  const { db, pdf, talk } = await library()
  const kb = await createKnowledgeBase(db, { name: 'Kilns', description: '' })
  await placeAsset(db, { kbId: kb.kb_id, assetId: talk.asset_id, source: 'member' })
  const hits = await searchPassages(db, embedder, { kbId: kb.kb_id, query: 'glazes kiln', limit: 10 })
  assert.deepEqual([...new Set(hits.map((h) => h.assetId))], [talk.asset_id])
  assert.ok(!hits.some((h) => h.assetId === pdf.asset_id))
})

test('re-indexing replaces an asset\'s passages instead of duplicating them', async () => {
  const { db, pdf } = await library()
  await indexAsset(db, embedder, pdf.asset_id)
  const rows = await db.selectFrom('spindle_passage').select('passage_id').where('asset_id', '=', pdf.asset_id).execute()
  assert.equal(rows.length, 1)
  const hits = await searchPassages(db, embedder, { query: 'glassy', limit: 5 })
  assert.equal(hits.length, 1)
})

test('passages indexed under another model are not compared with this model\'s vectors', async () => {
  const { db } = await library()
  const hits = await searchPassages(db, { ...embedder, model: 'other' }, { query: 'kiln', limit: 5 })
  assert.equal(hits.length, 0)
})
