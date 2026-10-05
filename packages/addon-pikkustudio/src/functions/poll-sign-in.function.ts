import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { startSession } from '../lib/session.js'

export const PollSignInInput = z.object({ code: z.string() })

export const PollSignInOutput = z.object({ status: z.enum(['pending', 'confirmed', 'expired', 'rejected']) })

export const pollSignIn = pikkuSessionlessFunc({
  expose: true,
  description: 'Check whether a Fabric sign-in was confirmed.',
  input: PollSignInInput,
  output: PollSignInOutput,
  func: async ({ studioProjects, studioSettings, studioAi, studioHooks, auth }, { code }, { http }) => {
    const status = await studioProjects.pollSignIn(code)
    if (status === 'confirmed') {
      await startSession(auth, http)
      await studioSettings.update({ signIn: 'fabric' })
      studioHooks.changed()
      if (!(await studioAi.choice())) await studioAi.set({ kind: 'fabric' })
    }
    return { status }
  },
})
