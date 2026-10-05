import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const LinkRemoteInput = z.object({ key: z.string(), url: z.string().describe('Any git address') })

export const linkRemote = pikkuSessionlessFunc({
  description: 'Connect a project on this computer to a git remote and send every branch there.',
  input: LinkRemoteInput,
  output: z.object({ pushed: z.boolean(), remote: z.string(), branches: z.array(z.string()) }),
  func: async ({ studioProjects }, { key, url }) => studioProjects.linkRepo(key, url),
})
