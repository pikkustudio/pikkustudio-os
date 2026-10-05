import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categoriseFrames, parseJsonAnswer, sourceTextOf, summariseAsset, type Model } from './describe.js'
import { registerAsset } from './library.js'
import { memoryDb } from './sqlite-test-db.js'

const content = { readFileAsBuffer: async () => Buffer.from('img'), copyFile: async () => undefined }

const seed = async (db: ReturnType<typeof memoryDb>, assetId: string, step: string, result: unknown) =>
  db.insertInto('spindle_extraction').values({ extraction_id: crypto.randomUUID(), asset_id: assetId, step, status: 'done', result: JSON.stringify(result) } as never).execute()

test('JSON is found inside fences and prose', () => {
  assert.deepEqual(parseJsonAnswer('Sure!\n```json\n{"a":1}\n```'), { a: 1 })
  assert.throws(() => parseJsonAnswer('no json here'), /did not answer with JSON/)
})

test('the model reads pages, transcript and what is seen, in that order', () => {
  const text = sourceTextOf([
    { step: 'extract', status: 'done', result: { pages: [{ page: 1, text: 'Glazes.' }] } },
    { step: 'transcribe', status: 'done', result: { segments: [{ text: 'hello' }] } },
    { step: 'categorise', status: 'done', result: { frames: [{ description: '00:05 Slide: kiln' }] } },
  ])
  assert.match(text, /\[page 1\]\nGlazes\.[\s\S]*\[transcript\]\nhello[\s\S]*\[what is seen\]\n- 00:05 Slide: kiln/)
})

test('a summary tidies tags, keeps whisper\'s language and replaces only a file-name title', async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'k', fileName: 'kiln_notes.pdf', mimeType: 'application/pdf', sizeBytes: 1 })
  await seed(db, a.asset_id, 'extract', { pages: [{ page: 1, text: 'Kilns.' }] })
  const model: Model = { name: 'fake', json: async () => ({ title: 'Firing Kilns', language: 'EN', summary: ' About   kilns. ', keyPoints: ['a  b'], tags: ['#Kiln', 'kiln', 'Clay'] }) }
  const r = await summariseAsset(db, model, a.asset_id)
  assert.deepEqual(r.tags, ['kiln', 'clay'])
  assert.equal(r.summary, 'About kilns.')
  assert.equal((await db.selectFrom('spindle_asset').select('title').executeTakeFirstOrThrow()).title, 'Firing Kilns')
})

test('nothing extracted means nothing to summarise, and the step fails', async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'k', fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 1 })
  await assert.rejects(summariseAsset(db, { name: 'f', json: async () => ({}) }, a.asset_id), /Nothing was extracted/)
})

test('frames are labelled in batches, categories merge by spelling, and a miscount is asked again one at a time', async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'k/v.mp4', fileName: 'v.mp4', mimeType: 'video/mp4', sizeBytes: 1 })
  await seed(db, a.asset_id, 'keyframes', { frames: [1, 2, 3].map((n) => ({ n, atSeconds: n * 10, key: `f${n}` })) })
  let calls = 0
  const model: Model = {
    name: 'vision',
    json: async (_s, _u, images) => {
      calls++
      if (calls === 1) return { frames: [{ n: 1, category: 'Slide', caption: 'one' }] }
      return { frames: [{ n: 1, category: calls === 3 ? 'slide' : 'Slide', caption: `c${calls}` }].slice(0, images!.length) }
    },
  }
  const r = await categoriseFrames(db, model, content, a.asset_id)
  assert.equal(calls, 4)
  assert.deepEqual(r.categories, [{ name: 'Slide', count: 3 }])
  assert.match(r.frames[1]!.description, /^00:20 Slide: /)
})
