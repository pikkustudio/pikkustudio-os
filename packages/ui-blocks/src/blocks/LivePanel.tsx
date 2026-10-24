import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { useDeveloperDetails } from '../lib/developer-details'
import { KeyRound, Radio } from 'lucide-react'
import { Button } from '../ui/button'
import { SidePanel } from './SidePanel'
import { Link } from './Link'
import { PikkuDot } from './PikkuDot'
import { Dot } from './RowCard'
import { ShellCtx } from '../lib/shell'
import { keep, withoutPageParams } from '../lib/links'
import type { Ability, Live } from '../lib/live-connections'

export const abilityLabel = (a: Ability): I18nString =>
  a.kind === 'join' ? m.live_panel__join() : a.kind === 'leave' ? m.live_panel__leave() : a.kind === 'message' ? m.live_panel__message() : asI18n(a.label)

const Label = ({ children }: { children: I18nString }) => <h3 className="text-px14 font-bold text-muted-foreground">{children}</h3>

export function LivePanel({ live: l, notes, onClose }: { live: Live; notes: Record<string, string>; onClose: () => void }) {
  const { say } = useContext(ShellCtx)
  const [technical] = useDeveloperDetails()
  const byId = new Map(l.funcs.map((f) => [f.id, f]))

  return (
    <SidePanel icon={Radio} title={asI18n(l.title)} label={m.live_panel__label({ title: asI18n(l.title) })} onClose={onClose}>
      <section className="flex flex-col gap-1.5">
        <Label>{m.live_panel__what()}</Label>
        <p className="text-px15 text-ink-2">{l.about ? asI18n(l.about) : m.live_screen__no_description()}</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <Label>{m.live_panel__who()}</Label>
        <div className="flex flex-col gap-1.5">
          <Dot tone={l.signin ? 'ok' : 'warn'}>{l.signin ? m.live_panel__who_signin() : m.live_panel__who_open()}</Dot>
          {l.perm ? <Dot tone="ok">{m.live_panel__who_perm()}</Dot> : null}
        </div>
        {l.scopes.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-px13 font-semibold text-muted-foreground">{m.live_panel__scopes()}</span>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {l.scopes.map((s) => (
                <li key={s} className="flex items-start gap-2.5 rounded-lg bg-secondary px-3 py-2">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-card text-muted-foreground">
                    <KeyRound className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-px15">
                    <code className="w-fit max-w-full break-all rounded-md bg-card px-1.5 py-0.5 font-mono text-px13 text-foreground">{asI18n(s)}</code>
                    {notes[s] ? <small className="text-px14 leading-snug text-ink-2">{asI18n(notes[s])}</small> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-1.5">
        <Label>{m.live_panel__can()}</Label>
        {l.abilities.length === 0 ? (
          <p className="text-px15 text-ink-2">{m.live_panel__can_none()}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {l.abilities.map((a) => {
              const f = byId.get(a.funcId)
              return (
                <li key={a.key} className="flex flex-col gap-0.5 rounded-lg bg-secondary px-3 py-2 text-px15">
                  <b>{abilityLabel(a)}</b>
                  {f?.about ? <small className="text-px14 leading-snug text-ink-2">{asI18n(f.about)}</small> : null}
                  {f ? (
                    <Link {...keep} to="/functions" search={((p: object) => ({ ...withoutPageParams(p), fn: f.id })) as never} className="w-fit text-px14 font-semibold text-accent-foreground hover:underline">
                      {m.live_panel__handled_by({ name: asI18n(f.title) })}
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Button variant="hero" size="page" type="button" onClick={() => say(m.live_panel__ask_say({ title: asI18n(l.title) }))}>
        <PikkuDot />
        {m.live_panel__ask()}
      </Button>

      {technical ? (
        <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-xl bg-secondary px-4 py-3">
          {(
            [
              [m.live_panel__tech_name(), l.id],
              [m.live_panel__tech_route(), l.route],
            ] as Array<[I18nString, string]>
          )
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-px14 text-ink-2">{label}</dt>
                <dd className="m-0 min-w-0">
                  <code dir="ltr" className="block font-mono text-px13 break-words">
                    {asI18n(value)}
                  </code>
                </dd>
              </div>
            ))}
        </dl>
      ) : null}
    </SidePanel>
  )
}
