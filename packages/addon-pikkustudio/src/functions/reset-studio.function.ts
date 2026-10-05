import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { Settings } from '../lib/schemas.js'
import { endSession } from '../lib/session.js'
import { studioHome } from '../services/projects.js'

export const ResetStudioInput = z.object({})

export const ResetStudioOutput = Settings

export const resetStudio = pikkuSessionlessFunc({
  expose: true,
  description: 'Delete everything Studio keeps on this computer (its home folder) and sign out.',
  input: ResetStudioInput,
  output: ResetStudioOutput,
  func: async ({ studioProjects, studioSettings, studioHooks, auth }, _input, { http }) => {
    await endSession(auth, http)
    studioProjects.closeAll()
    await studioProjects.settle()
    const home = studioHome()
    const entries = await readdir(home).catch(() => [] as string[])
    await Promise.all(entries.filter((name) => name !== 'vault.sock').map((name) => rm(join(home, name), { recursive: true, force: true })))
    studioHooks.changed()
    return studioSettings.read()
  },
})
