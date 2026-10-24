import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ImportProjectInput = z.object({
  url: z.string().describe('Where the project lives: any git address'),
  name: z.string().optional().describe('What to call it here. Defaults to the repository’s name'),
})

export const importProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Bring a project from a git remote onto this computer. The remote stays connected: everything is pushed back to it.',
  input: ImportProjectInput,
  func: async ({ studioProjects }, { url, name }) => studioProjects.importRepo(url, name),
})
