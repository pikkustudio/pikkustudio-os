import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS, slotKey } from '@pikku/builder'
import { archiveChat } from '../services/chats.js'

export const BuilderArchiveInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional() })

export const builderArchive = pikkuSessionlessFunc({
  expose: true,
  description: 'Save the builder chat in the project and start a fresh one.',
  input: BuilderArchiveInput,
  func: async ({ studioBuilder, studioProjects }, { key, specialist }) => {
    const slot = slotKey(key, specialist)
    const state = await studioBuilder.state(slot)
    if (state.busy) throw new Error('Pikku is still working. Stop it or wait for it to finish before saving this chat.')
    const { cwd } = await studioProjects.builderLaunch(key)
    await archiveChat(cwd, state.session, state.items, specialist)
    await studioBuilder.clear(slot, false)
    return studioBuilder.state(slot)
  },
})
