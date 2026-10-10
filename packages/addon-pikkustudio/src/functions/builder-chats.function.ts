import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS } from '@pikku/builder'
import { listChats } from '../services/chats.js'

export const BuilderChatsInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional() })

export const builderChats = pikkuSessionlessFunc({
  expose: true,
  description: 'The chats saved in a project, newest first.',
  input: BuilderChatsInput,
  func: async ({ studioProjects }, { key, specialist }) => {
    const { cwd } = await studioProjects.builderLaunch(key)
    return { chats: await listChats(cwd, specialist) }
  },
})
