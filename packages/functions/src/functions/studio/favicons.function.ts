import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'
import { frontendDir, resolveLogo, writeFavicons } from '../../lib/favicons.js'

export const MakeFaviconsInput = z.object({
  key: z.string(),
  source: z.string(),
  app: z.string().optional(),
  background: z.string().optional(),
})

export const makeFavicons = pikkuSessionlessFunc({
  description: "Turn a project's logo into its favicon and app icons.",
  input: MakeFaviconsInput,
  func: async ({ studio }, { key, source, app, background }) => {
    const projectDir = await studio.projects.projectDir(key)
    const appDir = await frontendDir(projectDir, app)
    const logoPath = resolveLogo(projectDir, appDir, source)
    if (!logoPath) {
      throw new Error(`Logo not found: ${source} (looked in the app, its public folder and the project root)`)
    }
    return writeFavicons({ logoPath, appDir, background: background?.trim() || '#ffffff' })
  },
})
