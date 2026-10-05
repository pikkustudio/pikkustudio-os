import type { Kysely } from 'kysely'
import { createKnowledgeBase, placeAsset, type SpindleDb } from './library.js'

export type NewProposal = {
  name: string
  description: string
  reason: string
  assets: { assetId: string; fit: number; note: string }[]
}

/** What the workflow's grouping step records; nothing is created until the owner decides. */
export const createProposal = async (db: Kysely<SpindleDb>, input: NewProposal) => {
  const proposalId = crypto.randomUUID()
  await db
    .insertInto('spindle_proposal')
    .values({ proposal_id: proposalId, name: input.name, description: input.description, reason: input.reason })
    .execute()
  if (input.assets.length > 0) {
    await db
      .insertInto('spindle_proposal_asset')
      .values(input.assets.map((a) => ({ proposal_id: proposalId, asset_id: a.assetId, fit: a.fit, note: a.note })))
      .execute()
  }
  return proposalId
}

export const openProposals = async (db: Kysely<SpindleDb>) => {
  const proposals = await db
    .selectFrom('spindle_proposal')
    .selectAll()
    .where('state', '=', 'open')
    .orderBy('created_at')
    .execute()
  const assets = proposals.length
    ? await db
        .selectFrom('spindle_proposal_asset')
        .selectAll()
        .where('proposal_id', 'in', proposals.map((p) => p.proposal_id))
        .execute()
    : []
  return proposals.map((p) => ({ ...p, assets: assets.filter((a) => a.proposal_id === p.proposal_id) }))
}

const openOne = async (db: Kysely<SpindleDb>, proposalId: string) => {
  const proposal = await db
    .selectFrom('spindle_proposal')
    .selectAll()
    .where('proposal_id', '=', proposalId)
    .executeTakeFirst()
  if (!proposal) throw new Error('No such proposal')
  if (proposal.state !== 'open') throw new Error(`The proposal was already ${proposal.state}`)
  const assets = await db
    .selectFrom('spindle_proposal_asset')
    .select('asset_id')
    .where('proposal_id', '=', proposalId)
    .execute()
  return { proposal, assetIds: assets.map((a) => a.asset_id) }
}

const close = (db: Kysely<SpindleDb>, proposalId: string, state: 'accepted' | 'redirected' | 'dismissed', kbId: string | null) =>
  db
    .updateTable('spindle_proposal')
    .set({ state, kb_id: kbId, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where('proposal_id', '=', proposalId)
    .execute()

const placeAll = async (db: Kysely<SpindleDb>, kbId: string, assetIds: string[]) => {
  for (const assetId of assetIds) await placeAsset(db, { kbId, assetId, source: 'member', state: 'placed' })
}

/** The owner agrees: the knowledge base is created from the proposal and its assets placed in it. */
export const acceptProposal = async (db: Kysely<SpindleDb>, proposalId: string, name?: string) => {
  const { proposal, assetIds } = await openOne(db, proposalId)
  const kb = await createKnowledgeBase(db, { name: name?.trim() || proposal.name, description: proposal.description })
  await placeAll(db, kb.kb_id, assetIds)
  await close(db, proposalId, 'accepted', kb.kb_id)
  return { state: 'accepted' as const, kbId: kb.kb_id, placed: assetIds.length }
}

/** The assets stay unplaced, and the same grouping is not proposed again. */
export const dismissProposal = async (db: Kysely<SpindleDb>, proposalId: string) => {
  await openOne(db, proposalId)
  await close(db, proposalId, 'dismissed', null)
  return { state: 'dismissed' as const, kbId: null, placed: 0 }
}

/** The owner files the proposal's assets in an existing knowledge base instead. */
export const redirectProposal = async (db: Kysely<SpindleDb>, proposalId: string, kbId: string) => {
  const { assetIds } = await openOne(db, proposalId)
  const kb = await db.selectFrom('spindle_knowledge_base').select('kb_id').where('kb_id', '=', kbId).executeTakeFirst()
  if (!kb) throw new Error('No such knowledge base')
  await placeAll(db, kbId, assetIds)
  await close(db, proposalId, 'redirected', kbId)
  return { state: 'redirected' as const, kbId, placed: assetIds.length }
}
