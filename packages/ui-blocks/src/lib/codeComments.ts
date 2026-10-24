import { createContext, useContext } from 'react'
import { usePikkuRPC } from '@pikku/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type CommentMessage = { messageId: string; authorKind: 'agent' | 'user'; authorName: string | null; body: string; createdAt: string }

export type CodeThread = {
  changeId: string
  shortId: string
  status: string
  path: string
  lineStart: number
  lineEnd: number
  text: string | null
  body: string
  createdAt: string
  messages: CommentMessage[]
}

export type NewComment = { path: string; lineStart: number; lineEnd: number; text?: string; body: string }

export const anchorOf = (path: string, lineStart: number, lineEnd: number) => (lineEnd > lineStart ? `${path}:${lineStart}-${lineEnd}` : `${path}:${lineStart}`)

export const parseAnchor = (anchor: string | null | undefined) => {
  const hit = /^(.+):(\d+)(?:-(\d+))?$/.exec(anchor ?? '')
  return hit ? { path: hit[1]!, lineStart: Number(hit[2]), lineEnd: Number(hit[3] ?? hit[2]) } : null
}

export const commentBody = (path: string, lineStart: number, lineEnd: number, text: string | undefined, comment: string) =>
  [
    `Comment on ${path}, ${lineEnd > lineStart ? `lines ${lineStart}-${lineEnd}` : `line ${lineStart}`}:`,
    ...(text ? ['', ...text.split('\n').slice(0, 20).map((line) => `> ${line}`)] : []),
    '',
    comment,
  ].join('\n')

export const piIsWorking = (status: string) => status === 'claimed' || status === 'in_progress'

export type CommentInvoke = (name: string, data: unknown) => Promise<any>

export const CommentInvokeCtx = createContext<CommentInvoke | null>(null)

export function useCodeThreads(projectKey: string, path: string) {
  const rpc = usePikkuRPC<{ invoke: CommentInvoke }>()
  const custom = useContext(CommentInvokeCtx)
  const invoke: CommentInvoke = custom ?? ((name, data) => rpc.invoke(name, data))
  const client = useQueryClient()
  const scope = ['code-comments', custom ? 'linked' : 'local', projectKey]
  const refresh = { onSuccess: () => client.invalidateQueries({ queryKey: scope }) }
  const query = useQuery<{ threads: CodeThread[] }>({
    queryKey: [...scope, path],
    queryFn: () => invoke('studio:codeComments', { key: projectKey, path }),
    refetchInterval: 5000,
    retry: false,
    meta: { handlesErrors: true },
  })
  const add = useMutation({ mutationFn: (input: NewComment) => invoke('studio:addCodeComment', { key: projectKey, ...input }) as Promise<{ changeId: string }>, ...refresh })
  const reply = useMutation({ mutationFn: (input: { changeId: string; body: string }) => invoke('studio:replyCodeComment', { key: projectKey, ...input }), ...refresh })
  const resolve = useMutation({ mutationFn: (input: { changeId: string }) => invoke('studio:resolveCodeComment', { key: projectKey, ...input }), ...refresh })
  return {
    query,
    threads: query.data?.threads ?? [],
    add: (input: NewComment, onDone: (changeId: string) => void) => add.mutate(input, { onSuccess: (r) => onDone(r.changeId) }),
    reply: (changeId: string, body: string, onDone: () => void) => reply.mutate({ changeId, body }, { onSuccess: onDone }),
    resolve: (changeId: string, onDone: () => void) => resolve.mutate({ changeId }, { onSuccess: onDone }),
    adding: add,
    replying: reply,
    resolving: resolve,
  }
}

export const commentOf = (body: string) => {
  if (!body.startsWith('Comment on ')) return body
  const lines = body.split('\n').slice(2)
  while (lines[0]?.startsWith('> ')) lines.shift()
  if (lines[0] === '') lines.shift()
  return lines.join('\n')
}
