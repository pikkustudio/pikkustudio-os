import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { canUseContent } from '../../../permissions/can-use-content.js'
import { ContentSide, contentStore } from '../../../lib/content-store.js'

export const DeleteContentFolderInput = z.object({
  visibility: ContentSide,
  bucket: z.string().min(1).max(256),
  prefix: z.string().max(1024).default(''),
})

export const DeleteContentFolderOutput = z.object({ removed: z.number() })

export const deleteContentFolder = pikkuFunc({
  expose: true,
  auth: true,
  permissions: { content: [canUseContent] },
  description: 'Remove every file under a folder and say how many went.',
  input: DeleteContentFolderInput,
  output: DeleteContentFolderOutput,
  func: async ({ content }, { visibility, bucket, prefix }) => {
    const store = contentStore(content)
    if (store.deleteByPrefix) return { removed: await store.deleteByPrefix(bucket, prefix, visibility) }
    if (!store.listFilesByPrefix) throw new Error('This content store cannot remove folders')
    let removed = 0
    for (const key of await store.listFilesByPrefix(bucket, prefix, visibility)) {
      if (await store.deleteFile({ bucket, key, visibility })) removed++
    }
    return { removed }
  },
})
