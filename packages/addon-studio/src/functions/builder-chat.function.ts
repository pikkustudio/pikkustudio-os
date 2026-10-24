import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { getChat } from '../services/chats.js'

export const BuilderChatInput = z.object({ key: z.string(), id: z.string() })

export const builderChat = pikkuSessionlessFunc({
  expose: true,
  description: 'Read one saved chat. Saved chats cannot be changed.',
  input: BuilderChatInput,
  func: async ({ studioProjects }, { key, id }) => {
    const { cwd } = await studioProjects.builderLaunch(key)
    const chat = await getChat(cwd, id)
    if (!chat) throw new Error('That chat could not be found.')
    return chat
  },
})
