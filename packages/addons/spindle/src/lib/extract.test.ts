import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { extractAsset, minGapFor, pagesFromPdftotext, parseProbe, parseWhisper, pickMoments, readableFailure, reflow, type ExtractDeps } from './extract.js'
import { registerAsset } from './library.js'
import { searchPassages, type Embedder } from './search.js'
import { memoryDb } from './sqlite-test-db.js'
import { studioRunner, toolStatus, type ToolResolver } from './tools.js'

test('reflow joins wrapped lines, mends hyphen splits and keeps paragraphs', () => {
  assert.equal(reflow('A glaze is a coat-\ning on clay\nfired in a kiln.\n\nSecond para.'), 'A glaze is a coating on clay fired in a kiln.\n\nSecond para.')
})

test('pdftotext form feeds become numbered pages, and the empty tail is dropped', () => {
  assert.deepEqual(pagesFromPdftotext('one\fTwo\f').map((p) => [p.page, p.text]), [[1, 'one'], [2, 'Two']])
})

test('cover art in an mp3 is not footage', () => {
  const p = parseProbe(JSON.stringify({ format: { duration: '61.5' }, streams: [{ codec_type: 'audio' }, { codec_type: 'video', disposition: { attached_pic: 1 } }] }))
  assert.deepEqual([p.durationSeconds, p.hasAudio, p.hasVideo], [61.5, true, false])
})

test('whisper noise markers are dropped and silence is an error', () => {
  const ok = parseWhisper(JSON.stringify({ result: { language: 'DE' }, transcription: [{ offsets: { from: 0, to: 2000 }, text: ' Hallo ' }, { offsets: { from: 2000, to: 3000 }, text: '[MUSIC]' }] }), '/m/ggml-large-v3-turbo.bin')
  assert.deepEqual([ok.language, ok.model, ok.segments.length], ['de', 'large-v3-turbo', 1])
  assert.throws(() => parseWhisper(JSON.stringify({ transcription: [] }), 'm'), /No speech/)
})

test('keyframes: early frame, gap respected, padded when sparse, thinned when many', () => {
  assert.deepEqual(pickMoments(40, [0.6, 5, 5.5, 20]), [0.5, 5, 20])
  assert.equal(minGapFor(7200), 180)
  assert.equal(pickMoments(600, []).length, 3)
  assert.ok(pickMoments(100000, Array.from({ length: 500 }, (_, i) => i * 300)).length <= 48)
})

test('failures read as advice, with a missing tool named', () => {
  assert.match(readableFailure('transcribe', 'whisper-cli is not installed on this worker'), /whisper-cli is not installed/)
  assert.match(readableFailure('extract', 'pdftotext exited with 1: Command Line Error: Incorrect password'), /password protected/)
})

const embedder: Embedder = {
  model: 'fake',
  passages: async (t) => t.map(() => Float32Array.of(1, 0)),
  query: async () => Float32Array.of(1, 0),
}

const deps = (tools: Record<string, string>): ExtractDeps => ({
  embedder,
  whisperModel: '/m/ggml-tiny.bin',
  content: { readFileAsBuffer: async () => Buffer.from('x'), copyFile: async () => undefined },
  run: async (command, args) => {
    if (!(command in tools)) throw new Error(`${command} is not installed on this worker`)
    if (command === 'whisper-cli') await writeFile(`${args[args.indexOf('-of') + 1]}.json`, tools[command]!)
    return { stdout: Buffer.from(tools[command]!), stderr: '' }
  },
})

test('a document is read, settled and findable by its words', async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'k/a.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 1 })
  await extractAsset(db, deps({ pdftotext: 'Celadon glazes need reduction firing in the kiln today.' }), a.asset_id)
  const row = await db.selectFrom('spindle_asset').select('status').where('asset_id', '=', a.asset_id).executeTakeFirstOrThrow()
  assert.equal(row.status, 'extracted')
  assert.equal((await searchPassages(db, embedder, { query: 'celadon', limit: 3 })).length, 1)
})

test('a recording is probed then transcribed', async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'k/a.mp3', fileName: 'a.mp3', mimeType: 'audio/mpeg', sizeBytes: 1 })
  await extractAsset(db, deps({
    ffprobe: JSON.stringify({ format: { duration: '3' }, streams: [{ codec_type: 'audio' }] }),
    ffmpeg: '',
    'whisper-cli': JSON.stringify({ result: { language: 'en' }, transcription: [{ offsets: { from: 0, to: 3000 }, text: 'Fire the kiln slowly.' }] }),
  }), a.asset_id)
  const steps = await db.selectFrom('spindle_extraction').select(['step', 'status']).where('asset_id', '=', a.asset_id).execute()
  assert.deepEqual(steps.map((s) => `${s.step}:${s.status}`).sort(), ['probe:done', 'transcribe:done'])
})

test('a missing tool fails the step with advice and marks the asset failed', async () => {
  const db = memoryDb()
  const a = await registerAsset(db, { contentKey: 'k/a.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 1 })
  await assert.rejects(extractAsset(db, deps({}), a.asset_id), /pdftotext is not installed/)
  const e = await db.selectFrom('spindle_extraction').select(['status', 'error']).where('asset_id', '=', a.asset_id).executeTakeFirstOrThrow()
  assert.equal(e.status, 'failed')
  assert.match(e.error!, /Install it, then retry/)
  assert.equal((await db.selectFrom('spindle_asset').select('status').executeTakeFirstOrThrow()).status, 'failed')
})

const resolver = (have: string[]): ToolResolver => ({
  resolve: async ({ tool }) => (have.includes(tool) ? { status: 'found', path: `/opt/bin/${tool}`, bins: [`/opt/bin/${tool}`] } : { status: 'needs', get: { brew: `brew install ${tool}` } }),
})

test('a tool Studio does not have fails with its install hint', async () => {
  await assert.rejects(studioRunner(resolver([]))('pdftotext', []), /pdftotext is not installed on this worker \(brew install pdftotext\)/)
})

test('the tool report names what is missing, with how to get it', async () => {
  const s = await toolStatus(resolver(['ffmpeg']))
  assert.deepEqual(s.map((t) => `${t.tool}:${t.status}`), ['ffmpeg:ready', 'whisper-cli:missing', 'pdftotext:missing'])
  assert.deepEqual(s[1]!.get, { brew: 'brew install whisper-cli' })
})
