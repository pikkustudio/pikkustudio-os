import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { ProjectRpcCtx } from './projectRpc'
import type { Assistant, Past, Turn } from '../blocks/AssistantDrawer'

type AgentMeta = { description?: string; tools?: string[]; agents?: string[] }
type Thread = { id: string; title?: string; updatedAt: string }
type Message = { role: string; content?: string | { type: string; text?: string }[] }

const hues: Assistant['hue'][] = ['petrol', 'teal', 'sea']
const nice = (id: string): I18nString => {
  const label = id.replace(/^.*[:.]/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
  return asI18n(label)
}
const text = (c: Message['content']) => (typeof c === 'string' ? c : (c ?? []).map((p) => p.text ?? '').join(' ')).trim()

const turnsOf = (msgs: Message[]): Turn[] =>
  msgs
    .filter((msg) => (msg.role === 'user' || msg.role === 'assistant') && text(msg.content))
    .map((msg): Turn => {
      const said = text(msg.content)
      return [msg.role === 'user' ? 'visitor' : 'me', asI18n(said)]
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
              const turns = turnsOf(((await invoke(key, 'console:getAgentThreadMessages', { threadId: t.id })) as Message[] | null) ?? [])
              const title = t.title
              const when = new Date(t.updatedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              const outcome = turns.at(-1)?.[1].slice(0, 80) ?? ''
              return { id: t.id, who: title ? asI18n(title) : m.assistant_drawer__a_visitor(), when: asI18n(when), outcome: asI18n(outcome), went: 'plain' as const, turns }
            }),
          )
          const description = a.description
          return {
            id,
            name: nice(id),
            hue: hues[i % hues.length],
            icon: Bot,
            hello: description ? asI18n(description) : m.assistant_drawer__hello_fallback({ name: nice(id).toLowerCase() }),
            does: (a.tools ?? []).map(nice),
            handsOff: (a.agents ?? []).map(nice),
            chats: threads.length,
            check: null,
            history,
          } satisfies Assistant
        }),
      )
    },
  })
}
