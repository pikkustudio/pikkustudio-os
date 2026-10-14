import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { canUseContent } from '../../../permissions/can-use-content.js'
import { ContentSide, contentStore } from '../../../lib/content-store.js'

export const DeleteContentFileInput = z.object({
  visibility: ContentSide,
  bucket: z.string().min(1).max(256),
  key: z.string().min(1).max(1024),
})

export const DeleteContentFileOutput = z.object({ removed: z.boolean() })

export const deleteContentFile = pikkuFunc({
  expose: true,
  auth: true,
  permissions: { content: [canUseContent] },
  description: 'Remove one file from the content store.',
  input: DeleteContentFileInput,
  output: DeleteContentFileOutput,
  func: async ({ content }, { visibility, bucket, key }) => ({
    removed: await contentStore(content).deleteFile({ bucket, key, visibility }),
  }),
})
