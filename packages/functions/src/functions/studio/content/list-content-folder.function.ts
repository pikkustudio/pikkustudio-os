import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { canUseContent } from '../../../permissions/can-use-content.js'
import { ContentSide } from '../../../lib/content-store.js'
import { listContentFolder as list } from '../../../lib/content-index.js'

export const ListContentFolderInput = z.object({
  visibility: ContentSide,
  path: z.string().max(1024).default(''),
  limit: z.number().int().min(1).max(500).default(200),
  cursor: z.string().optional(),
})

export const ListContentFolderOutput = z.object({
  supported: z.boolean(),
  folders: z.array(z.object({ name: z.string(), fileCount: z.number(), totalBytes: z.number(), lastChanged: z.string().nullable() })),
  files: z.array(
    z.object({
      name: z.string(),
      bucket: z.string(),
      key: z.string(),
      contentType: z.string().nullable(),
      sizeBytes: z.number(),
      createdAt: z.string(),
      changedAt: z.string(),
      createdBy: z.object({ id: z.string(), you: z.boolean() }).nullable(),
      changedBy: z.object({ id: z.string(), you: z.boolean() }).nullable(),
    })
  ),
  nextCursor: z.string().nullable(),
})

export const listContentFolder = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  permissions: { content: [canUseContent] },
  description: 'One level of the content store: its folders with their size, and a page of its files with size, dates and who added them.',
  input: ListContentFolderInput,
  output: ListContentFolderOutput,
  func: async ({ content }, { visibility, path, limit, cursor }, { session }) => {
    const result = await list(content, visibility, path, limit, cursor)
    const who = (id: string | undefined) => (id ? { id, you: id === session?.userId } : null)
    return {
      ...result,
      files: result.files.map(({ author, ...file }) => ({ ...file, createdBy: who(author?.by), changedBy: who(author?.updatedBy) })),
    }
  },
})
