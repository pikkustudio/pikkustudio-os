import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { stageContext } from '../lib/target-sources.js'
import { publishStateOf } from '../services/shell-source.js'

export const PublishStateInput = z.object({ key: z.string(), stage: z.string().nullable().optional() })

export const PublishStateOutput = z.object({
  publishState: z
    .object({
      state: z.enum(['live', 'was-live', 'rolled-back', 'failed', 'cancelled', 'working', 'waiting']),
      url: z.string().nullable(),
    })
    .nullable(),
})

export const publishState = pikkuFunc({
  expose: true,
  readonly: true,
  description: "How a project's latest publish stands and where it is live. Null where this host publishes nothing or the project has no release; a stage of null means production.",
  input: PublishStateInput,
  output: PublishStateOutput,
  func: async ({ stageReleases, studioProjects }, { key, stage }, { session }) => {
    const ctx = stageReleases ? await stageContext(studioProjects, key, session) : null
    return { publishState: await publishStateOf(stageReleases, ctx, stage ?? null) }
  },
})
