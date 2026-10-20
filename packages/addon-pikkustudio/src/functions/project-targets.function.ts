import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { onlineIdOf } from '../services/projects.js'
import { SourceKindSchema, kindsOf } from '../lib/target-sources.js'

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
    const cloudProjectId = onlineIdOf(key) ?? ((await studioProjects.list().catch(() => [])).find((p) => p.key === key)?.cloudProjectId ?? null)
    if (!cloudProjectId) return { kinds, stages: [], sandboxes: [] }
    const ctx = { key, session, project: { cloudProjectId } }
    const [stages, sandboxes] = await Promise.all([stageDirectory.stages(ctx), stageDirectory.sandboxes?.(ctx) ?? Promise.resolve([])])
    return { kinds, stages, sandboxes }
  },
})
