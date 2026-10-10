import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { getLocale } from '@/paraglide/runtime.js'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type ChatEvent = { type: string; [key: string]: unknown }
export type ChatTransport = (path: string, body: unknown) => AsyncIterable<ChatEvent>

export type ChatItem =
  | { id: string; kind: 'me' | 'pikku'; text: string }
  | { id: string; kind: 'error'; detail: string; retry?: boolean }
  | { id: string; kind: 'card'; toolCallId: string; runId: string; title: I18nString; detail: I18nString; state: 'ask' | 'working' | 'done' | 'declined'; yes?: I18nString; no?: I18nString; options?: I18nString[]; tone?: 'info' | 'attention' | 'danger' }

export const fetchTransport = (base: string): ChatTransport =>
  async function* (path, body) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok || !res.body) throw new Error(`chat ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.startsWith('data: '))
        if (line) yield JSON.parse(line.slice(6)) as ChatEvent
      }
    }
  }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const mockTransport: ChatTransport = async function* (path, body) {
  const text = String((body as { message?: string }).message ?? '')
  const say = async function* (reply: string) {
    const messageId = `m${Math.random()}`
    yield { type: 'TEXT_MESSAGE_START', messageId }
    for (const word of reply.split(' ')) {
      await sleep(40)
      yield { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: `${word} ` }
    }
    yield { type: 'TEXT_MESSAGE_END', messageId }
  }
  if (path.endsWith('/resume')) {
    if ((body as { approved?: boolean }).approved) yield* say('Done. I have filed that for the builder to pick up. Nothing on your site changes until it is built and you see it.')
    else yield* say('Okay, I left that alone.')
    yield { type: 'RUN_FINISHED' }
    return
  }
  if (/change|add|make|fix|footer|bigger|write/i.test(text)) {
    yield* say('I can ask for that.')
    yield {
      type: 'CUSTOM',
      name: 'pikku:approval-request',
      value: { toolCallId: `t${Math.random()}`, toolName: 'studio__postChange', runId: 'run-mock', args: { title: text.slice(0, 80), body: text } },
    }
  } else {
    yield* say('Good question. I will look into that and tell you what I find. I will not change anything until you say so.')
  }
  yield { type: 'RUN_FINISHED' }
}

export const ChatTransportCtx = createContext<ChatTransport>(mockTransport)
export const ProjectChatTransportCtx = createContext<ChatTransport>(mockTransport)

const cardFor = (value: { toolName: string; args: Record<string, unknown> }) => {
  if (value.toolName.endsWith('postChange')) {
    const title = String(value.args.title ?? '')
    const detail = String(value.args.body ?? '')
    return { title: title ? asI18n(title) : m.chat__a_change(), detail: asI18n(detail) }
  }
  const detail = JSON.stringify(value.args)
  return { title: m.chat__wants_to_do_something(), detail: asI18n(detail) }
}

export const usePikkuChat = (projectKey: string) => {
  const transport = useContext(ChatTransportCtx)
  const [items, setItems] = useState<ChatItem[]>([])
  const [busy, setBusy] = useState(false)
  const thread = useRef(`studio-${Math.random().toString(36).slice(2)}`)

  const push = useCallback((item: { kind: 'me' | 'pikku'; text: string }) => {
    setItems((x) => [...x, { id: `i${Math.random()}`, ...item }])
  }, [])

  const run = useCallback(
    async (path: string, body: unknown) => {
      setBusy(true)
      try {
        for await (const e of transport(path, body)) {
          if (e.type === 'TEXT_MESSAGE_START') setItems((x) => [...x, { id: String(e.messageId), kind: 'pikku', text: '' }])
          else if (e.type === 'TEXT_MESSAGE_CONTENT') setItems((x) => x.map((i) => (i.id === e.messageId && i.kind === 'pikku' ? { ...i, text: i.text + String(e.delta) } : i)))
          else if (e.type === 'CUSTOM' && e.name === 'pikku:approval-request') {
            const v = e.value as { toolCallId: string; toolName: string; runId: string; args: Record<string, unknown> }
            setItems((x) => [...x, { id: `c${v.toolCallId}`, kind: 'card', toolCallId: v.toolCallId, runId: v.runId, state: 'ask', ...cardFor(v) }])
          } else if (e.type === 'RUN_ERROR') push({ kind: 'pikku', text: /Choose an AI/.test(String(e.message)) ? m.chat__cannot_chat_yet() : m.chat__went_wrong() })
        }
      } catch {
        push({ kind: 'pikku', text: m.chat__unreachable() })
      } finally {
        setItems((x) => x.filter((i) => !(i.kind === 'pikku' && !i.text.trim())))
        setBusy(false)
      }
    },
    [transport, push],
  )

  const send = useCallback(
    (text: string) => {
      push({ kind: 'me', text })
      const language = new Intl.DisplayNames(['en'], { type: 'language' }).of(getLocale())
      const context = `${projectKey ? `(The owner is working in the project with key ${projectKey}.) ` : ''}(The owner reads ${language}: answer in ${language}.) `
      return run('/rpc/agent/pikku/stream', { message: `${context}${text}`, threadId: thread.current, resourceId: 'studio' })
    },
    [push, run, projectKey],
  )

  const decide = useCallback(
    async (id: string, approved: boolean) => {
      const card = items.find((i) => i.id === id)
      if (!card || card.kind !== 'card') return
      setItems((x) => x.map((i) => (i.id === id && i.kind === 'card' ? { ...i, state: approved ? 'working' : 'declined' } : i)))
      await run('/rpc/agent/pikku/resume', { runId: card.runId, toolCallId: card.toolCallId, approved })
      if (approved) setItems((x) => x.map((i) => (i.id === id && i.kind === 'card' ? { ...i, state: 'done' } : i)))
    },
    [items, run],
  )

  return { items, busy, send, decide, push }
}
