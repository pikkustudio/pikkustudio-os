import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { Settings } from '../lib/schemas.js'
import { startSession } from '../lib/session.js'

export const UseLocallyInput = z.object({})

export const UseLocallyOutput = Settings

export const useLocally = pikkuSessionlessFunc({
  expose: true,
  description: 'Use Studio without a Pikku Studio Cloud account.',
  input: UseLocallyInput,
  output: UseLocallyOutput,
  func: async ({ studioSettings, auth }, _input, { http }) => {
    await startSession(auth, http)
    return studioSettings.update({ signIn: 'local' })
  },
})
