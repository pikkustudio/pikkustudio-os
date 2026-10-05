import { sql, type Kysely } from 'kysely'
import type { SpindleDb } from './library.js'

export type PassageSource = 'summary' | 'page' | 'speech' | 'frame'

export type PassageDraft = {
  source: PassageSource
  page: number | null
  startSeconds: number | null
  endSeconds: number | null
  frameAt: number | null
  text: string
  original: string | null
}

/** Embeds text for search; the model name is stored beside every vector. */
export type Embedder = {
  model: string
  passages: (texts: string[]) => Promise<Float32Array[]>
  query: (text: string) => Promise<Float32Array>
}

export type Extraction = { step: string; status: string; result: Record<string, unknown> | null }

const PAGE_WINDOW = 800
const PAGE_OVERLAP = 150
const SPEECH_WINDOW_SECONDS = 45
const blank = { page: null, startSeconds: null, endSeconds: null, frameAt: null, original: null }

/** Cuts a page at sentence ends near the window, overlapping so no point is split in two. */
export function cutPage(text: string): string[] {
  const clean = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (clean.length <= PAGE_WINDOW) return clean ? [clean] : []
  const pieces: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(clean.length, start + PAGE_WINDOW)
    if (end < clean.length) {
      const tail = clean.slice(start + PAGE_WINDOW / 2, end)
      const stop = Math.max(tail.lastIndexOf('. '), tail.lastIndexOf('\n'))
      if (stop >= 0) end = start + PAGE_WINDOW / 2 + stop + 1
    }
    pieces.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
    start = Math.max(end - PAGE_OVERLAP, start + 1)
  }
  return pieces.filter(Boolean)
}

function frameText(f: { category: string; caption: string; description: string }): string {
  const description = (f.description ?? '').replace(/^\d{1,2}:\d{2}\s*/, '').trim()
  const caption = (f.caption ?? '').trim()
  const text =
    !description || description.toLowerCase().includes(caption.toLowerCase())
      ? description || caption
      : `${caption}. ${description}`
  return text || f.category
}

/** Every passage an asset's finished extractions give, in reading order. */
export function passagesOf(extractions: Extraction[]): PassageDraft[] {
  const done = (step: string) => extractions.find((e) => e.step === step && e.status === 'done')?.result ?? null
  const out: PassageDraft[] = []

  const summary = done('summarise')
  if (summary) {
    const points = ((summary.keyPoints as string[]) ?? []).map((p) => `- ${p}`).join('\n')
    out.push({ ...blank, source: 'summary', text: [summary.title, summary.summary, points].filter(Boolean).join('\n') })
  }

  const text = done('ocr') ?? done('extract')
  for (const p of (text?.pages as { page: number; text: string }[] | undefined) ?? []) {
    for (const piece of cutPage(p.text ?? '')) out.push({ ...blank, source: 'page', page: p.page, text: piece })
  }

  const transcript = done('translate') ?? done('transcribe')
  const segments = (transcript?.segments as { start: number; end: number; text: string; english?: string }[] | undefined) ?? []
  let window: typeof segments = []
  const flush = () => {
    if (!window.length) return
    const translated = window.some((s) => s.english)
    out.push({
      ...blank,
      source: 'speech',
      startSeconds: window[0]!.start,
      endSeconds: window.at(-1)!.end,
      text: window.map((s) => (s.english ?? s.text).trim()).join(' '),
      original: translated ? window.map((s) => s.text.trim()).join(' ') : null,
    })
    window = []
  }
  for (const s of segments) {
    if (window.length && s.end - window[0]!.start > SPEECH_WINDOW_SECONDS) flush()
    window.push(s)
  }
  flush()

  const frames = done('categorise')
  for (const f of (frames?.frames as { atSeconds: number; category: string; caption: string; description: string }[] | undefined) ?? []) {
    out.push({ ...blank, source: 'frame', frameAt: f.atSeconds, text: frameText(f) })
  }
  return out.filter((p) => p.text.trim())
}

export const readExtractions = async (db: Kysely<SpindleDb>, assetId: string): Promise<Extraction[]> =>
  (await db.selectFrom('spindle_extraction').select(['step', 'status', 'result']).where('asset_id', '=', assetId).execute()).map(
    (r) => ({ step: r.step, status: r.status, result: r.result ? (JSON.parse(r.result) as Record<string, unknown>) : null }),
  )

const toBlob = (v: Float32Array) => new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength))
const fromBlob = (b: Uint8Array) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
const cosine = (a: Float32Array, b: Float32Array) => {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!
  return dot
}

/**
 * Rewrites an asset's passages. Embedding happens before the transaction, so a
 * model that does not answer leaves the old passages searchable.
 */
export async function indexAsset(db: Kysely<SpindleDb>, embedder: Embedder, assetId: string) {
  await db.selectFrom('spindle_asset').select('asset_id').where('asset_id', '=', assetId).executeTakeFirstOrThrow()
  const drafts = passagesOf(await readExtractions(db, assetId))
  const vectors: Float32Array[] | null = drafts.length
    ? await embedder.passages(drafts.map((d) => d.text)).catch(() => null)
    : []
  const rows = drafts.map((d, ord) => ({
    passage_id: crypto.randomUUID(),
    asset_id: assetId,
    ord,
    source: d.source,
    page: d.page,
    start_seconds: d.startSeconds,
    end_seconds: d.endSeconds,
    frame_at: d.frameAt,
    text: d.text,
    original: d.original,
    embedding: vectors ? toBlob(vectors[ord]!) : new Uint8Array(0),
    model: vectors ? embedder.model : 'keywords',
  }))
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('spindle_passage').where('asset_id', '=', assetId).execute()
    if (rows.length) await trx.insertInto('spindle_passage').values(rows as never).execute()
  })
  const counts: Record<string, number> = {}
  for (const d of drafts) counts[d.source] = (counts[d.source] ?? 0) + 1
  return { passages: drafts.length, model: vectors ? embedder.model : 'keywords', counts }
}

export type Hit = PassageDraft & {
  passageId: string
  assetId: string
  matchedBy: 'words' | 'meaning' | 'both'
  score: number
}

/** Below this a passage is only near the question by accident. */
const MEANING_FLOOR = 0.35
const CANDIDATES = 40
const RRF_K = 60

const STOP_WORDS = new Set(
  'a an and are as at be but by can do does for from how i if in into is it its me my no not of on or so than that the their them then there these they this to up was we what when where which who why will with you your'.split(' '),
)

/** The words of a query as an FTS5 query any of them can match. Only letters and digits survive. */
export function keywordQuery(query: string): string | null {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  return words.length ? words.map((w) => `"${w}"`).join(' OR ') : null
}

/**
 * Hybrid search: the keyword index and the embeddings each rank the passages, and
 * the two rankings are fused. With a knowledge base, only assets placed in it are searched.
 */
export async function searchPassages(
  db: Kysely<SpindleDb>,
  embedder: Embedder,
  { kbId, query, limit }: { kbId?: string | null; query: string; limit: number }
): Promise<Hit[]> {
  const inKb = kbId
    ? sql`and p.asset_id in (select asset_id from spindle_placement where kb_id = ${kbId} and state = 'placed')`
    : sql``

  const match = keywordQuery(query)
  const byWords = match
    ? (
        await sql<{ id: string }>`
          select p.passage_id as id
          from spindle_passage_fts f
          join spindle_passage p on p.rowid = f.rowid
          where spindle_passage_fts match ${match} ${inKb}
          order by bm25(spindle_passage_fts), p.passage_id
          limit ${CANDIDATES}`.execute(db)
      ).rows.map((r) => r.id)
    : []

  const q = await embedder.query(query).catch(() => null)
  const candidates = q ? await sql<{ id: string; embedding: Uint8Array }>`
    select p.passage_id as id, p.embedding as embedding
    from spindle_passage p
    where p.model = ${embedder.model} ${inKb}`.execute(db) : { rows: [] }
  const byMeaning = candidates.rows
    .map((r) => ({ id: r.id, cos: cosine(q!, fromBlob(r.embedding)) }))
    .filter((r) => r.cos >= MEANING_FLOOR)
    .sort((a, b) => b.cos - a.cos)
    .slice(0, CANDIDATES)
    .map((r) => r.id)

  const scores = new Map<string, { score: number; words: boolean; meaning: boolean }>()
  const fuse = (ids: string[], side: 'words' | 'meaning') =>
    ids.forEach((id, rank) => {
      const s = scores.get(id) ?? { score: 0, words: false, meaning: false }
      s.score += 1 / (RRF_K + rank + 1)
      s[side] = true
      scores.set(id, s)
    })
  fuse(byWords, 'words')
  fuse(byMeaning, 'meaning')

  const meaningRank = new Map(byMeaning.map((id, rank) => [id, rank]))
  const top = [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score || (meaningRank.get(a[0]) ?? CANDIDATES) - (meaningRank.get(b[0]) ?? CANDIDATES))
    .slice(0, limit)
  if (!top.length) return []
  const rows = await db
    .selectFrom('spindle_passage')
    .select(['passage_id', 'asset_id', 'source', 'page', 'start_seconds', 'end_seconds', 'frame_at', 'text', 'original'])
    .where('passage_id', 'in', top.map(([id]) => id))
    .execute()
  const byId = new Map(rows.map((r) => [r.passage_id, r]))
  return top.flatMap(([id, s]) => {
    const r = byId.get(id)
    if (!r) return []
    return [
      {
        passageId: id,
        assetId: r.asset_id,
        source: r.source as PassageSource,
        page: r.page,
        startSeconds: r.start_seconds,
        endSeconds: r.end_seconds,
        frameAt: r.frame_at,
        text: r.text,
        original: r.original,
        matchedBy: (s.words && s.meaning ? 'both' : s.words ? 'words' : 'meaning') as Hit['matchedBy'],
        score: Math.round(s.score * 10_000) / 10_000,
      },
    ]
  })
}
