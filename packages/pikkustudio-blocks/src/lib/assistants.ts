import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convertDbMessages } from '@pikku/assistant-ui'
import { Bot } from 'lucide-react'
import { ProjectRpcCtx } from './projectRpc'
import type { Assistant, Past, Turn } from '../blocks/AssistantDrawer'

type AgentMeta = { description?: string; summary?: string; model?: string; tools?: string[]; agents?: string[]; scorers?: string[] }
type Thread = { id: string; title?: string; updatedAt: string }
const hues: Assistant['hue'][] = ['petrol', 'teal', 'sea']
const nice = (id: string): I18nString => {
  const label = id.replace(/^.*[:.]/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
  return asI18n(label)
}
const brain = (model: string): I18nString =>
  asI18n(
    model
      .replace(/^.*[/:]/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/(\d) (\d)(?!\d)/g, '$1.$2')
      .replace(/\b[a-z]/g, (c) => c.toUpperCase()),
  )
const turnsOf = (msgs: unknown[]): Turn[] =>
  convertDbMessages(msgs).flatMap((msg): Turn[] => {
    const parts = typeof msg.content === 'string' ? [{ type: 'text' as const, text: msg.content }] : msg.content
    return parts.flatMap((part): Turn[] => {
      if (part.type === 'text' && part.text.trim()) return [[msg.role === 'user' ? 'visitor' : 'me', asI18n(part.text.trim())]]
      if (part.type === 'tool-call') return [['did', m.assistant_drawer__looked_something_up()]]
      return []
    })
  })

export const useAssistants = (key: string) => {
  const invoke = useContext(ProjectRpcCtx)
  return useQuery<Assistant[]>({
    enabled: !!key,
    queryKey: ['project', key, 'assistants'],
    retry: false,
    queryFn: async () => {
      const meta = (await invoke(key, 'console:getAllMeta', {})) as { agentsMeta?: Record<string, AgentMeta> }
      return Promise.all(
        Object.entries(meta.agentsMeta ?? {}).map(async ([id, a], i) => {
          const threads = ((await invoke(key, 'console:getAgentThreads', { agentName: id, limit: 10 })) as Thread[] | null) ?? []
          const history: Past[] = await Promise.all(
            threads.slice(0, 5).map(async (t) => {
              const turns = turnsOf(((await invoke(key, 'console:getAgentThreadMessages', { threadId: t.id })) as unknown[] | null) ?? [])
              const title = t.title
              const when = new Date(t.updatedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              const outcome = turns.at(-1)?.[1].slice(0, 80) ?? ''
              return { id: t.id, who: title ? asI18n(title) : m.assistant_drawer__a_visitor(), when: asI18n(when), outcome: asI18n(outcome), went: 'plain' as const, turns }
            }),
          )
          const description = a.summary ?? a.description
          return {
            id,
            name: nice(id),
            hue: hues[i % hues.length],
            icon: Bot,
            hello: description ? asI18n(description) : m.assistant_drawer__hello_fallback({ name: nice(id).toLowerCase() }),
            does: (a.tools ?? []).map(nice),
            handsOff: (a.agents ?? []).map(nice),
            thinks: a.model ? brain(a.model) : null,
            chats: threads.length,
            check: a.scorers?.length ? a.scorers.map(nice).join(', ') : null,
            history,
          } satisfies Assistant
        }),
      )
    },
  })
}
