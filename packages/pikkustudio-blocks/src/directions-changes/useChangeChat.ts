import { useCallback, useMemo, useState } from 'react'
import type { ChatItem } from '../lib/chat'
import { CHANGES } from './data'

export const changeFor = (id: string | undefined) => CHANGES.find((c) => c.id === id)

export function useChangeChat(id: string | undefined) {
  const change = changeFor(id)
  const [sent, setSent] = useState<Record<string, ChatItem[]>>({})
  const items = useMemo<ChatItem[]>(
    () => [
      ...(change?.thread ?? []).map((m, i): ChatItem => ({ id: `t${i}`, kind: m.who === 'you' ? 'me' : 'pikku', text: m.text })),
      ...(sent[id ?? ''] ?? []),
    ],
    [change, sent, id],
  )
  const push = useCallback(
    (item: { kind: 'me' | 'pikku'; text: string }) => setSent((s) => ({ ...s, [id ?? '']: [...(s[id ?? ''] ?? []), { id: `l${Math.random()}`, ...item }] })),
    [id],
  )
  const send = useCallback(async (text: string) => push({ kind: 'me', text }), [push])
  const decide = useCallback(async () => {}, [])
  return { change, items, busy: false, send, decide, push }
}
