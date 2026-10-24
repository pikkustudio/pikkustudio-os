import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { TargetNotAvailableError, sourceKindOf } from '../services/log-source.js'
import { TargetSchema, stageContext } from '../lib/target-sources.js'
import { targetCaller } from '../services/shell-source.js'

export const TargetCallInput = z.object({ key: z.string(), target: TargetSchema, name: z.string(), data: z.unknown().optional() })

export const TargetCallOutput = z.unknown()

export const targetCall = pikkuFunc({
  expose: true,
  description: "Calls a function of a project where a target runs it, through the source contributed for the target's kind. The workspace on this computer is called directly, not through here.",
  input: TargetCallInput,
  output: TargetCallOutput,
  func: async ({ targetSources, studioProjects }, { key, target, name, data }, { session }) => {
    const kind = sourceKindOf(target)
    const source = targetCaller(targetSources, kind)
    const ctx = source ? await stageContext(studioProjects, key, session) : null
    if (!source || !ctx) throw new TargetNotAvailableError(kind)
    return source.call!(ctx, target, name, data)
  },
})
