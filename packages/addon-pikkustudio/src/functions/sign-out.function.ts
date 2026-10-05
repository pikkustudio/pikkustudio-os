import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { Settings } from '../lib/schemas.js'
import { endSession } from '../lib/session.js'

export const SignOutInput = z.object({})

export const SignOutOutput = Settings

export const signOut = pikkuSessionlessFunc({
  description: 'Sign out of Fabric, or stop using Studio locally.',
  input: SignOutInput,
  output: SignOutOutput,
  func: async ({ studioProjects, studioSettings, studioAi, studioHooks, auth }, _input, { http }) => {
    await endSession(auth, http)
    const current = await studioSettings.read()
    if (current.signIn === 'fabric') {
      await studioProjects.signOut()
      studioHooks.changed()
      if ((await studioAi.choice())?.kind === 'fabric') await studioAi.clear()
    }
    return studioSettings.update({ signIn: null })
  },
})
