import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import type { Kysely } from 'kysely'
import { LIBRARY_BUCKET, derivedKey, safeKeySegment } from './asset-kind.js'
import type { SpindleDb } from './library.js'
import { indexAsset, type Embedder } from './search.js'

type Db = Kysely<SpindleDb>

export type RunTool = (command: string, args: string[], opts?: { timeoutMs?: number }) => Promise<{ stdout: Buffer; stderr: string }>

export type ContentStore = {
  readFileAsBuffer: (a: { bucket: string; key: string }) => Promise<Buffer>
  copyFile: (a: { bucket: string; key: string; fromAbsolutePath: string }) => Promise<unknown>
}

export type ExtractDeps = {
  content: ContentStore
  run: RunTool
  embedder: Embedder
  whisperModel: string
  /** Text and vision models; without them the asset is read and indexed but not summarised. */
  models?: { text: import('./describe.js').Model; vision: import('./describe.js').Model }
}

export const runTool: RunTool = (command, args, { timeoutMs = 10 * 60_000 } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const out: Buffer[] = []
    const err: Buffer[] = []
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (d: Buffer) => out.push(d))
    child.stderr.on('data', (d: Buffer) => err.push(d))
    child.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      reject(new Error(e.code === 'ENOENT' ? `${command} is not installed on this worker` : e.message))
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      const stderr = Buffer.concat(err).toString('utf8')
      if (code === 0) return resolve({ stdout: Buffer.concat(out), stderr })
      const why = signal ? `was stopped (${signal})` : `exited with ${code}`
      reject(new Error(`${command} ${why}: ${stderr.trim().split('\n').slice(-3).join(' ')}`))
    })
  })

export type Step = 'probe' | 'audio' | 'extract' | 'transcribe' | 'keyframes' | 'categorise' | 'summarise' | 'place'

const STEP_NAMES: Record<Step, string> = {
  probe: 'Probe',
  audio: 'Audio track',
  extract: 'Extract text',
  transcribe: 'Transcribe',
  keyframes: 'Keyframes',
  categorise: 'Categorise',
  summarise: 'Summarise',
  place: 'Place',
}

export function readableFailure(step: Step, message: string): string {
  const missing = message.match(/^(\S+) is not installed on this worker/)
  if (missing) return `${missing[1]} is not installed where files are read, so this step could not run. Install it, then retry.`
  if (/Incorrect password/i.test(message)) return 'The PDF is password protected. Upload a copy without the password.'
  if (step === 'extract' && /Syntax Error|Couldn't read xref|May not be a PDF file|Couldn't open file/i.test(message))
    return 'The PDF could not be opened. It may be damaged; upload it again from the original.'
  if (/Invalid data found when processing input|moov atom not found|could not find codec parameters|End of file/i.test(message))
    return 'The file could not be read as a recording. It may be damaged or only partly uploaded; upload it again from the original.'
  if (/was stopped \(SIGKILL\)/.test(message)) return 'The step ran longer than it is allowed to and was stopped. Retry, or split the file.'
  const first = message.split('\n')[0]!.trim().slice(0, 200)
  return `${STEP_NAMES[step]} stopped: ${first || 'no reason was given'}.`
}

export async function recordStep<T extends Record<string, unknown>>(db: Db, assetId: string, step: Step, work: () => Promise<T>): Promise<T> {
  await db
    .insertInto('spindle_extraction')
    .values({ extraction_id: crypto.randomUUID(), asset_id: assetId, step, status: 'running' } as never)
    .onConflict((oc) =>
      oc.columns(['asset_id', 'step'] as never).doUpdateSet({ status: 'running', result: null, error: null, detail: null, finished_at: null } as never),
    )
    .execute()
  await db.updateTable('spindle_asset').set({ status: 'extracting' } as never).where('asset_id', '=', assetId).execute()
  try {
    const result = await work()
    await db
      .updateTable('spindle_extraction')
      .set({ status: 'done', result: JSON.stringify(result), finished_at: new Date().toISOString() } as never)
      .where('asset_id', '=', assetId)
      .where('step', '=', step)
      .execute()
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await db
      .updateTable('spindle_extraction')
      .set({ status: 'failed', error: readableFailure(step, message), detail: message.slice(0, 2000), finished_at: new Date().toISOString() } as never)
      .where('asset_id', '=', assetId)
      .where('step', '=', step)
      .execute()
    await db.updateTable('spindle_asset').set({ status: 'failed' } as never).where('asset_id', '=', assetId).execute()
    throw error
  }
}

export function reflow(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) =>
      para
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .reduce((acc, line) => (!acc ? line : acc.endsWith('-') ? acc.slice(0, -1) + line : `${acc} ${line}`), ''),
    )
    .filter(Boolean)
    .join('\n\n')
}

export function pagesFromPdftotext(raw: string) {
  const pages = raw.split('\f').map((text, i) => ({ page: i + 1, text: reflow(text) }))
  if (pages.length > 1 && !pages.at(-1)!.text) pages.pop()
  return pages
}

export function parseProbe(json: string) {
  const probe = JSON.parse(json) as {
    format?: { duration?: string }
    streams?: { codec_type?: string; width?: number; height?: number; disposition?: { attached_pic?: number } }[]
  }
  const streams = probe.streams ?? []
  const video = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic)
  return {
    durationSeconds: Number(probe.format?.duration ?? 0) || 0,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    hasVideo: Boolean(video),
    width: video?.width ?? null,
    height: video?.height ?? null,
  }
}

export function parseWhisper(json: string, model: string) {
  const raw = JSON.parse(json) as { result?: { language?: string }; transcription?: { offsets: { from: number; to: number }; text: string }[] }
  const segments = (raw.transcription ?? [])
    .map((s) => ({ start: s.offsets.from / 1000, end: s.offsets.to / 1000, text: s.text.trim() }))
    .filter((s) => s.text && !/^\[.*\]$|^\(.*\)$/.test(s.text))
  if (!segments.length) throw new Error('No speech was heard in this recording')
  return { language: (raw.result?.language ?? 'und').toLowerCase(), model: basename(model).replace(/^ggml-|\.bin$/g, ''), segments }
}

const SCENE_THRESHOLD = 0.3
const MAX_FRAMES = 48
const MIN_FRAMES = 3

export const minGapFor = (durationSeconds: number) => Math.max(2, durationSeconds / 40)

export function pickMoments(durationSeconds: number, sceneChanges: number[]): number[] {
  const gap = minGapFor(durationSeconds)
  const last = Math.max(0, durationSeconds - 0.5)
  const kept: number[] = [Math.min(0.5, last)]
  for (const t of [...sceneChanges].sort((a, b) => a - b)) {
    if (t <= last && t - kept[kept.length - 1]! >= gap) kept.push(t)
  }
  if (kept.length < MIN_FRAMES && durationSeconds > gap * MIN_FRAMES) {
    for (let i = 1; i < MIN_FRAMES; i++) {
      const t = (durationSeconds * i) / MIN_FRAMES
      if (kept.every((k) => Math.abs(k - t) >= gap)) kept.push(t)
    }
    kept.sort((a, b) => a - b)
  }
  if (kept.length <= MAX_FRAMES) return kept
  return Array.from({ length: MAX_FRAMES }, (_, i) => kept[Math.floor((i * kept.length) / MAX_FRAMES)]!)
}

async function withLocalCopy<T>(content: ContentStore, key: string, work: (path: string, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'spindle-'))
  try {
    const path = join(dir, safeKeySegment(key.split('/').pop() ?? 'file'))
    await writeFile(path, await content.readFileAsBuffer({ bucket: LIBRARY_BUCKET, key }))
    return await work(path, dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

type Asset = { asset_id: string; content_key: string; kind: string }

export const probeStep = (db: Db, d: ExtractDeps, a: Asset) =>
  recordStep(db, a.asset_id, 'probe', () =>
    withLocalCopy(d.content, a.content_key, async (path) =>
      parseProbe((await d.run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path])).stdout.toString('utf8')),
    ),
  )

export const documentStep = (db: Db, d: ExtractDeps, a: Asset) =>
  recordStep(db, a.asset_id, 'extract', () =>
    withLocalCopy(d.content, a.content_key, async (path) => {
      if (a.kind === 'text') {
        const text = (await readFile(path, 'utf8')).trim()
        return { source: 'plain-text', pages: [{ page: 1, text }], characters: text.length }
      }
      const { stdout } = await d.run('pdftotext', ['-layout', '-enc', 'UTF-8', path, '-'])
      const pages = pagesFromPdftotext(stdout.toString('utf8'))
      return { source: 'text-layer', pages, characters: pages.reduce((n, p) => n + p.text.replace(/\s/g, '').length, 0) }
    }),
  )

export const speechStep = (db: Db, d: ExtractDeps, a: Asset) =>
  recordStep(db, a.asset_id, 'transcribe', () =>
    withLocalCopy(d.content, a.content_key, async (path, dir) => {
      const wav = join(dir, 'speech.wav')
      await d.run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', path, '-vn', '-ac', '1', '-ar', '16000', wav])
      const out = join(dir, 'transcript')
      await d.run('whisper-cli', ['-m', d.whisperModel, '-f', wav, '-l', 'auto', '-oj', '-of', out, '-np'], { timeoutMs: 60 * 60_000 })
      return parseWhisper(await readFile(`${out}.json`, 'utf8'), d.whisperModel)
    }),
  )

export const keyframeStep = (db: Db, d: ExtractDeps, a: Asset, durationSeconds: number) =>
  recordStep(db, a.asset_id, 'keyframes', () =>
    withLocalCopy(d.content, a.content_key, async (path, dir) => {
      const scores = join(dir, 'scenes.txt')
      await d.run(
        'ffmpeg',
        ['-nostdin', '-loglevel', 'error', '-i', path, '-an', '-sn', '-vf', `scale=320:-2,select='gt(scene,${SCENE_THRESHOLD})',metadata=print:file=${scores}`, '-f', 'null', '-'],
        { timeoutMs: 60 * 60_000 },
      )
      const changes = [...(await readFile(scores, 'utf8').catch(() => '')).matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]))
      const frames = []
      for (const [i, at] of pickMoments(durationSeconds, changes).entries()) {
        const jpg = join(dir, `${i + 1}.jpg`)
        await d.run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-ss', at.toFixed(2), '-i', path, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', jpg])
        const key = derivedKey('spindle', a.asset_id, `frames/${String(i + 1).padStart(4, '0')}.jpg`)
        await d.content.copyFile({ bucket: LIBRARY_BUCKET, key, fromAbsolutePath: jpg })
        frames.push({ n: i + 1, atSeconds: Math.round(at * 100) / 100, key })
      }
      if (!frames.length) throw new Error('No frames could be taken from this video')
      return { sceneChanges: changes.length, minGapSeconds: Math.round(minGapFor(durationSeconds) * 10) / 10, frames }
    }),
  )

export const loadAsset = (db: Db, assetId: string) =>
  db.selectFrom('spindle_asset').select(['asset_id', 'content_key', 'kind']).where('asset_id', '=', assetId).executeTakeFirstOrThrow() as Promise<Asset>

const soft = async (work: () => Promise<unknown>) => {
  try {
    await work()
    return true
  } catch {
    return false
  }
}

export const describeStep = async (db: Db, d: ExtractDeps, a: Asset) => {
  if (!d.models || (a.kind !== 'image' && a.kind !== 'video')) return false
  const { categoriseFrames } = await import('./describe.js')
  return soft(() => categoriseFrames(db, d.models!.vision, d.content, a.asset_id))
}

export const summariseStep = async (db: Db, d: ExtractDeps, a: Asset) => {
  if (!d.models) return false
  const { summariseAsset } = await import('./describe.js')
  return soft(() => summariseAsset(db, d.models!.text, a.asset_id))
}

export const placeStep = async (db: Db, d: ExtractDeps, a: Asset) => {
  if (!d.models) return false
  const { placeByModel } = await import('./filing.js')
  return soft(() => placeByModel(db, d.models!.text, a.asset_id))
}

export async function finishAsset(db: Db, d: ExtractDeps, assetId: string) {
  await db.updateTable('spindle_asset').set({ status: 'extracted', updated_at: new Date().toISOString() } as never).where('asset_id', '=', assetId).execute()
  return indexAsset(db, d.embedder, assetId)
}

/** Runs the whole trail in one call; the workflow runs the same steps one at a time. */
export async function extractAsset(db: Db, deps: ExtractDeps, assetId: string) {
  const asset = await loadAsset(db, assetId)
  if (asset.kind === 'document' || asset.kind === 'text') {
    await documentStep(db, deps, asset)
  } else if (asset.kind === 'audio' || asset.kind === 'video') {
    const media = await probeStep(db, deps, asset)
    if (media.hasAudio) await speechStep(db, deps, asset)
    if (asset.kind === 'video') await keyframeStep(db, deps, asset, media.durationSeconds)
  }
  await describeStep(db, deps, asset)
  await summariseStep(db, deps, asset)
  await placeStep(db, deps, asset)
  return finishAsset(db, deps, assetId)
}
