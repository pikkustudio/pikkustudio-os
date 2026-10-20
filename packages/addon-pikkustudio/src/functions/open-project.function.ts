import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const OpenProjectInput = z.object({ key: z.string() })

export const openProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Start a project and return where it is served.',
  input: OpenProjectInput,
  func: async ({ studioProjects, studioHooks }, { key }) => {
    // A source's project is started in its workspace, by that workspace's Studio; it's served here through /p/<key>.
    // A workspace that is not up yet is woken by the project's run gate, not here.
    if (!(await studioProjects.inWorkspace(key, 'openProject', {}, null))) await studioProjects.open(key)
    studioHooks.changed()
    return { serverUrl: `/p/${key}` }
  },
})
