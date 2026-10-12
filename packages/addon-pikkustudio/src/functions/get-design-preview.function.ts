import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const GetDesignPreviewInput = z.object({ key: z.string() })

export const GetDesignPreviewOutput = z
  .object({
    state: z.enum(['starting', 'ready', 'restarting', 'failed', 'stopped']),
    url: z.string(),
    restarts: z.number(),
    lastExit: z.unknown().nullable(),
    logTail: z.string(),
  })
  .nullable()

export const getDesignPreview = pikkuSessionlessFunc({
  expose: true,
  description: "Where a project's design preview is served and whether it is running.",
  input: GetDesignPreviewInput,
  output: GetDesignPreviewOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.designStatus(key),
})
