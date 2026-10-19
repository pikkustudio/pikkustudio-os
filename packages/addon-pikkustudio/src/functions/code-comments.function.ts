import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { addReply, addThread, listThreads, resolveThread, storePath } from '../lib/code-comments.js'

const Thread = z.object({
  changeId: z.string(),
  shortId: z.string(),
  status: z.string(),
  path: z.string(),
  lineStart: z.number(),
  lineEnd: z.number(),
  text: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(),
  messages: z.array(z.object({ messageId: z.string(), authorKind: z.enum(['agent', 'user']), authorName: z.string().nullable(), body: z.string(), createdAt: z.string() })),
})

export const codeComments = pikkuSessionlessFunc({
  expose: true,
  description: 'The comment threads pinned to lines of one file, with everything said in each.',
  input: z.object({ key: z.string(), path: z.string() }),
  output: z.object({ threads: z.array(Thread) }),
  func: async ({ studioProjects }, { key, path }) => ({ threads: await listThreads(await storePath(await studioProjects.projectDir(key)), path) }),
})

export const addCodeComment = pikkuSessionlessFunc({
  expose: true,
  description: 'Start a comment thread on some lines of a file. It is filed as a change the builder will answer.',
  input: z.object({
    key: z.string(),
    path: z.string(),
    lineStart: z.number().int().min(1),
    lineEnd: z.number().int().min(1),
    text: z.string().optional(),
    body: z.string().min(1).max(4000),
  }),
  output: z.object({ changeId: z.string(), shortId: z.string() }),
  func: async ({ studioProjects, studioHooks }, { key, ...input }) => {
    const made = await addThread(await storePath(await studioProjects.projectDir(key)), input)
    studioHooks.changed()
    return made
  },
})

export const replyCodeComment = pikkuSessionlessFunc({
  expose: true,
  description: 'Reply on a comment thread.',
  input: z.object({ key: z.string(), changeId: z.string(), body: z.string().min(1).max(4000) }),
  output: z.object({ changeId: z.string() }),
  func: async ({ studioProjects, studioHooks }, { key, ...input }) => {
    const made = await addReply(await storePath(await studioProjects.projectDir(key)), input)
    studioHooks.changed()
    return made
  },
})

export const resolveCodeComment = pikkuSessionlessFunc({
  expose: true,
  description: 'Mark a comment thread as settled.',
  input: z.object({ key: z.string(), changeId: z.string() }),
  output: z.object({ changeId: z.string() }),
  func: async ({ studioProjects, studioHooks }, { key, changeId }) => {
    const made = await resolveThread(await storePath(await studioProjects.projectDir(key)), changeId)
    studioHooks.changed()
    return made
  },
})
