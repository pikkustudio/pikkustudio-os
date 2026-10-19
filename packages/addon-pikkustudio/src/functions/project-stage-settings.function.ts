import { NotFoundError } from '@pikku/core/errors'
import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { stageContext } from '../lib/target-sources.js'

const noCopy = () => new NotFoundError('This project has no published copy here')

export const ProjectStageSettingsInput = z.object({ key: z.string(), stage: z.string(), settingIds: z.array(z.string()) })

export const ProjectStageSettingsOutput = z.object({
  values: z
    .object({
      secretIds: z.array(z.string()),
      settings: z.record(z.string(), z.object({ exists: z.boolean(), value: z.string().nullable() })),
    })
    .nullable(),
})

export const projectStageSettings = pikkuFunc({
  expose: true,
  readonly: true,
  description: "A published copy's secrets (by name only) and settings. Null where this host publishes nothing or there is no such copy.",
  input: ProjectStageSettingsInput,
  output: ProjectStageSettingsOutput,
  func: async ({ stageSettings, studioProjects }, { key, stage, settingIds }, { session }) => {
    const ctx = stageSettings ? await stageContext(studioProjects, key, session) : null
    return { values: ctx ? await stageSettings!.read(ctx, stage, settingIds) : null }
  },
})

export const SaveProjectStageValueInput = z.object({ key: z.string(), stage: z.string(), kind: z.enum(['secret', 'setting']), id: z.string(), value: z.string() })

export const saveProjectStageValue = pikkuFunc({
  expose: true,
  description: "Set one secret or setting on a published copy. A secret is sealed for that copy and never read back.",
  input: SaveProjectStageValueInput,
  output: z.object({}),
  func: async ({ stageSettings, studioProjects }, { key, stage, kind, id, value }, { session }) => {
    const ctx = stageSettings ? await stageContext(studioProjects, key, session) : null
    if (!ctx) throw noCopy()
    if (kind === 'secret') await stageSettings!.saveSecret(ctx, stage, id, value)
    else await stageSettings!.saveSetting(ctx, stage, id, value)
    return {}
  },
})
