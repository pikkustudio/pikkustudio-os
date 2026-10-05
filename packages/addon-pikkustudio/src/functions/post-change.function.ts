import { z } from 'zod'
import { runPikku } from '@pikku/builder'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const PostChangeInput = z.object({
  key: z.string(),
  title: z.string().describe('The change wanted, in one line, in the owner’s own words'),
  body: z.string().optional().describe('More detail, if one line is not enough'),
})

export const postChange = pikkuSessionlessFunc({
  description: 'Ask for a change to a project. It is filed and the builder starts on it straight away.',
  input: PostChangeInput,
  approvalRequired: true,
  func: async ({ studioProjects, studioBuilder, studioHooks }, { key, title, body }) => {
    const args = ['changes', 'file', '--title', title, ...(body ? ['--body', body] : []), '-j']
    const { code, output } = await runPikku(await studioProjects.projectDir(key), args)
    if (code !== 0) throw new Error(output.trim().split('\n').pop() || 'That change could not be filed')
    const started = await studioBuilder.startChanges(key)
    studioHooks.changed()
    return started
  },
})
