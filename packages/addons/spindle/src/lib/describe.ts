import type { Kysely } from 'kysely'
import { z } from 'zod'
import { LIBRARY_BUCKET, derivedKey } from './asset-kind.js'
import { recordStep, type ContentStore } from './extract.js'
import type { SpindleDb } from './library.js'
import { readExtractions, type Extraction } from './search.js'

type Db = Kysely<SpindleDb>

/** Asks a model for JSON, with pictures when it can see. */
export type Model = {
  name: string
  json: (system: string, user: string, images?: Uint8Array[]) => Promise<unknown>
}

type Variables = { get: (name: string) => Promise<string | undefined> | string | undefined }

/** Local models over Ollama's OpenAI-compatible endpoint; the vision model may differ from the text one. */
export async function createModel(variables: Variables, kind: 'text' | 'vision'): Promise<Model> {
  const baseURL = ((await variables.get('OLLAMA_BASE_URL')) || 'http://localhost:11434/v1').replace(/\/$/, '')
  const name =
    kind === 'vision'
      ? (await variables.get('VISION_MODEL')) || 'qwen2.5vl'
      : (await variables.get('CHAT_MODEL')) || 'qwen3'
  return {
    name,
    json: async (system, user, images = []) => {
      const content = images.length
        ? [{ type: 'text', text: user }, ...images.map((b) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${Buffer.from(b).toString('base64')}` } }))]
        : user
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: name, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
        signal: AbortSignal.timeout(300_000),
      })
      if (!res.ok) throw new Error(`Ollama answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const body = (await res.json()) as { choices: { message: { content: string } }[] }
      return parseJsonAnswer(body.choices[0]?.message.content ?? '')
    },
  }
}

/** Models wrap JSON in fences or prose; take the outermost object. */
export function parseJsonAnswer(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('The model did not answer with JSON')
  return JSON.parse(text.slice(start, end + 1))
}

const Summary = z.object({ title: z.string(), language: z.string(), summary: z.string(), keyPoints: z.array(z.string()), tags: z.array(z.string()) })
const FrameLabels = z.object({ frames: z.array(z.object({ n: z.number(), category: z.string(), caption: z.string() })) })

const SUMMARISER = `You summarise one item for a library catalogue. Reply with JSON only:
{"title": a proper English title from the content, "language": the source language as an ISO 639-1 code, "summary": 2-4 English sentences, "keyPoints": up to 6 short English points, "tags": up to 8 lowercase English topic tags}.
Write English whatever the source language. Do not invent what the text does not say.`

const FRAME_READER = `You label video frames or pictures for a library. Reply with JSON only:
{"frames": [{"n": the image's number starting at 1, "category": a short reusable name such as "Slide", "Diagram", "Person speaking", "caption": one sentence saying what it shows}]}.
Reuse a category from the list given when it fits, so the same kind of frame gets the same name. One entry per image, in order.`

const MAX_SOURCE_CHARACTERS = 12_000

/** Everything the asset yielded as text, in reading order, for the model. */
export function sourceTextOf(extractions: Extraction[]): string {
  const done = (step: string) => extractions.find((e) => e.step === step && e.status === 'done')?.result ?? null
  const parts: string[] = []
  const text = done('ocr') ?? done('extract')
  for (const p of (text?.pages as { page: number; text: string }[] | undefined) ?? []) if (p.text) parts.push(`[page ${p.page}]\n${p.text}`)
  const transcript = done('translate') ?? done('transcribe')
  if (transcript) parts.push(`[transcript]\n${((transcript.segments as { text: string; english?: string }[]) ?? []).map((s) => s.english ?? s.text).join(' ')}`)
  const frames = done('categorise')
  if (frames) parts.push(`[what is seen]\n${((frames.frames as { description: string }[]) ?? []).map((f) => `- ${f.description}`).join('\n')}`)
  return parts.join('\n\n').slice(0, MAX_SOURCE_CHARACTERS)
}

const isLatinScript = (s: string) => !/[^\p{Script=Latin}\p{N}\p{P}\p{S}\s]/u.test(s)
const titleFromFileName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
const tidy = (t: string) => t.replace(/\s+/g, ' ').trim()

export const summariseAsset = (db: Db, model: Model, assetId: string) =>
  recordStep(db, assetId, 'summarise', async () => {
    const asset = await db.selectFrom('spindle_asset').select(['title', 'file_name', 'kind']).where('asset_id', '=', assetId).executeTakeFirstOrThrow()
    const extractions = await readExtractions(db, assetId)
    const source = sourceTextOf(extractions)
    if (!source.trim()) throw new Error('Nothing was extracted to summarise')
    const parsed = Summary.parse(await model.json(SUMMARISER, `Asset: "${asset.title}" (${asset.file_name}, ${asset.kind})\n\n${source}`))
    // A title from the content replaces one made from the file name, never a curator's own, and only an English one.
    if (isLatinScript(parsed.title)) {
      await db.updateTable('spindle_asset').set({ title: parsed.title.trim().slice(0, 200) } as never).where('asset_id', '=', assetId).where('title', '=', titleFromFileName(asset.file_name)).execute()
    }
    const heard = extractions.find((e) => e.step === 'transcribe' && e.status === 'done')?.result
    const language = typeof heard?.language === 'string' ? heard.language : parsed.language
    return {
      ...parsed,
      summary: tidy(parsed.summary),
      keyPoints: parsed.keyPoints.map(tidy).filter(Boolean),
      language: language.toLowerCase().slice(0, 8),
      tags: [...new Set(parsed.tags.map((t) => t.toLowerCase().replace(/^#/, '').trim()))].filter(Boolean),
    }
  })

const BATCH = 4
const categoryKey = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, '')
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

type Frame = { n: number; atSeconds: number; key: string }
type Label = z.infer<typeof FrameLabels>['frames'][number]

/** A batch whose answer does not line up is asked again a frame at a time, so a miscount never gives a frame its neighbour's caption. */
async function labelBatch(model: Model, frames: Frame[], images: Uint8Array[], used: string[]): Promise<Label[]> {
  const ask = async (idx: number[]) => {
    const message = [`Categories used so far: ${used.length ? used.join(', ') : 'none yet'}`, ...idx.map((i, j) => `Image ${j + 1}: frame at ${clock(frames[i]!.atSeconds)}`)].join('\n')
    const answer = FrameLabels.parse(await model.json(FRAME_READER, message, idx.map((i) => images[i]!)))
    return new Map(answer.frames.map((f) => [f.n, f]))
  }
  const all = frames.map((_, i) => i)
  const got = await ask(all)
  if (all.every((i) => got.get(i + 1)?.category && got.get(i + 1)?.caption)) return all.map((i) => got.get(i + 1)!)
  const one: Label[] = []
  for (const i of all) {
    const single = await ask([i])
    const label = single.get(1) ?? [...single.values()][0]
    if (!label?.category) throw new Error(`The model gave no category for frame ${frames[i]!.n}`)
    one.push(label)
  }
  return one
}

/** Names what each keyframe shows (or the image itself), reusing category names so a lecture's slides are all "Slide". */
export const categoriseFrames = (db: Db, model: Model, content: ContentStore, assetId: string) =>
  recordStep(db, assetId, 'categorise', async () => {
    const asset = await db.selectFrom('spindle_asset').select(['kind', 'content_key']).where('asset_id', '=', assetId).executeTakeFirstOrThrow()
    let frames: Frame[]
    if (asset.kind === 'image') {
      frames = [{ n: 1, atSeconds: 0, key: asset.content_key }]
    } else {
      const done = (await readExtractions(db, assetId)).find((e) => e.step === 'keyframes' && e.status === 'done')
      frames = (done?.result?.frames as Frame[] | undefined) ?? []
      if (!frames.length) throw new Error('There are no keyframes to categorise')
    }
    const names = new Map<string, string>()
    const seen: (Frame & { category: string; caption: string; description: string })[] = []
    for (let i = 0; i < frames.length; i += BATCH) {
      const batch = frames.slice(i, i + BATCH)
      const images = await Promise.all(batch.map(async (f) => new Uint8Array(await content.readFileAsBuffer({ bucket: LIBRARY_BUCKET, key: f.key }))))
      const labels = await labelBatch(model, batch, images, [...names.values()])
      for (const [j, label] of labels.entries()) {
        const raw = label.category.trim().slice(0, 40)
        const category = names.get(categoryKey(raw)) ?? raw
        names.set(categoryKey(raw), category)
        const caption = label.caption.trim().slice(0, 160)
        const frame = batch[j]!
        seen.push({ ...frame, category, caption, description: asset.kind === 'image' ? `${category}: ${caption}` : `${clock(frame.atSeconds)} ${category}: ${caption}` })
      }
    }
    const counts = new Map<string, number>()
    for (const f of seen) counts.set(f.category, (counts.get(f.category) ?? 0) + 1)
    return { model: model.name, frames: seen, categories: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) }
  })

export { derivedKey }
