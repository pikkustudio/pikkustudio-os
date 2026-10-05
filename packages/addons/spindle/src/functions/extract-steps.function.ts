import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import type { Kysely } from 'kysely'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { createEmbedder } from '../lib/embed.js'
import { createModel } from '../lib/describe.js'
import { studioRunner } from '../lib/tools.js'
import type { SpindleDb } from '../lib/library.js'
import * as extract from '../lib/extract.js'

type Services = { kysely: unknown; content: unknown; variables: { get: (name: string) => Promise<string | undefined> }; studio?: { tools?: unknown } }

const db = (kysely: unknown) => (kysely as Kysely<SpindleDb>).withoutPlugins()

const context = async ({ kysely, content, variables, studio }: Services) => {
  const handle = db(kysely)
  const deps: extract.ExtractDeps = {
    content: content as never,
    run: studioRunner(studio?.tools as never),
    embedder: await createEmbedder(variables as never),
    models: { text: await createModel(variables as never, 'text'), vision: await createModel(variables as never, 'vision') },
    whisperModel: (await variables.get('WHISPER_MODEL')) || join(homedir(), '.cache', 'whisper-models', 'ggml-large-v3-turbo.bin'),
  }
  return { handle, deps }
}

export const SpindleAssetStepInput = z.object({ assetId: z.string() })
export const SpindleFramesStepInput = SpindleAssetStepInput.extend({ durationSeconds: z.number() })
export const SpindleKindOutput = z.object({ kind: z.string() })
export const SpindleMediaOutput = z.object({ hasAudio: z.boolean(), durationSeconds: z.number() })
export const SpindleOkOutput = z.object({ ok: z.boolean() })

export const spindleLoadAsset = pikkuSessionlessFunc({
  description: 'Which kind of file an asset is, so the workflow can pick its steps.',
  input: SpindleAssetStepInput,
  output: SpindleKindOutput,
  func: async ({ kysely }, { assetId }) => ({ kind: (await extract.loadAsset(db(kysely), assetId)).kind }),
})

export const spindleReadDocument = pikkuSessionlessFunc({
  description: 'Reads the text of a document or text file.',
  input: SpindleAssetStepInput,
  func: async ({ kysely, content, variables, studio }, { assetId }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    await extract.documentStep(handle, deps, await extract.loadAsset(handle, assetId))
  },
})

export const spindleProbeMedia = pikkuSessionlessFunc({
  description: 'Looks at a recording or video: how long it is and whether it has sound.',
  input: SpindleAssetStepInput,
  output: SpindleMediaOutput,
  func: async ({ kysely, content, variables, studio }, { assetId }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    const media = await extract.probeStep(handle, deps, await extract.loadAsset(handle, assetId))
    return { hasAudio: media.hasAudio, durationSeconds: media.durationSeconds }
  },
})

export const spindleTranscribe = pikkuSessionlessFunc({
  description: 'Writes down what is said in a recording.',
  input: SpindleAssetStepInput,
  func: async ({ kysely, content, variables, studio }, { assetId }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    await extract.speechStep(handle, deps, await extract.loadAsset(handle, assetId))
  },
})

export const spindlePickFrames = pikkuSessionlessFunc({
  description: 'Picks out the key frames of a video.',
  input: SpindleFramesStepInput,
  func: async ({ kysely, content, variables, studio }, { assetId, durationSeconds }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    await extract.keyframeStep(handle, deps, await extract.loadAsset(handle, assetId), durationSeconds)
  },
})

export const spindleDescribePictures = pikkuSessionlessFunc({
  description: 'Has the vision model describe the pictures; skipped when no model answers.',
  input: SpindleAssetStepInput,
  output: SpindleOkOutput,
  func: async ({ kysely, content, variables, studio }, { assetId }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    return { ok: await extract.describeStep(handle, deps, await extract.loadAsset(handle, assetId)) }
  },
})

export const spindleSummarise = pikkuSessionlessFunc({
  description: 'Writes a short summary; skipped when no model answers.',
  input: SpindleAssetStepInput,
  output: SpindleOkOutput,
  func: async ({ kysely, content, variables, studio }, { assetId }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    return { ok: await extract.summariseStep(handle, deps, await extract.loadAsset(handle, assetId)) }
  },
})

export const spindleChooseCollections = pikkuSessionlessFunc({
  description: 'Chooses the collections that fit; skipped when no model answers.',
  input: SpindleAssetStepInput,
  output: SpindleOkOutput,
  func: async ({ kysely, content, variables, studio }, { assetId }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    return { ok: await extract.placeStep(handle, deps, await extract.loadAsset(handle, assetId)) }
  },
})

export const spindleFinishAsset = pikkuSessionlessFunc({
  description: 'Settles the asset and makes it searchable.',
  input: SpindleAssetStepInput,
  func: async ({ kysely, content, variables, studio }, { assetId }) => {
    const { handle, deps } = await context({ kysely, content, variables, studio } as never)
    await extract.finishAsset(handle, deps, assetId)
  },
})
