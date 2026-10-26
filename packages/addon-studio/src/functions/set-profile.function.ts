import { z } from 'zod'
import { UnauthorizedError } from '@pikku/core/errors'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { Profile } from '../lib/schemas.js'

export const SetProfileInput = z.object({ name: z.string().trim().min(1), about: z.string().trim().optional() })

export const SetProfileOutput = Profile

export const setProfile = pikkuSessionlessFunc({
  expose: true,
  description: 'Save what to call the person using Studio, and optionally what they do. Kept on their own user.',
  input: SetProfileInput,
  output: SetProfileOutput,
  func: async ({ studioProfile }, { name, about }, { session }) => {
    if (!session?.userId) throw new UnauthorizedError()
    return studioProfile.write(session.userId, { name, about: about || null })
  },
})
