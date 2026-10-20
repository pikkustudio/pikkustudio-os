import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { stageContext } from '../lib/target-sources.js'
import { isOnlineKey } from '../services/projects.js'
import { targetsOf } from '../services/shell-source.js'

export const TargetsInput = z.object({ key: z.string() })

export const TargetsOutput = z.object({
  targets: z.array(
    z.object({
      kind: z.enum(['workspace', 'stage']),
      name: z.string(),
      label: z.string().nullable(),
      live: z.boolean(),
      production: z.boolean(),
      isDefault: z.boolean(),
      branch: z.string().nullable(),
      forChanges: z.boolean(),
    })
  ),
})

export const targets = pikkuFunc({
  expose: true,
  readonly: true,
  description: "Where a project's screens can read from: its workspace on this computer, then each target a contributed source adds (cloud workspaces, published stages).",
  input: TargetsInput,
  output: TargetsOutput,
  func: async ({ targetSources, studioProjects }, { key }, { session }) => {
    const project = isOnlineKey(key) ? null : (await studioProjects.list().catch(() => [])).find((p) => p.key === key)
    const onComputer = !!project && project.location !== 'online'
    const ctx = targetSources ? await stageContext(studioProjects, key, session) : null
    return { targets: await targetsOf(targetSources, onComputer, ctx) }
  },
})
