import { useCallback, useMemo, useState } from 'react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import type { ChatItem } from './chat'

export type WorkMode = 'build' | 'prototype' | 'artifacts' | 'knowledge'

export const modeForPath = (path: string): WorkMode | null => {
  if (/\/artifacts(\/|$)/.test(path)) return 'artifacts'
  if (/\/prototype$/.test(path)) return 'prototype'
  if (/\/build$/.test(path)) return 'build'
  if (/\/knowledge$/.test(path)) return 'knowledge'
  return null
}

type BuilderItem = { kind: string; text?: string; at: number }

export function useBuilderChat(key: string, mode: WorkMode | null) {
  const state = usePikkuQuery('studio:builderState', { key }, { enabled: !!mode && !!key, refetchInterval: 2000 } as never)
  const prompt = usePikkuMutation('studio:builderPrompt')
  const [local, setLocal] = useState<ChatItem[]>([])
  const [sending, setSending] = useState(false)

  const data = state.data as { busy: boolean; items: BuilderItem[] } | undefined
  const items = useMemo<ChatItem[]>(() => {
    const said: ChatItem[] = (data?.items ?? []).flatMap((item, index): ChatItem[] => {
      if (!item.text) return []
      if (item.kind === 'user') return [{ id: `b${index}`, kind: 'me', text: item.text }]
      if (item.kind === 'assistant') return [{ id: `b${index}`, kind: 'pikku', text: item.text }]
      if (item.kind === 'error') return [{ id: `b${index}`, kind: 'pikku', text: 'Something got in the way. Please try again.' }]
      return []
    })
    return [...said, ...local]
  }, [data, local])

  const push = useCallback((item: { kind: 'me' | 'pikku'; text: string }) => {
    setLocal((x) => [...x, { id: `l${Math.random()}`, ...item }])
  }, [])

  const send = useCallback(
    async (text: string) => {
      if (!mode) return
      setSending(true)
      try {
        await (prompt.mutateAsync as (input: unknown) => Promise<unknown>)({ key, message: text, mode })
        await state.refetch()
      } catch (error) {
        push({ kind: 'pikku', text: (error as Error)?.message || 'Something got in the way. Please try again.' })
      } finally {
        setSending(false)
      }
    },
    [mode, key, prompt.mutateAsync, state.refetch, push],
  )

  const decide = useCallback(async () => {}, [])

  return { items, busy: sending || !!data?.busy, send, decide, push }
}
