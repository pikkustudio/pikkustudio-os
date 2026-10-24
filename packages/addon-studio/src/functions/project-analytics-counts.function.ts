import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { stageContext } from '../lib/target-sources.js'

export const ProjectAnalyticsCountsInput = z.object({ key: z.string(), stage: z.string(), days: z.number().int().min(1).max(90) })

export const ProjectAnalyticsCountsOutput = z.object({
  counts: z.array(z.object({ name: z.string(), total: z.number(), signedIn: z.number(), series: z.array(z.object({ day: z.string(), count: z.number() })) })).nullable(),
})

export const projectAnalyticsCounts = pikkuFunc({
  expose: true,
  readonly: true,
  description: 'How often each analytics event fired on a published copy over the last days, and how many of those were by signed-in people. Null when that copy is not published.',
  input: ProjectAnalyticsCountsInput,
  output: ProjectAnalyticsCountsOutput,
  func: async ({ stageAnalytics, studioProjects }, { key, stage, days }, { session }) => {
    const ctx = stageAnalytics ? await stageContext(studioProjects, key, session) : null
    return { counts: ctx ? await stageAnalytics!.counts(ctx, stage, days) : null }
  },
})
