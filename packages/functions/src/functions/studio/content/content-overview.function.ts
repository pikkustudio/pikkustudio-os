import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { pikkuState } from '@pikku/core/state'
import { canUseContent } from '../../../permissions/can-use-content.js'
import { contentCapabilities, contentStore } from '../../../lib/content-store.js'

export const ContentOverviewInput = z.object({})

export const ContentOwner = z.object({
  folder: z.string(),
  addon: z.string(),
  grants: z.array(z.object({ path: z.string(), mode: z.enum(['read', 'write']) })),
  wholeStore: z.string().nullable(),
})

export const ContentOverviewOutput = z.object({
  canList: z.boolean(),
  canRemoveFolders: z.boolean(),
  canDownload: z.boolean(),
  owners: z.array(ContentOwner),
})

type WiredAddon = {
  contentBucket?: string
  contentGrants?: Record<string, 'read' | 'write'>
  globalContent?: string
}

export const contentOverview = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  permissions: { content: [canUseContent] },
  description: 'What the content store can do here, and which addon owns each folder in it.',
  input: ContentOverviewInput,
  output: ContentOverviewOutput,
  func: async ({ content }) => {
    const capabilities = contentCapabilities(contentStore(content))
    const wired = pikkuState(null, 'addons', 'packages') as Map<string, WiredAddon>
    const owners = [...wired.entries()].map(([name, config]) => ({
      folder: config.contentBucket ?? name,
      addon: name,
      grants: Object.entries(config.contentGrants ?? {}).map(([path, mode]) => ({ path, mode })),
      wholeStore: config.globalContent ?? null,
    }))
    return { ...capabilities, owners }
  },
})
