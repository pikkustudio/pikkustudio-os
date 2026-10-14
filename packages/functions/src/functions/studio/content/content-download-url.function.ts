import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { canUseContent } from '../../../permissions/can-use-content.js'
import { ContentSide, contentStore } from '../../../lib/content-store.js'

export const ContentDownloadUrlInput = z.object({
  visibility: ContentSide,
  bucket: z.string().min(1).max(256),
  key: z.string().min(1).max(1024),
})

export const ContentDownloadUrlOutput = z.object({ url: z.string(), expiresInSeconds: z.number().nullable() })

const HOUR = 3600

export const contentDownloadUrl = pikkuFunc({
  expose: true,
  auth: true,
  permissions: { content: [canUseContent] },
  description: 'A link to a file: signed for the private side, the plain public link for the public side.',
  input: ContentDownloadUrlInput,
  output: ContentDownloadUrlOutput,
  func: async ({ content }, { visibility, bucket, key }) => {
    const store = contentStore(content)
    const expiresInSeconds = visibility === 'private' ? HOUR : null
    if (store.getDownloadURL) {
      return { url: await store.getDownloadURL({ bucket, key, visibility, expiresInSeconds: HOUR }), expiresInSeconds }
    }
    if (!store.signContentKey) throw new Error('This content store cannot make download links')
    const url = await store.signContentKey({ bucket, contentKey: key, visibility, dateLessThan: new Date(Date.now() + HOUR * 1000) })
    return { url, expiresInSeconds }
  },
})
