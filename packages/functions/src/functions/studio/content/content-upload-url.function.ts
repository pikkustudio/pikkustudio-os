import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { canUseContent } from '../../../permissions/can-use-content.js'
import { ContentSide, contentStore } from '../../../lib/content-store.js'
import { recordContentAuthor } from '../../../lib/content-index.js'

export const ContentUploadUrlInput = z.object({
  visibility: ContentSide,
  bucket: z.string().min(1).max(256),
  key: z.string().min(1).max(1024),
  contentType: z.string().min(1).max(255),
  size: z.number().int().min(0).optional(),
})

export const ContentUploadUrlOutput = z.object({
  uploadUrl: z.string(),
  uploadMethod: z.enum(['PUT', 'POST']),
  uploadHeaders: z.record(z.string(), z.string()),
})

export const contentUploadUrl = pikkuFunc({
  expose: true,
  auth: true,
  permissions: { content: [canUseContent] },
  description: 'A short-lived link the browser sends a file to, so the file never passes through a function.',
  input: ContentUploadUrlInput,
  output: ContentUploadUrlOutput,
  func: async ({ content }, { visibility, bucket, key, contentType, size }, { session }) => {
    const result = await contentStore(content).getUploadURL({ bucket, fileKey: key, contentType, size, visibility })
    await recordContentAuthor(content, visibility, bucket, key, session?.userId)
    return { uploadUrl: result.uploadUrl, uploadMethod: result.uploadMethod ?? 'PUT', uploadHeaders: result.uploadHeaders ?? {} }
  },
})
