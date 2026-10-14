import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const WorkspaceLinkInput = z.object({ key: z.string() })

export const workspaceLink = pikkuSessionlessFunc({
  expose: true,
  description: 'Where a cloud project’s workspace is served, starting it if it is not running.',
  input: WorkspaceLinkInput,
  func: async ({ studioProjects }, { key }) => {
    const { state, url } = await studioProjects.workspaceLink(key)
    return { state, url }
  },
})
