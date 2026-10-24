import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { SourceKindSchema, kindsOf, stageContext } from '../lib/target-sources.js'

export const ProjectTargetsInput = z.object({ key: z.string() })

const Entry = z.object({ name: z.string(), label: z.string().optional(), production: z.boolean(), live: z.boolean() })

export const ProjectTargetsOutput = z.object({
  kinds: z.array(SourceKindSchema),
  stages: z.array(Entry),
  sandboxes: z.array(Entry),
})

export const projectTargets = pikkuFunc({
  expose: true,
  readonly: true,
  description: 'Where logs and metrics can be read from for a project: the kinds this host knows, and the published stages and cloud sandboxes it can see.',
  input: ProjectTargetsInput,
  output: ProjectTargetsOutput,
  func: async ({ logSources, metricSources, stageDirectory, studioProjects }, { key }, { session }) => {
    const kinds = kindsOf(logSources, metricSources)
    if (!stageDirectory) return { kinds, stages: [], sandboxes: [] }
    const ctx = await stageContext(studioProjects, key, session)
    if (!ctx) return { kinds, stages: [], sandboxes: [] }
    const [stages, sandboxes] = await Promise.all([stageDirectory.stages(ctx), stageDirectory.sandboxes?.(ctx) ?? Promise.resolve([])])
    return { kinds, stages, sandboxes }
  },
})
