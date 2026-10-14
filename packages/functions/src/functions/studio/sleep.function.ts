import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'
import { UnauthorizedError } from '@pikku/core/errors'
import { isServiceToken, setSleepSettings as writeSettings, sleepReadiness as readiness, sleepSettings as readSettings } from '../../lib/sleep.js'

const SleepChecks = z.object({ access: z.boolean(), builder: z.boolean() })

export const SleepSettingsOutput = z.object({ idleMinutes: z.number(), checks: SleepChecks })

export const SleepReadinessInput = z.object({})

export const SleepReadinessOutput = z.object({
  canSleep: z.boolean(),
  blockers: z.array(z.object({ check: z.string(), reason: z.string() })),
})

export const sleepReadiness = pikkuSessionlessFunc({
  description: 'Whether Studio can be put to sleep now, and what is keeping it awake.',
  input: SleepReadinessInput,
  output: SleepReadinessOutput,
  func: async ({ studio }, _input, { session, http }) => {
    if (!session && !isServiceToken(http?.request?.header('authorization'))) throw new UnauthorizedError()
    return readiness(studio)
  },
})

export const SleepSettingsInput = z.object({})

export const sleepSettings = pikkuSessionlessFunc({
  description: 'When Studio may be put to sleep.',
  input: SleepSettingsInput,
  output: SleepSettingsOutput,
  func: async ({ studio }) => readSettings(studio),
})

export const SetSleepSettingsInput = z.object({
  idleMinutes: z.number().int().min(1).optional(),
  checks: SleepChecks.partial().optional(),
})

export const setSleepSettings = pikkuSessionlessFunc({
  description: 'Change when Studio may be put to sleep.',
  input: SetSleepSettingsInput,
  output: SleepSettingsOutput,
  func: async ({ studio }, input) => writeSettings(studio, input),
})
