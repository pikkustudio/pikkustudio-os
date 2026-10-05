import { z } from 'zod'
import { pikkuWorkflowFunc } from '#pikku/addon/workflow'

export const SpindleExtractInput = z.object({ assetId: z.string() })
export const SpindleExtractOutput = z.object({ assetId: z.string() })

export const spindleExtract = pikkuWorkflowFunc({
  description: 'Read a file the way its kind needs, describe and file it, then make it searchable.',
  input: SpindleExtractInput,
  output: SpindleExtractOutput,
  func: async (_services, data, { workflow }) => {
    let summed: { ok: boolean } | undefined
    let media: { hasAudio: boolean; durationSeconds: number } | undefined
    const loaded = await workflow.do('Find out what kind of file it is', 'spindleLoadAsset', { assetId: data.assetId })
    if (loaded.kind === 'document' || loaded.kind === 'text') {
      await workflow.do('Read the text', 'spindleReadDocument', { assetId: data.assetId }, { retries: 0 })
    }
    if (loaded.kind === 'audio' || loaded.kind === 'video') {
      media = await workflow.do('Look at the recording', 'spindleProbeMedia', { assetId: data.assetId }, { retries: 0 })
      if (media!.hasAudio) await workflow.do('Write down what was said', 'spindleTranscribe', { assetId: data.assetId }, { retries: 0 })
      if (loaded.kind === 'video') await workflow.do('Pick out key frames', 'spindlePickFrames', { assetId: data.assetId, durationSeconds: media!.durationSeconds }, { retries: 0 })
    }
    if (loaded.kind === 'image' || loaded.kind === 'video') await workflow.do('Describe the pictures', 'spindleDescribePictures', { assetId: data.assetId }, { retries: 0 })
    summed = await workflow.do('Write a short summary', 'spindleSummarise', { assetId: data.assetId }, { retries: 0 })
    if (summed!.ok) await workflow.do('Choose collections', 'spindleChooseCollections', { assetId: data.assetId }, { retries: 0 })
    await workflow.do('Make it searchable', 'spindleFinishAsset', { assetId: data.assetId }, { retries: 0 })
    return { assetId: data.assetId }
  },
})
