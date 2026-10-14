import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { canUseContent } from '../../../permissions/can-use-content.js'
import { ContentSide, contentStore } from '../../../lib/content-store.js'

export const ListContentFilesInput = z.object({
  visibility: ContentSide,
  prefix: z.string().max(1024).default(''),
})

export const ContentFile = z.object({
  bucket: z.string(),
  key: z.string(),
  name: z.string(),
})

export const ListContentFilesOutput = z.object({
  supported: z.boolean(),
  files: z.array(ContentFile),
})

export const listContentFiles = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  permissions: { content: [canUseContent] },
  description: 'Every file on one side of the content store, optionally under a path.',
  input: ListContentFilesInput,
  output: ListContentFilesOutput,
  func: async ({ content }, { visibility, prefix }) => {
    const store = contentStore(content)
    if (!store.listFilesByPrefix) return { supported: false, files: [] }
    const paths = await store.listFilesByPrefix('', prefix, visibility)
    const files = paths.map((path) => {
      const [bucket, ...rest] = path.split('/')
      const key = rest.join('/')
      return { bucket: bucket!, key, name: rest.at(-1) ?? bucket! }
    })
    return { supported: true, files: files.filter((file) => file.key !== '') }
  },
})
