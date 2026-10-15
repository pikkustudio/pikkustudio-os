import { asI18n } from '@pikku/react'
import { useCallback, useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { HintRow } from './HintRow'
import { frameTransport, type Persona, type PersonaReply, type PersonaTransport } from '../lib/persona-transport'

type Who = { name: string } | null

const askUntilAnswered = async (transport: PersonaTransport): Promise<PersonaReply> => {
  let reply: PersonaReply = { ok: false }
  for (let attempt = 0; attempt < 8 && !reply.ok; attempt++) reply = await transport.list()
  return reply
}

const readWho = async (transport: PersonaTransport): Promise<Who> => {
  const reply = await transport.who()
  return reply.ok && reply.name != null ? { name: reply.name } : null
}

export function ImpersonatePanel({ onSwitched, transport = frameTransport }: { onSwitched: () => void; transport?: PersonaTransport }) {
  const [actors, setActors] = useState<Persona[] | null>(null)
  const [who, setWho] = useState<Who>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    setWho(await readWho(transport))
  }, [transport])

  useEffect(() => {
    let live = true
    askUntilAnswered(transport).then((reply) => live && setActors(reply.actors ?? []))
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
        if (!(await transport.switchTo(actor.id)).ok) throw new Error('switch')
      },
      { name: actor.name },
    )
  const signOut = () =>
    run(
      'out',
      async () => {
        if (!(await transport.signOut()).ok) throw new Error('signout')
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
