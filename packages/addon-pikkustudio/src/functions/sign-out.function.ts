import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { Settings } from '../lib/schemas.js'
import { endSession } from '../lib/session.js'

export const SignOutInput = z.object({})

export const SignOutOutput = Settings

export const signOut = pikkuSessionlessFunc({
  expose: true,
  description: 'Sign out of Pikku Studio Cloud, or stop using Studio locally.',
  input: SignOutInput,
  output: SignOutOutput,
  func: async ({ studioProjects, studioSettings, studioAi, studioHooks, auth }, _input, { http }) => {
    await endSession(auth, http)
    const current = await studioSettings.read()
    if (current.signIn === 'cloud') {
      await studioProjects.signOut()
      studioHooks.changed()
      if ((await studioAi.choice())?.kind === 'cloud') await studioAi.clear()
    }
    return studioSettings.update({ signIn: null })
  },
})
