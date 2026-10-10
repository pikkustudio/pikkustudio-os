import { asI18n } from '@pikku/react'
import { useCallback, useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { HintRow } from './HintRow'

type Who = { name: string } | null
type Persona = { id: string; name: string; jobTitle: string | null }

const listPersonas = async (apiUrl: string): Promise<Persona[]> => {
  const response = await fetch(`${apiUrl}/auth/sign-in/personas`, { credentials: 'include' })
  if (!response.ok) return []
  return ((await response.json()) as { actors?: Persona[] }).actors ?? []
}

const signInAsPersona = async (apiUrl: string, id: string) => {
  const response = await fetch(`${apiUrl}/auth/sign-in/persona`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) throw new Error(String(response.status))
}

const readWho = async (apiUrl: string): Promise<Who> => {
  try {
    const response = await fetch(`${apiUrl}/auth/get-session`, { credentials: 'include' })
    if (!response.ok) return null
    const body = (await response.json()) as { user?: { name?: string } } | null
    return body?.user ? { name: body.user.name ?? '' } : null
  } catch {
    return null
  }
}

export function ImpersonatePanel({ apiUrl, onSwitched }: { apiUrl: string; onSwitched: () => void }) {
  const [actors, setActors] = useState<Persona[] | null>(null)
  const [who, setWho] = useState<Who>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    setWho(await readWho(apiUrl))
  }, [apiUrl])

  useEffect(() => {
    let live = true
    listPersonas(apiUrl)
      .then((list) => live && setActors(list))
      .catch(() => live && setActors([]))
    refresh()
    return () => {
      live = false
    }
  }, [apiUrl, refresh])

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusy(id)
    setFailed(false)
    try {
      await action()
      await refresh()
      onSwitched()
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const switchTo = (id: string) => run(id, () => signInAsPersona(apiUrl, id))
  const signOut = () =>
    run('out', async () => {
      const response = await fetch(`${apiUrl}/auth/sign-out`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) throw new Error(String(response.status))
    })

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
              onClick={() => switchTo(actor.id)}
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
