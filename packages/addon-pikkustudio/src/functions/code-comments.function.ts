import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { addReply, addThread, listThreads, resolveThread, storePath } from '../lib/code-comments.js'

export const CodeCommentThread = z.object({
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

export const CodeCommentsInput = z.object({ key: z.string(), path: z.string() })
export const CodeCommentsOutput = z.object({ threads: z.array(CodeCommentThread) })
export const AddCodeCommentInput = z.object({
  key: z.string(),
  path: z.string(),
  lineStart: z.number().int().min(1),
  lineEnd: z.number().int().min(1),
  text: z.string().optional(),
  body: z.string().min(1).max(4000),
})
export const AddCodeCommentOutput = z.object({ changeId: z.string(), shortId: z.string() })
export const ReplyCodeCommentInput = z.object({ key: z.string(), changeId: z.string(), body: z.string().min(1).max(4000) })
export const ResolveCodeCommentInput = z.object({ key: z.string(), changeId: z.string() })
export const CodeCommentChangeOutput = z.object({ changeId: z.string() })

export const codeComments = pikkuSessionlessFunc({
  expose: true,
  description: 'The comment threads pinned to lines of one file, with everything said in each.',
  input: CodeCommentsInput,
  output: CodeCommentsOutput,
  func: async ({ studioProjects }, { key, path }) => ({ threads: await listThreads(await storePath(await studioProjects.projectDir(key)), path) }),
})

export const addCodeComment = pikkuSessionlessFunc({
  expose: true,
  description: 'Start a comment thread on some lines of a file. It is filed as a change the builder will answer.',
  input: AddCodeCommentInput,
  output: AddCodeCommentOutput,
  func: async ({ studioProjects, studioHooks }, { key, ...input }) => {
    const made = await addThread(await storePath(await studioProjects.projectDir(key)), input)
    studioHooks.changed()
    return made
  },
})

export const replyCodeComment = pikkuSessionlessFunc({
  expose: true,
  description: 'Reply on a comment thread.',
  input: ReplyCodeCommentInput,
  output: CodeCommentChangeOutput,
  func: async ({ studioProjects, studioHooks }, { key, ...input }) => {
    const made = await addReply(await storePath(await studioProjects.projectDir(key)), input)
    studioHooks.changed()
    return made
  },
})

export const resolveCodeComment = pikkuSessionlessFunc({
  expose: true,
  description: 'Mark a comment thread as settled.',
  input: ResolveCodeCommentInput,
  output: CodeCommentChangeOutput,
  func: async ({ studioProjects, studioHooks }, { key, changeId }) => {
    const made = await resolveThread(await storePath(await studioProjects.projectDir(key)), changeId)
    studioHooks.changed()
    return made
  },
})
