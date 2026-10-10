import { m } from '@/i18n/messages'
import { useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { asI18n } from '@pikku/react'
import type { ChatItem } from './chat'

export const OFFER_MARKER = '[[offer:changeset]]'

const ASK_PATTERN = /\[\[ask:(\{.*\})\]\]/s

export const stripMarkers = (text: string) => text.split(OFFER_MARKER).join('').replace(ASK_PATTERN, '').trim()

const parseAsk = (text: string): { question: string; options: string[]; tone: 'info' | 'attention' | 'danger' } | null => {
  const raw = ASK_PATTERN.exec(text)?.[1]
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as { question?: unknown; options?: unknown; tone?: unknown }
    if (typeof v.question !== 'string' || !v.question.trim()) return null
    return { question: v.question.trim(), tone: v.tone === 'attention' || v.tone === 'danger' ? v.tone : 'info', options: Array.isArray(v.options) ? v.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).slice(0, 4) : [] }
  } catch {
    return null
  }
}

export type WorkMode = 'build' | 'frontend' | 'artifacts' | 'knowledge' | 'emails'

export const SCREEN_SPECIALIST: ReadonlyArray<readonly [RegExp, WorkMode]> = [
  [/\/artifacts(\/|$)/, 'artifacts'],
  [/\/design$/, 'frontend'],
  [/\/knowledge$/, 'knowledge'],
  [/\/emails$/, 'emails'],
]

export const modeForPath = (path: string): WorkMode | null => SCREEN_SPECIALIST.find(([screen]) => screen.test(path))?.[1] ?? null

const TIMED_OUT = /timed out|took too long/i

type BuilderItem = { kind: string; text?: string; at: number }

export function useBuilderChat(key: string, mode: WorkMode | null) {
  const state = usePikkuQuery('studio:builderState', { key, specialist: mode ?? undefined }, { enabled: !!mode && !!key, refetchInterval: 2000 } as never)
  const prompt = usePikkuMutation('studio:builderPrompt')
  const archiveChat = usePikkuMutation('studio:builderArchive')
  const [local, setLocal] = useState<ChatItem[]>([])
  const [sending, setSending] = useState(false)
  useEffect(() => setLocal([]), [mode])

  const data = state.data as { busy: boolean; items: BuilderItem[] } | undefined
  const items = useMemo<ChatItem[]>(() => {
    const all = data?.items ?? []
    const closing = (index: number) => {
      for (let n = index + 1; n < all.length; n++) {
        if (all[n].kind === 'user') return true
        if (all[n].kind === 'assistant' && all[n].text) return false
      }
      return true
    }
    const said: ChatItem[] = all.flatMap((item, index): ChatItem[] => {
      if (!item.text) return []
      if (item.kind === 'assistant' && !closing(index)) return []
      if (item.kind === 'user') return [{ id: `b${index}`, kind: 'me', text: item.text }]
      if (item.kind === 'assistant') {
        return [{ id: `b${index}`, kind: 'pikku', text: item.text }]
      }
      if (item.kind === 'error') return [{ id: `b${index}`, kind: 'error', detail: item.text, retry: TIMED_OUT.test(item.text) }]
      return []
    })
    const last = (data?.items ?? []).at(-1)
    const offered = !!last?.text && last.kind === 'assistant' && last.text.includes(OFFER_MARKER)
    const clean = said.map((i) => (i.kind === 'pikku' ? { ...i, text: stripMarkers(i.text) } : i))
    const asked = last?.text && last.kind === 'assistant' ? parseAsk(last.text) : null
    const card: ChatItem[] = asked
      ? [{ id: 'ask', kind: 'card', toolCallId: 'ask', runId: 'ask', title: asI18n(asked.question), detail: asI18n(asked.question), state: 'ask', options: asked.options.map((o) => asI18n(o)), tone: asked.tone }]
      : offered
      ? [{ id: 'offer', kind: 'card', toolCallId: 'offer', runId: 'offer', title: m.builder_chat__bigger_title(), detail: m.builder_chat__bigger_detail(), state: 'ask', yes: m.builder_chat__add_to_queue(), no: m.builder_chat__do_it_now() }]
      : []
    return [...clean.filter((i) => i.kind !== 'pikku' || i.text), ...card, ...local]
  }, [data, local])

  const push = useCallback((item: { kind: 'me' | 'pikku'; text: string }) => {
    setLocal((x) => [...x, { id: `l${Math.random()}`, ...item }])
  }, [])

  const send = useCallback(
    async (text: string) => {
      const experiment = text.match(/^\/experiment(?:\s+([\s\S]*))?$/)
      if (!mode && !experiment) return
      if (experiment && !experiment[1]?.trim()) {
        setLocal((x) => [...x, { id: `l${Math.random()}`, kind: 'pikku', text: m.builder_chat__experiment_empty() }])
        return
      }
      setSending(true)
      try {
        const input = experiment ? { key, message: text.trim(), explore: true, mode: mode ?? undefined } : { key, message: text, mode, offer: mode === 'build' }
        await (prompt.mutateAsync as (input: unknown) => Promise<unknown>)(input)
        await state.refetch()
      } catch (error) {
        setLocal((x) => [...x, { id: `l${Math.random()}`, kind: 'error', detail: (error as Error)?.message ?? '', retry: TIMED_OUT.test((error as Error)?.message ?? '') }])
      } finally {
        setSending(false)
      }
    },
    [mode, key, prompt.mutateAsync, state.refetch, push],
  )

  const archive = useCallback(async () => {
    try {
      await (archiveChat.mutateAsync as (input: unknown) => Promise<unknown>)({ key, specialist: mode ?? undefined })
      setLocal([])
      await state.refetch()
    } catch (error) {
      setLocal((x) => [...x, { id: `l${Math.random()}`, kind: 'error', detail: (error as Error)?.message ?? '' }])
    }
  }, [key, mode, archiveChat.mutateAsync, state.refetch])

  const decide = useCallback(
    async (id: string, yes: boolean) => {
      if (id === 'offer') await send(yes ? m.builder_chat__say_add_to_queue() : m.builder_chat__say_do_it_now())
    },
    [send],
  )

  return { items, busy: sending || !!data?.busy, send, decide, push, archive, archiving: archiveChat.isPending, canArchive: !!mode && !sending && !data?.busy && !archiveChat.isPending && (data?.items ?? []).some((i) => !!i.text && (i.kind === 'user' || i.kind === 'assistant')) }
}

export type SavedChat = { id: string; title: string; at: number }
export type SavedChatFull = SavedChat & { items: BuilderItem[] }

export const useSavedChats = (key: string, enabled: boolean) => {
  const specialist = useLocation({ select: (l) => modeForPath(l.pathname) ?? undefined })
  return usePikkuQuery('studio:builderChats', { key, specialist }, { enabled: enabled && !!key } as never) as unknown as { data?: { chats: SavedChat[] }; isPending: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => unknown }
}

export const useSavedChat = (key: string, id: string | null) =>
  usePikkuQuery('studio:builderChat', { key, id: id ?? '' }, { enabled: !!id && !!key } as never) as unknown as { data?: SavedChatFull; isPending: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => unknown }
