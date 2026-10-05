import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const StartSignInInput = z.object({})

export const startSignIn = pikkuSessionlessFunc({
  description: 'Start signing in to Fabric with a device code.',
  input: StartSignInInput,
  func: async ({ studioProjects }) => studioProjects.startSignIn(),
})
