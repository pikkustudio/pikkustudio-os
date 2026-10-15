import { asI18n } from '@pikku/react'
import { useCallback, useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { HintRow } from './HintRow'

type Who = { name: string } | null
type Persona = { id: string; name: string; jobTitle: string | null }
type Reply = { ok: boolean; actors?: Persona[]; name?: string | null }

let counter = 0

const askUntilAnswered = async (type: string): Promise<Reply> => {
  let reply: Reply = { ok: false }
  for (let attempt = 0; attempt < 8 && !reply.ok; attempt++) reply = await ask(type)
  return reply
}

const ask = (type: string, extra: Record<string, unknown> = {}): Promise<Reply> =>
  new Promise((resolve) => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe[data-live-app]')
    if (!frame?.contentWindow) return resolve({ ok: false })
    const id = `persona-${++counter}`
    const done = (reply: Reply) => {
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve(reply)
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (event.source === frame.contentWindow && data?.source === 'cloud-preview' && data.type === 'persona-result' && data.id === id) done(data)
    }
    const timer = setTimeout(() => done({ ok: false }), 1500)
    window.addEventListener('message', onMessage)
    frame.contentWindow.postMessage({ source: 'cloud-console', type, id, ...extra }, '*')
  })

const readWho = async (): Promise<Who> => {
  const reply = await ask('persona-who')
  return reply.ok && reply.name != null ? { name: reply.name } : null
}

export function ImpersonatePanel({ onSwitched }: { onSwitched: () => void }) {
  const [actors, setActors] = useState<Persona[] | null>(null)
  const [who, setWho] = useState<Who>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    setWho(await readWho())
  }, [])

  useEffect(() => {
    let live = true
    askUntilAnswered('persona-list').then((reply) => live && setActors(reply.actors ?? []))
    refresh()
    return () => {
      live = false
    }
  }, [refresh])

  const run = async (id: string, action: () => Promise<unknown>, next: Who) => {
    setBusy(id)
    setFailed(false)
    try {
      await action()
      setWho(next)
      onSwitched()
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const switchTo = (actor: Persona) =>
    run(
      actor.id,
      async () => {
        if (!(await ask('persona-switch', { persona: actor.id })).ok) throw new Error('switch')
      },
      { name: actor.name },
    )
  const signOut = () =>
    run(
      'out',
      async () => {
        if (!(await ask('persona-signout')).ok) throw new Error('signout')
      },
      null,
    )

  if (actors === null) return <HintRow icon={UserRound}>{m.impersonate__loading()}</HintRow>
  if (actors.length === 0) return <HintRow icon={UserRound}>{m.impersonate__empty()}</HintRow>

  return (
    <div className="flex flex-col gap-3" data-testid="impersonate-panel">
      <p className="px-1 text-px15 text-ink-2" data-testid="impersonate-who">
        {who ? m.impersonate__viewing({ name: asI18n(who.name) }) : m.impersonate__nobody()}
      </p>
      <ul className="flex flex-col gap-2">
        {actors.map((actor) => (
          <li key={actor.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-card px-3.5 py-3">
            <div className="min-w-0">
              <div className="truncate font-bold">{asI18n(actor.name)}</div>
              {actor.jobTitle ? <div className="truncate text-px15 text-ink-2">{asI18n(actor.jobTitle)}</div> : null}
            </div>
            <Button
              variant={who?.name === actor.name ? 'selected' : 'bordered'}
              size="compact"
              type="button"
              data-testid={`impersonate-persona-${actor.id}`}
              disabled={busy !== null}
              onClick={() => switchTo(actor)}
            >
              {who?.name === actor.name ? m.impersonate__current() : m.impersonate__switch()}
            </Button>
          </li>
        ))}
      </ul>
      {who ? (
        <Button variant="quietMuted" type="button" data-testid="impersonate-signout" disabled={busy !== null} onClick={signOut} className="self-start">
          {m.impersonate__sign_out()}
        </Button>
      ) : null}
      {failed ? <p role="alert" className="px-1 text-px15 text-destructive">{m.impersonate__failed()}</p> : null}
    </div>
  )
}
