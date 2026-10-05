import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extractAsset, runTool, type ExtractDeps } from './extract.js'
import { registerAsset } from './library.js'
import { searchPassages, type Embedder } from './search.js'
import { memoryDb } from './sqlite-test-db.js'

const FIXTURES = process.env.SPINDLE_FIXTURES
const MODEL = process.env.WHISPER_MODEL
const embedder: Embedder = { model: 'fake', passages: async (t) => t.map(() => Float32Array.of(1)), query: async () => Float32Array.of(1) }
const store = (files: Record<string, string>): ExtractDeps['content'] => ({
  readFileAsBuffer: async ({ key }) => readFile(files[key]!),
  copyFile: async ({ key, fromAbsolutePath }) => copyFile(fromAbsolutePath, `/tmp/sp/out-${key.split('/').pop()}`),
})

test('real pdftotext reads a real PDF', { skip: !FIXTURES }, async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'a.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 1 })
  await extractAsset(db, { content: store({ 'a.pdf': `${FIXTURES}/a.pdf` }), run: runTool, embedder, whisperModel: '' }, a.asset_id)
  assert.equal((await searchPassages(db, embedder, { query: 'celadon', limit: 3 })).length, 1)
})

test('real ffprobe, ffmpeg and whisper-cli hear a real recording', { skip: !FIXTURES || !MODEL }, async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'jfk.wav', fileName: 'jfk.wav', mimeType: 'audio/wav', sizeBytes: 1 })
  await extractAsset(db, { content: store({ 'jfk.wav': `${FIXTURES}/jfk.wav` }), run: runTool, embedder, whisperModel: MODEL! }, a.asset_id)
  const hits = await searchPassages(db, embedder, { query: 'country', limit: 3 })
  assert.ok(hits.length > 0 && hits[0]!.source === 'speech', JSON.stringify(hits))
})

test('real ffmpeg takes keyframes from a real video', { skip: !FIXTURES || !existsSync(`${FIXTURES}/v.mp4`) }, async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'v.mp4', fileName: 'v.mp4', mimeType: 'video/mp4', sizeBytes: 1 })
  await extractAsset(db, { content: store({ 'v.mp4': `${FIXTURES}/v.mp4` }), run: runTool, embedder, whisperModel: '' }, a.asset_id)
  const row = await db.selectFrom('spindle_extraction').select(['status', 'result']).where('step', '=', 'keyframes').executeTakeFirstOrThrow()
  assert.equal(row.status, 'done')
  assert.ok(JSON.parse(row.result!).frames.length >= 3)
})
