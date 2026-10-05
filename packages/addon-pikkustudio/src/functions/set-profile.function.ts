import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { Settings } from '../lib/schemas.js'

export const SetProfileInput = z.object({ name: z.string().trim().min(1), about: z.string().trim().optional() })

export const SetProfileOutput = Settings

export const setProfile = pikkuSessionlessFunc({
  description: 'Save what to call the person using Studio, and optionally what they do.',
  input: SetProfileInput,
  output: SetProfileOutput,
  func: async ({ studioSettings }, { name, about }) => studioSettings.update({ name, about: about || null }),
})
