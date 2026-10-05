import type { Kysely } from 'kysely'
import { z } from 'zod'
import type { Model } from './describe.js'
import { recordStep } from './extract.js'
import { placeAsset, type SpindleDb } from './library.js'
import { createProposal } from './proposals.js'
import { readExtractions, searchPassages, type Embedder, type Extraction, type Hit } from './search.js'

type Db = Kysely<SpindleDb>

/** Below this the placer is guessing; the asset is left for the owner or a proposal. */
export const PLACEMENT_THRESHOLD = 0.6
const KBS_PER_TURN = 10
const ASSETS_PER_TURN = 12

const PlacementJudgements = z.object({ fits: z.array(z.object({ n: z.number(), confidence: z.number(), reason: z.string() })) })
const ProposalGroups = z.object({
  groups: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      reason: z.string(),
      members: z.array(z.object({ n: z.number(), fit: z.number(), note: z.string() })),
    }),
  ),
})
const AnswerDraft = z.object({ answer: z.string(), unanswerable: z.boolean(), used: z.array(z.number()).default([]) })

const PLACER = `You file one library item into knowledge bases. Reply with JSON only:
{"fits": [{"n": the knowledge base's number, "confidence": 0 to 1, "reason": one short sentence}]}.
List only knowledge bases the item truly belongs in. An item may belong in several or none.`

const PROPOSER = `You propose new knowledge bases for library items that fit none of the existing ones. Reply with JSON only:
{"groups": [{"name": a short shelf label, "description": one sentence on what belongs, "reason": one sentence on why these belong together, "members": [{"n": the item's number, "fit": 0 to 1, "note": a few words on why this item}]}]}.
Group only items that truly share a subject; leave an item out rather than forcing it. Each item is in at most one group.`

const ANSWERER = `You answer a question using only the numbered passages given. Reply with JSON only:
{"answer": English prose with [n] markers citing the passages used, "unanswerable": true when the passages do not answer it, "used": [numbers of the passages you cited]}.
Never use knowledge outside the passages.`

export const kbCode = (name: string) => (name.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '').slice(0, 3) || 'KB').toUpperCase()

/** The placer's reason as one short sentence: capitalised, one full stop. */
export function asSentence(reason: string): string {
  const flat = reason.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '').slice(0, 200)
  return flat ? `${flat[0]!.toUpperCase()}${flat.slice(1)}.` : ''
}

const fold = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** "Clay Body Testing" as a shelf label: "Clay body testing". Acronyms stay. */
export function tidyName(raw: string) {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .split(' ')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? `${w[0]!.toUpperCase()}${w.slice(1)}` : w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ')
}

/** What the asset yielded, as the placer reads it: the English summary, not the raw text. */
export function describeAsset(asset: { title: string; file_name: string; kind: string }, extractions: Extraction[]): string {
  const done = (step: string) => extractions.find((e) => e.step === step && e.status === 'done')?.result ?? null
  const summary = done('summarise')
  if (!summary) throw new Error('The asset has no summary to place by')
  const lines = [`Title: ${asset.title}`, `Kind: ${asset.kind} (${asset.file_name})`, `Summary: ${summary.summary as string}`]
  const points = (summary.keyPoints as string[] | undefined) ?? []
  if (points.length) lines.push(`Key points:\n${points.map((p) => `- ${p}`).join('\n')}`)
  const tags = (summary.tags as string[] | undefined) ?? []
  if (tags.length) lines.push(`Tags: ${tags.join(', ')}`)
  const categories = (done('categorise')?.categories as { name: string; count: number }[] | undefined) ?? []
  if (categories.length) lines.push(`What its pictures show: ${categories.map((c) => `${c.name} (${c.count})`).join(', ')}`)
  return lines.join('\n')
}

/**
 * Judges the asset against the knowledge bases and rewrites the workflow's
 * placements for them. The owner's own decision, placed or removed, is never touched.
 */
export async function placeByModel(db: Db, model: Model, assetId: string, { onlyKbIds }: { onlyKbIds?: string[] } = {}) {
  return recordStep(db, assetId, 'place', async () => {
    const asset = await db.selectFrom('spindle_asset').select(['title', 'file_name', 'kind']).where('asset_id', '=', assetId).executeTakeFirstOrThrow()
    let q = db.selectFrom('spindle_knowledge_base').select(['kb_id', 'name', 'description'])
    if (onlyKbIds) q = q.where('kb_id', 'in', onlyKbIds.length ? onlyKbIds : [''])
    const kbs = await q.orderBy('name').execute()
    const decided = new Set((await db.selectFrom('spindle_placement').select('kb_id').where('asset_id', '=', assetId).where('source', '=', 'member').execute()).map((p) => p.kb_id))
    const open = kbs.filter((kb) => !decided.has(kb.kb_id))
    const placements: { kbId: string; name: string; confidence: number; reason: string }[] = []
    if (open.length) {
      const described = describeAsset(asset, await readExtractions(db, assetId))
      for (let start = 0; start < open.length; start += KBS_PER_TURN) {
        const turn = open.slice(start, start + KBS_PER_TURN)
        const listed = turn.map((kb, i) => `${i + 1}. ${kb.name}: ${kb.description || '(no description)'}`).join('\n')
        const answer = PlacementJudgements.parse(await model.json(PLACER, `ASSET\n${described}\n\nKNOWLEDGE BASES\n${listed}`))
        for (const fit of answer.fits) {
          const kb = turn[fit.n - 1]
          const confidence = Math.max(0, Math.min(1, fit.confidence))
          if (!kb || confidence < PLACEMENT_THRESHOLD || placements.some((p) => p.kbId === kb.kb_id)) continue
          placements.push({ kbId: kb.kb_id, name: kb.name, confidence: Math.round(confidence * 100) / 100, reason: asSentence(fit.reason) })
        }
      }
    }
    const judged = open.map((kb) => kb.kb_id)
    if (judged.length) {
      await db
        .deleteFrom('spindle_placement')
        .where('asset_id', '=', assetId)
        .where('source', '=', 'workflow')
        .where('kb_id', 'in', judged)
        .$if(placements.length > 0, (d) => d.where('kb_id', 'not in', placements.map((p) => p.kbId)))
        .execute()
    }
    for (const p of placements) await placeAsset(db, { kbId: p.kbId, assetId, source: 'workflow', confidence: p.confidence, reason: p.reason })
    return { considered: kbs.length, placements }
  })
}

/** Read assets in no knowledge base and in no open proposal: what a new grouping may use. */
async function unplacedCandidates(db: Db) {
  const rows = await db
    .selectFrom('spindle_asset')
    .select(['asset_id', 'title', 'file_name', 'kind'])
    .where('status', '=', 'extracted')
    .where('asset_id', 'not in', db.selectFrom('spindle_placement').select('asset_id').where('state', '=', 'placed'))
    .where(
      'asset_id',
      'not in',
      db
        .selectFrom('spindle_proposal_asset')
        .innerJoin('spindle_proposal', 'spindle_proposal.proposal_id', 'spindle_proposal_asset.proposal_id')
        .select('spindle_proposal_asset.asset_id')
        .where('spindle_proposal.state', '=', 'open'),
    )
    .execute()
  const withSummary: typeof rows = []
  for (const r of rows) if ((await readExtractions(db, r.asset_id)).some((e) => e.step === 'summarise' && e.status === 'done')) withSummary.push(r)
  return withSummary
}

/**
 * Groups the assets that fit nowhere and writes a proposal per group. Skips a group
 * that names an existing knowledge base or open proposal, and a grouping the owner
 * already dismissed. Groups the model names alike are not merged afterwards.
 */
export async function groupUnplaced(db: Db, model: Model) {
  const candidates = await unplacedCandidates(db)
  if (!candidates.length) return { considered: 0, proposed: 0 }
  const kbNames = (await db.selectFrom('spindle_knowledge_base').select('name').execute()).map((k) => k.name)
  const proposals = await db.selectFrom('spindle_proposal').select(['proposal_id', 'name', 'state']).where('state', 'in', ['open', 'dismissed']).execute()
  const taken = new Set([...kbNames, ...proposals.filter((p) => p.state === 'open').map((p) => p.name)].map(fold))
  const dismissedIds = proposals.filter((p) => p.state === 'dismissed').map((p) => p.proposal_id)
  const dismissed = new Map<string, Set<string>>()
  if (dismissedIds.length) {
    for (const r of await db.selectFrom('spindle_proposal_asset').select(['proposal_id', 'asset_id']).where('proposal_id', 'in', dismissedIds).execute()) {
      dismissed.set(r.proposal_id, (dismissed.get(r.proposal_id) ?? new Set()).add(r.asset_id))
    }
  }
  const alreadyDismissed = (ids: string[]) => [...dismissed.values()].some((set) => ids.every((id) => set.has(id)))

  let proposed = 0
  for (let start = 0; start < candidates.length; start += ASSETS_PER_TURN) {
    const turn = candidates.slice(start, start + ASSETS_PER_TURN)
    const described: string[] = []
    for (const a of turn) described.push(describeAsset(a, await readExtractions(db, a.asset_id)))
    const answer = ProposalGroups.parse(
      await model.json(
        PROPOSER,
        `EXISTING KNOWLEDGE BASES\n${kbNames.length ? kbNames.map((n) => `- ${n}`).join('\n') : '(none yet)'}\n\nASSETS THAT FIT NONE OF THEM\n${described.map((d, i) => `${i + 1}.\n${d}`).join('\n\n')}`,
      ),
    )
    const used = new Set<string>()
    const groups: { name: string; description: string; reason: string; members: { assetId: string; fit: number; note: string }[] }[] = []
    for (const group of answer.groups) {
      const name = tidyName(group.name)
      if (!name || taken.has(fold(name)) || groups.some((g) => fold(g.name) === fold(name))) continue
      const members = group.members.flatMap((m) => {
        const asset = turn[m.n - 1]
        if (!asset || used.has(asset.asset_id)) return []
        used.add(asset.asset_id)
        return [{ assetId: asset.asset_id, fit: Math.round(Math.max(0, Math.min(1, m.fit)) * 100) / 100, note: m.note.replace(/\s+/g, ' ').trim().slice(0, 120) }]
      })
      if (members.length) groups.push({ name, description: group.description, reason: group.reason, members })
    }
    for (const g of groups) {
      if (alreadyDismissed(g.members.map((m) => m.assetId))) continue
      await createProposal(db, { name: g.name, description: asSentence(g.description), reason: asSentence(g.reason), assets: g.members })
      taken.add(fold(g.name))
      proposed++
    }
  }
  return { considered: candidates.length, proposed }
}

export type Citation = Hit & { n: number; title: string }

const PASSAGES_READ = 8

const where = (h: Hit) =>
  h.source === 'page' ? `page ${h.page}` : h.source === 'speech' ? `at ${Math.floor(h.startSeconds ?? 0)}s` : h.source === 'frame' ? `frame at ${Math.floor(h.frameAt ?? 0)}s` : 'summary'

/**
 * Answers a question from the library's passages alone and cites them. Stateless:
 * each question stands alone.
 */
export async function askLibrary(db: Db, embedder: Embedder, model: Model, { question, kbId }: { question: string; kbId?: string }) {
  const nothing = { answer: 'The library does not cover this yet.', unanswerable: true, citations: [] as Citation[] }
  const hits = await searchPassages(db, embedder, { kbId, query: question.trim(), limit: PASSAGES_READ })
  if (!hits.length) return nothing
  const titles = new Map(
    (await db.selectFrom('spindle_asset').select(['asset_id', 'title']).where('asset_id', 'in', [...new Set(hits.map((h) => h.assetId))]).execute()).map((a) => [a.asset_id, a.title]),
  )
  const numbered = hits.map((h, i) => `[${i + 1}] ${titles.get(h.assetId)}, ${where(h)}:\n${h.text}`).join('\n\n')
  const draft = AnswerDraft.parse(await model.json(ANSWERER, `Question: ${question.trim()}\n\nPassages:\n\n${numbered}`))
  if (draft.unanswerable) return { ...nothing, answer: draft.answer.replace(/\s*\[\d+\]/g, '').trim() || nothing.answer }
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= hits.length
  const answer = draft.answer.replace(/\s*\[(\d+)\]/g, (m, n) => (valid(Number(n)) ? m : '')).trim()
  const marked = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))
  const cited = [...new Set([...marked, ...draft.used.filter(valid)])].sort((a, b) => a - b)
  if (!cited.length) return nothing
  return { answer, unanswerable: false, citations: cited.map((n) => ({ ...hits[n - 1]!, n, title: titles.get(hits[n - 1]!.assetId) ?? '' })) }
}
