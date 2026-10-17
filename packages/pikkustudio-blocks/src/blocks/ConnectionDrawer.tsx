import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState, type FormEvent } from 'react'
import { ChevronDown, KeyRound, Link2, Lock, UserRound } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SidePanel } from './SidePanel'
import { HintNote } from './HintNote'
import { Dot } from './RowCard'
import { useProjectAction } from '../lib/projectRpc'
import type { ConnectedPerson, Connection } from '../lib/connections'

function Person({ p, removing, onRemove }: { p: ConnectedPerson; removing: boolean; onRemove: () => void }) {
  const [sure, setSure] = useState(false)
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-3.5 py-2.5 shadow-card">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2" aria-hidden="true">
        <UserRound className="size-5" />
      </span>
      <b className="min-w-0 flex-1 truncate text-[16px]">{p.name ? asI18n(p.name) : m.connections_screen__someone()}</b>
      {sure ? (
        <span className="flex items-center gap-2">
          <Button type="button" variant="destructive" size="compact" disabled={removing} onClick={() => (onRemove(), setSure(false))}>
            {m.connections_screen__disconnect_them()}
          </Button>
          <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(false)}>
            {m.connections_screen__keep_it()}
          </Button>
        </span>
      ) : (
        <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(true)}>
          {m.connections_screen__disconnect()}
        </Button>
      )}
    </li>
  )
}

export function ConnectionDrawer({
  projectKey,
  c,
  connected,
  people,
  onConnect,
  onChanged,
  onClose,
}: {
  projectKey: string
  c: Connection
  connected: boolean | undefined
  people: ConnectedPerson[]
  onConnect: () => void
  onChanged: () => void
  onClose: () => void
}) {
  const [technical, setTechnical] = useState(false)
  const [sure, setSure] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const save = useProjectAction<{ name: string; value: unknown }>(projectKey, 'admin:credentialSet')
  const remove = useProjectAction<{ name: string; userId?: string }>(projectKey, 'admin:credentialDelete')
  const fields = c.fields.length ? c.fields : [{ id: '', label: '' }]
  const filled = fields.every((f) => (values[f.id] ?? '').length > 0)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!filled) return
    const value = c.fields.length ? Object.fromEntries(c.fields.map((f) => [f.id, values[f.id]])) : values['']
    await save.mutateAsync({ name: c.name, value }).catch(() => null)
    setValues({})
    onChanged()
  }

  const disconnect = (userId?: string) => {
    remove.mutate({ name: c.name, ...(userId ? { userId } : {}) }, { onSuccess: onChanged })
    setSure(false)
  }

  const techName: string = [c.name, c.perPerson ? 'wire' : 'singleton', c.signIn ? 'oauth2' : 'value'].join(' · ')
  const sub = c.perPerson
    ? m.connections_screen__people_connected({ count: people.length })
    : connected
      ? m.connections_screen__connected()
      : m.connections_screen__needs_connecting()

  return (
    <SidePanel icon={c.signIn ? Link2 : KeyRound} label={asI18n(c.label)} title={asI18n(c.label)} sub={sub} onClose={onClose}>
      {c.about ? <p className="text-[16px] text-ink-2">{asI18n(c.about)}</p> : null}

      {c.perPerson ? (
        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-px14 font-bold text-muted-foreground">{m.connections_screen__who_connected()}</h3>
          <p className="px-1 text-[15px] text-ink-2">{m.connections_screen__each_person_text()}</p>
          {people.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {people.map((p) => (
                <Person key={p.userId} p={p} removing={remove.isPending} onRemove={() => disconnect(p.userId)} />
              ))}
            </ul>
          ) : (
            <HintNote>{m.connections_screen__nobody_yet()}</HintNote>
          )}
        </section>
      ) : (
        <>
          <Dot tone={connected ? 'ok' : connected === false ? 'warn' : 'quiet'}>{connected ? m.connections_screen__connected_line() : m.connections_screen__needs_line()}</Dot>
          {c.signIn ? (
            <Button type="button" variant={connected ? 'bordered' : 'default'} size="page" className="self-start" onClick={onConnect}>
              <Link2 className="size-4.5" />
              {connected ? m.connections_screen__connect_again() : m.connections_screen__connect_name({ name: asI18n(c.label) })}
            </Button>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <HintNote>
                <span className="inline-flex items-center gap-2">
                  <Lock className="size-4 shrink-0" />
                  {connected ? m.connections_screen__replaces() : m.connections_screen__kept_locked()}
                </span>
              </HintNote>
              {fields.map((f) => (
                <label key={f.id} className="flex flex-col gap-1">
                  <span className="text-px13 font-bold text-muted-foreground">{f.id ? asI18n(f.label) : m.connections_screen__the_key({ name: asI18n(c.label) })}</span>
                  <Input shape="field" type="password" value={values[f.id] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} autoComplete="off" spellCheck={false} />
                </label>
              ))}
              {save.isError ? (
                <p role="alert" className="text-px15 text-destructive-foreground">
                  {m.connections_screen__save_failed()}
                </p>
              ) : null}
              <Button type="submit" variant={connected ? 'bordered' : 'default'} size="compact" className="self-start" disabled={!filled || save.isPending}>
                {save.isPending ? m.connections_screen__saving() : m.connections_screen__save()}
              </Button>
            </form>
          )}
          {connected ? (
            sure ? (
              <div className="flex flex-col gap-2 rounded-card border border-border bg-secondary p-4">
                <p className="text-[15px] text-ink-2">{m.connections_screen__disconnect_warning({ name: asI18n(c.label) })}</p>
                <span className="flex items-center gap-2">
                  <Button type="button" variant="destructive" size="compact" disabled={remove.isPending} onClick={() => disconnect()}>
                    {m.connections_screen__disconnect_it()}
                  </Button>
                  <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(false)}>
                    {m.connections_screen__keep_it()}
                  </Button>
                </span>
              </div>
            ) : (
              <Button type="button" variant="ghost" size="compactTight" className="self-start" onClick={() => setSure(true)}>
                {m.connections_screen__disconnect()}
              </Button>
            )
          ) : null}
        </>
      )}

      {remove.isError ? (
        <p role="alert" className="text-px15 text-destructive-foreground">
          {m.connections_screen__disconnect_failed()}
        </p>
      ) : null}

      <button type="button" aria-expanded={technical} onClick={() => setTechnical((v) => !v)} className="inline-flex items-center gap-1.5 self-start text-px15 font-semibold text-muted-foreground hover:text-foreground">
        <ChevronDown className={`size-4 transition-transform ${technical ? 'rotate-180' : ''}`} />
        {technical ? m.connections_screen__hide_technical() : m.connections_screen__show_technical()}
      </button>
      {technical ? (
        <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
          <p className="text-px14 text-ink-2">{m.connections_screen__technical_called()}</p>
          <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(techName)}</code>
          {c.perPerson && people.length ? (
            <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(people.map((p) => p.userId).join('\n'))}</code>
          ) : null}
        </div>
      ) : null}
    </SidePanel>
  )
}
