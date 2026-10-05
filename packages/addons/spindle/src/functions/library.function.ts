import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import type { Kysely } from 'kysely'
import { pikkuFunc } from '#pikku/addon/function'
import { ASSET_KINDS, LIBRARY_BUCKET, MAX_ASSET_BYTES, assetKindOf, safeKeySegment } from '../lib/asset-kind.js'
import * as library from '../lib/library.js'
import * as proposals from '../lib/proposals.js'
import * as filing from '../lib/filing.js'
import * as search from '../lib/search.js'
import { createEmbedder } from '../lib/embed.js'
import { createModel } from '../lib/describe.js'
import * as detail from '../lib/detail.js'
import { studioRunner, toolStatus } from '../lib/tools.js'

const db = (kysely: unknown) => (kysely as Kysely<library.SpindleDb>).withoutPlugins()

export const SpindleRegisterAssetInput = z.object({
    contentKey: z.string(),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().max(255),
    sizeBytes: z.number().int().nonnegative(),
    batchId: z.string().max(64).optional(),
  })

export const spindleRegisterAsset = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Records an uploaded file as an asset: next catalogue number, kind decided from the MIME type and name.',
  input: SpindleRegisterAssetInput,
  func: async ({ kysely }, input) => library.registerAsset(db(kysely), input),
})

export const SpindleListAssetsInput = z.object({ kind: z.enum(ASSET_KINDS).optional(), unplaced: z.boolean().optional() })

export const spindleListAssets = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'The library, newest first, filterable by kind or to what no knowledge base holds.',
  input: SpindleListAssetsInput,
  func: async ({ kysely }, input) => library.listAssets(db(kysely), input),
})

export const SpindleListKnowledgeBasesInput = z.object({})

export const spindleListKnowledgeBases = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'Every knowledge base with how many assets it holds.',
  input: SpindleListKnowledgeBasesInput,
  func: async ({ kysely }) => ({ knowledgeBases: await library.listKnowledgeBases(db(kysely)) }),
})

export const SpindleCreateKnowledgeBaseInput = z.object({ name: z.string().min(1).max(120), description: z.string().max(2000) })

export const spindleCreateKnowledgeBase = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Creates a knowledge base.',
  input: SpindleCreateKnowledgeBaseInput,
  func: async ({ kysely }, input) => library.createKnowledgeBase(db(kysely), input),
})

export const SpindleDeleteKnowledgeBaseInput = z.object({ kbId: z.string() })

export const spindleDeleteKnowledgeBase = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Deletes a knowledge base; its assets stay in the library.',
  input: SpindleDeleteKnowledgeBaseInput,
  func: async ({ kysely }, { kbId }) => library.deleteKnowledgeBase(db(kysely), kbId),
})

export const SpindlePlaceAssetInput = z.object({ kbId: z.string(), assetId: z.string(), state: z.enum(['placed', 'removed']).default('placed') })

export const spindlePlaceAsset = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: "Files an asset into a knowledge base, or removes it. A member's decision outlives workflow re-runs.",
  input: SpindlePlaceAssetInput,
  func: async ({ kysely }, input) => library.placeAsset(db(kysely), { ...input, source: 'member' }),
})

export const SpindleListProposalsInput = z.object({})

export const spindleListProposals = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'Open proposals: knowledge bases the workflow suggests for assets that fit none.',
  input: SpindleListProposalsInput,
  func: async ({ kysely }) => ({ proposals: await proposals.openProposals(db(kysely)) }),
})

export const SpindleAcceptProposalInput = z.object({ proposalId: z.string(), name: z.string().min(1).max(120).optional() })

export const spindleAcceptProposal = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Creates the proposed knowledge base and places its assets in it.',
  input: SpindleAcceptProposalInput,
  func: async ({ kysely }, { proposalId, name }) => proposals.acceptProposal(db(kysely), proposalId, name),
})

export const SpindleDismissProposalInput = z.object({ proposalId: z.string() })

export const spindleDismissProposal = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Dismisses a proposal: its assets stay unplaced and the same grouping is not proposed again.',
  input: SpindleDismissProposalInput,
  func: async ({ kysely }, { proposalId }) => proposals.dismissProposal(db(kysely), proposalId),
})

export const SpindleRedirectProposalInput = z.object({ proposalId: z.string(), kbId: z.string() })

export const spindleRedirectProposal = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: "Places the proposal's assets in an existing knowledge base instead of creating one.",
  input: SpindleRedirectProposalInput,
  func: async ({ kysely }, { proposalId, kbId }) => proposals.redirectProposal(db(kysely), proposalId, kbId),
})

const HitOutput = z.object({
  passageId: z.string(),
  assetId: z.string(),
  source: z.enum(['summary', 'page', 'speech', 'frame']),
  page: z.number().nullable(),
  startSeconds: z.number().nullable(),
  endSeconds: z.number().nullable(),
  frameAt: z.number().nullable(),
  text: z.string(),
  original: z.string().nullable(),
  matchedBy: z.enum(['words', 'meaning', 'both']),
  score: z.number(),
})

export const SpindleSearchOutput = z.object({ hits: z.array(HitOutput) })

export const SpindleAskOutput = z.object({
  answer: z.string(),
  unanswerable: z.boolean(),
  citations: z.array(HitOutput.extend({ n: z.number(), title: z.string() })),
})

export const SpindleSearchInput = z.object({ query: z.string().min(1).max(500), kbId: z.string().optional(), limit: z.number().int().min(1).max(50).optional() })

export const spindleSearch = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'Searches the library, or one knowledge base, by exact words and by meaning; each hit names the page, timestamp or frame it came from.',
  input: SpindleSearchInput,
  output: SpindleSearchOutput,
  func: async ({ kysely, variables }, { query, kbId, limit }) => ({
    hits: await search.searchPassages(db(kysely), await createEmbedder(variables), { kbId, query: query.trim(), limit: limit ?? 12 }),
  }),
})

export const SpindleIndexAssetInput = z.object({ assetId: z.string() })

export const spindleIndexAsset = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: "Rewrites an asset's searchable passages from what its extraction steps produced.",
  input: SpindleIndexAssetInput,
  func: async ({ kysely, variables }, { assetId }) => search.indexAsset(db(kysely), await createEmbedder(variables), assetId),
})

export const spindleCheckTools = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'Which of the tools spindle reads files with (ffmpeg, whisper-cli, pdftotext) Studio has, and how to get the missing ones.',
  func: async ({ studio }) => ({ tools: await toolStatus(studio?.tools) }),
})

export const SpindleExtractAssetInput = z.object({ assetId: z.string() })

export const spindleExtractAsset = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Starts reading an asset: the extraction workflow runs in the background and the asset turns searchable when it finishes.',
  input: SpindleExtractAssetInput,
  func: async (_services, { assetId }, { rpc }) => {
    const { runId } = await rpc.startWorkflow('spindleExtract', { assetId })
    return { runId }
  },
})

export const SpindleAskInput = z.object({ question: z.string().min(1).max(500), kbId: z.string().optional() })

export const spindleAsk = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'Answers a question in English from the library, or one knowledge base, citing the page, timestamp or frame of each passage; says so when the library does not answer it.',
  input: SpindleAskInput,
  output: SpindleAskOutput,
  func: async ({ kysely, variables }, { question, kbId }) =>
    filing.askLibrary(db(kysely), await createEmbedder(variables), await createModel(variables, 'text'), { question, kbId }),
})

export const spindleProposeKnowledgeBases = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Groups the assets that fit no knowledge base and records a proposal for each group; nothing is created until the owner accepts one.',
  func: async ({ kysely, variables }) => filing.groupUnplaced(db(kysely), await createModel(variables, 'text')),
})

export const SpindleAutoPlaceAssetInput = z.object({ assetId: z.string() })

export const spindleAutoPlaceAsset = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: "Has the model judge an asset against the knowledge bases and rewrites the workflow's placements; the owner's own decisions are kept.",
  input: SpindleAutoPlaceAssetInput,
  func: async ({ kysely, variables }, { assetId }) => filing.placeByModel(db(kysely), await createModel(variables, 'text'), assetId),
})

export const SpindleRequestAssetUploadInput = z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().max(255), sizeBytes: z.number().int().nonnegative() })

export const spindleRequestAssetUpload = pikkuFunc({
  expose: true,
  scopes: ['spindle:write'],
  description: 'Hands back a signed upload URL for one file under the library prefix, refusing files over 2 GB and kinds spindle cannot read; register the asset once the bytes have landed.',
  input: SpindleRequestAssetUploadInput,
  func: async ({ content }, { fileName, mimeType, sizeBytes }) => {
    if (sizeBytes > MAX_ASSET_BYTES) throw new Error('Files are limited to 2 GB each')
    if (!assetKindOf(fileName, mimeType)) throw new Error(`Unsupported file type: ${fileName}`)
    const contentKey = `spindle/${crypto.randomUUID()}/${safeKeySegment(fileName)}`
    const upload = await content.getUploadURL({ bucket: LIBRARY_BUCKET, fileKey: contentKey, contentType: mimeType || 'application/octet-stream', size: sizeBytes })
    return { uploadUrl: upload.uploadUrl, uploadMethod: upload.uploadMethod ?? 'PUT', uploadHeaders: upload.uploadHeaders ?? {}, contentKey }
  },
})

export const SpindleGetAssetInput = z.object({ assetId: z.string() })

export const spindleGetAsset = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'One asset with how it was read step by step, its passages and the knowledge bases that hold it.',
  input: SpindleGetAssetInput,
  func: async ({ kysely }, { assetId }) => detail.getAsset(db(kysely) as never, assetId),
})

export const SpindleGetKnowledgeBaseInput = z.object({ kbId: z.string() })

export const spindleGetKnowledgeBase = pikkuFunc({
  expose: true,
  readonly: true,
  scopes: ['spindle:read'],
  description: 'One knowledge base with the assets placed in it.',
  input: SpindleGetKnowledgeBaseInput,
  func: async ({ kysely }, { kbId }) => detail.getKnowledgeBase(db(kysely) as never, kbId),
})
