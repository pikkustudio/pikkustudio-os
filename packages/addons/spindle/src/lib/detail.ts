import type { Kysely } from 'kysely'
import type { SpindleDb, SearchDb, ProposalDb } from './library.js'

type Db = Kysely<SpindleDb & SearchDb & ProposalDb>

export const getAsset = async (db: Db, assetId: string) => {
  const asset = await db.selectFrom('spindle_asset').selectAll().where('asset_id', '=', assetId).executeTakeFirstOrThrow()
  const steps = await db
    .selectFrom('spindle_extraction')
    .select(['step', 'status', 'error', 'started_at', 'finished_at'])
    .where('asset_id', '=', assetId)
    .orderBy('started_at')
    .execute()
  const passages = await db
    .selectFrom('spindle_passage')
    .select(['passage_id', 'source', 'ord', 'page', 'start_seconds', 'end_seconds', 'frame_at', 'text'])
    .where('asset_id', '=', assetId)
    .orderBy('ord')
    .execute()
  const collections = await db
    .selectFrom('spindle_placement as p')
    .innerJoin('spindle_knowledge_base as k', 'k.kb_id', 'p.kb_id')
    .select(['k.kb_id', 'k.name', 'p.source', 'p.reason'])
    .where('p.asset_id', '=', assetId)
    .where('p.state', '=', 'placed')
    .orderBy('k.name')
    .execute()
  return { asset, steps, passages, collections }
}

export const getKnowledgeBase = async (db: Db, kbId: string) => {
  const kb = await db.selectFrom('spindle_knowledge_base').selectAll().where('kb_id', '=', kbId).executeTakeFirstOrThrow()
  const assets = await db
    .selectFrom('spindle_placement as p')
    .innerJoin('spindle_asset as a', 'a.asset_id', 'p.asset_id')
    .select(['a.asset_id', 'a.catalogue_number', 'a.title', 'a.kind', 'a.status', 'p.source', 'p.reason'])
    .where('p.kb_id', '=', kbId)
    .where('p.state', '=', 'placed')
    .orderBy('a.catalogue_number')
    .execute()
  return { kb, assets }
}
