import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createKnowledgeBase, listAssets, listKnowledgeBases, registerAsset } from './library.js'
import { acceptProposal, createProposal, dismissProposal, openProposals, redirectProposal } from './proposals.js'
import { memoryDb } from './sqlite-test-db.js'

const file = (name: string) => ({ contentKey: 'k', fileName: name, mimeType: 'application/pdf', sizeBytes: 1 })

const setup = async () => {
  const db = memoryDb()
  const a = await registerAsset(db, file('a.pdf'))
  const b = await registerAsset(db, file('b.pdf'))
  const proposalId = await createProposal(db, {
    name: 'Kiln firing',
    description: 'schedules',
    reason: 'two files about firing',
    assets: [
      { assetId: a.asset_id, fit: 0.9, note: 'a' },
      { assetId: b.asset_id, fit: 0.8, note: 'b' },
    ],
  })
  return { db, proposalId }
}

test('a proposal creates nothing until the owner decides', async () => {
  const { db } = await setup()
  assert.equal((await listKnowledgeBases(db)).length, 0)
  const open = await openProposals(db)
  assert.equal(open.length, 1)
  assert.equal(open[0]!.assets.length, 2)
})

test('accepting creates the knowledge base with the description and places the assets', async () => {
  const { db, proposalId } = await setup()
  const out = await acceptProposal(db, proposalId, '  Firing  ')
  assert.equal(out.placed, 2)
  const kbs = await listKnowledgeBases(db)
  assert.deepEqual([kbs[0]!.name, kbs[0]!.description, kbs[0]!.assetCount], ['Firing', 'schedules', 2])
  assert.equal((await openProposals(db)).length, 0)
  assert.equal((await listAssets(db, { unplaced: true })).assets.length, 0)
})

test('redirecting files the assets in an existing knowledge base', async () => {
  const { db, proposalId } = await setup()
  const kb = await createKnowledgeBase(db, { name: 'Kilns', description: '' })
  assert.equal((await redirectProposal(db, proposalId, kb.kb_id)).kbId, kb.kb_id)
  assert.equal((await listKnowledgeBases(db))[0]!.assetCount, 2)
})

test('redirecting to a knowledge base that does not exist leaves the proposal open', async () => {
  const { db, proposalId } = await setup()
  await assert.rejects(redirectProposal(db, proposalId, 'nope'), /No such knowledge base/)
  assert.equal((await openProposals(db)).length, 1)
})

test('dismissing leaves the assets unplaced and keeps the grouping on record', async () => {
  const { db, proposalId } = await setup()
  await dismissProposal(db, proposalId)
  assert.equal((await listAssets(db, { unplaced: true })).assets.length, 2)
  const kept = await db.selectFrom('spindle_proposal_asset').selectAll().execute()
  assert.equal(kept.length, 2)
})

test('a decided proposal cannot be decided again', async () => {
  const { db, proposalId } = await setup()
  await dismissProposal(db, proposalId)
  await assert.rejects(acceptProposal(db, proposalId), /already dismissed/)
})
