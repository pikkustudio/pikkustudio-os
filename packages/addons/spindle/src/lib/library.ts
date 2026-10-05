import type { Generated, Kysely } from 'kysely'
import { WORKFLOW_FOR_KIND, assetKindOf, titleFromFileName, type AssetKind } from './asset-kind.js'

export type SpindleDb = SearchDb & ProposalDb & {
  spindle_asset: {
    asset_id: string
    catalogue_number: number
    title: string
    file_name: string
    mime_type: string
    kind: AssetKind
    size_bytes: number
    content_key: string
    batch_id: string | null
    status: Generated<'uploaded' | 'extracting' | 'extracted' | 'failed'>
    created_at: Generated<string>
    updated_at: Generated<string>
  }
  spindle_knowledge_base: {
    kb_id: string
    name: string
    description: string
    replacing_since: Generated<string | null>
    created_at: Generated<string>
    updated_at: Generated<string>
  }
  spindle_placement: {
    placement_id: string
    kb_id: string
    asset_id: string
    source: 'workflow' | 'member'
    state: Generated<'placed' | 'removed'>
    confidence: number | null
    reason: string | null
    created_at: Generated<string>
    updated_at: Generated<string>
  }
}

export type SearchDb = {
  spindle_extraction: {
    extraction_id: string
    asset_id: string
    step: string
    status: 'running' | 'done' | 'failed'
    result: string | null
    error: string | null
    detail: string | null
    started_at: string
    finished_at: string | null
  }
  spindle_passage: {
    passage_id: string
    asset_id: string
    source: 'summary' | 'page' | 'speech' | 'frame'
    ord: number
    page: number | null
    start_seconds: number | null
    end_seconds: number | null
    frame_at: number | null
    text: string
    original: string | null
    embedding: Uint8Array
    model: string
    created_at: Generated<string>
  }
}

export type ProposalDb = {
  spindle_proposal: {
    proposal_id: string
    name: string
    description: string
    reason: string
    state: Generated<'open' | 'accepted' | 'redirected' | 'dismissed'>
    kb_id: string | null
    decided_at: string | null
    created_at: Generated<string>
    updated_at: Generated<string>
  }
  spindle_proposal_asset: { proposal_id: string; asset_id: string; fit: number; note: string }
}

export type RegisterAsset = {
  contentKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
  batchId?: string
}

/** Records an uploaded file with the next catalogue number; a lost race on the number retries. */
export const registerAsset = async (db: Kysely<SpindleDb>, input: RegisterAsset) => {
  const kind = assetKindOf(input.fileName, input.mimeType)
  if (!kind) throw new Error(`Unsupported file type: ${input.fileName}`)
  const status = WORKFLOW_FOR_KIND[kind] ? 'extracting' : 'uploaded'
  for (let attempt = 0; ; attempt++) {
    const top = await db
      .selectFrom('spindle_asset')
      .select((eb) => eb.fn.max('catalogue_number').as('top'))
      .executeTakeFirst()
    const row = {
      asset_id: crypto.randomUUID(),
      catalogue_number: Number(top?.top ?? 0) + 1,
      title: titleFromFileName(input.fileName),
      file_name: input.fileName,
      mime_type: input.mimeType || 'application/octet-stream',
      kind,
      size_bytes: input.sizeBytes,
      content_key: input.contentKey,
      batch_id: input.batchId ?? null,
      status: status as 'extracting' | 'uploaded',
    }
    try {
      await db.insertInto('spindle_asset').values(row).execute()
      return row
    } catch (error) {
      if (attempt >= 4 || !String(error).includes('UNIQUE')) throw error
    }
  }
}

export const listAssets = async (
  db: Kysely<SpindleDb>,
  filter: { kind?: AssetKind; unplaced?: boolean } = {}
) => {
  let q = db.selectFrom('spindle_asset').selectAll()
  if (filter.kind) q = q.where('kind', '=', filter.kind)
  if (filter.unplaced) {
    q = q.where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom('spindle_placement')
            .select('spindle_placement.placement_id')
            .whereRef('spindle_placement.asset_id', '=', 'spindle_asset.asset_id')
            .where('spindle_placement.state', '=', 'placed')
        )
      )
    )
  }
  const assets = await q.orderBy('catalogue_number', 'desc').limit(500).execute()
  const counts = await db
    .selectFrom('spindle_asset')
    .select(['kind', (eb) => eb.fn.countAll<number>().as('n')])
    .groupBy('kind')
    .execute()
  return { assets, kindCounts: Object.fromEntries(counts.map((c) => [c.kind, Number(c.n)])) }
}

export const createKnowledgeBase = async (db: Kysely<SpindleDb>, input: { name: string; description: string }) => {
  const row = { kb_id: crypto.randomUUID(), name: input.name.trim(), description: input.description }
  if (!row.name) throw new Error('A knowledge base needs a name')
  await db.insertInto('spindle_knowledge_base').values(row).execute()
  return row
}

export const listKnowledgeBases = async (db: Kysely<SpindleDb>) => {
  const kbs = await db.selectFrom('spindle_knowledge_base').selectAll().orderBy('name').execute()
  const held = await db
    .selectFrom('spindle_placement')
    .select(['kb_id', (eb) => eb.fn.countAll<number>().as('n')])
    .where('state', '=', 'placed')
    .groupBy('kb_id')
    .execute()
  return kbs.map((kb) => ({ ...kb, assetCount: Number(held.find((h) => h.kb_id === kb.kb_id)?.n ?? 0) }))
}

/** A knowledge base never owns an asset: deleting one removes its placements only. */
export const deleteKnowledgeBase = async (db: Kysely<SpindleDb>, kbId: string) => {
  await db.deleteFrom('spindle_knowledge_base').where('kb_id', '=', kbId).execute()
}

/** A member's decision outlives every re-run; the workflow only rewrites its own rows. */
export const placeAsset = async (
  db: Kysely<SpindleDb>,
  input: { kbId: string; assetId: string; source: 'workflow' | 'member'; state?: 'placed' | 'removed'; confidence?: number; reason?: string }
) => {
  const existing = await db
    .selectFrom('spindle_placement')
    .select(['placement_id', 'source'])
    .where('kb_id', '=', input.kbId)
    .where('asset_id', '=', input.assetId)
    .executeTakeFirst()
  if (existing?.source === 'member' && input.source === 'workflow') return false
  const values = {
    source: input.source,
    state: input.state ?? 'placed',
    confidence: input.confidence ?? null,
    reason: input.reason ?? null,
  }
  if (existing) {
    await db.updateTable('spindle_placement').set(values).where('placement_id', '=', existing.placement_id).execute()
  } else {
    await db
      .insertInto('spindle_placement')
      .values({ placement_id: crypto.randomUUID(), kb_id: input.kbId, asset_id: input.assetId, ...values })
      .execute()
  }
  return true
}
