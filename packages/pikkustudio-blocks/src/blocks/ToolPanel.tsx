import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { useDeveloperDetails } from '../lib/developer-details'
import { BookOpen, KeyRound, MessageSquareText, Wrench } from 'lucide-react'
import { Button } from '../ui/button'
import { SidePanel } from './SidePanel'
import { Link } from './Link'
import { PikkuDot } from './PikkuDot'
import { Dot } from './RowCard'
import { Fields } from './FunctionPanel'
import { ShellCtx } from '../lib/shell'
import { keep, withoutPageParams } from '../lib/links'
import { niceName } from '../lib/functions'
import type { Kind, Tool } from '../lib/helper-tools'

export const kindLabel = (k: Kind): I18nString => (k === 'resource' ? m.tools_panel__kind_resource() : k === 'prompt' ? m.tools_panel__kind_prompt() : m.tools_panel__kind_tool())

const Label = ({ children }: { children: I18nString }) => <h3 className="text-px14 font-bold text-muted-foreground">{children}</h3>

export function ToolPanel({ projectKey, tool: t, notes, onClose }: { projectKey: string; tool: Tool; notes: Record<string, string>; onClose: () => void }) {
  const { say } = useContext(ShellCtx)
  const [technical] = useDeveloperDetails()
  const Icon = t.kind === 'resource' ? BookOpen : t.kind === 'prompt' ? MessageSquareText : Wrench

  return (
    <SidePanel icon={Icon} title={asI18n(t.title)} sub={kindLabel(t.kind)} label={m.tools_panel__label({ title: asI18n(t.title) })} onClose={onClose}>
      <section className="flex flex-col gap-1.5">
        <Label>{m.tools_panel__what()}</Label>
        <p className="text-px15 text-ink-2">{t.about ? asI18n(t.about) : m.tools_screen__no_description()}</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <Label>{m.tools_panel__who()}</Label>
        <div className="flex flex-col gap-1.5">
          <Dot tone={t.signin ? 'ok' : 'warn'}>{t.signin ? m.tools_panel__who_signin() : m.tools_panel__who_open()}</Dot>
          {t.perm ? <Dot tone="ok">{m.tools_panel__who_perm()}</Dot> : null}
        </div>
        {t.scopes.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-px13 font-semibold text-muted-foreground">{m.tools_panel__scopes()}</span>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {t.scopes.map((s) => (
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
        <Label>{m.tools_panel__backed()}</Label>
        {t.fn ? (
          <Link {...keep} to="/functions" search={((p: object) => ({ ...withoutPageParams(p), fn: t.fn?.id })) as never} className="w-fit text-px15 font-semibold text-accent-foreground hover:underline">
            {asI18n(t.fn.title)}
          </Link>
        ) : (
          <p className="text-px15 text-ink-2">{m.tools_panel__backed_none()}</p>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <Label>{m.tools_panel__needs()}</Label>
        {t.args.length ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {t.args.map((a) => (
              <li key={a.name} className="flex flex-col rounded-lg bg-secondary px-3 py-1.5">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-px15">{asI18n(niceName(a.name))}</b>
                  <span className="text-px13 text-muted-foreground">{a.needed ? m.tools_panel__needed() : m.tools_panel__optional()}</span>
                </span>
                {a.about ? <small className="text-px14 text-ink-2">{asI18n(a.about)}</small> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Fields projectKey={projectKey} name={t.fn?.fn.inputSchemaName} empty={m.tools_panel__needs_none()} technical={technical} />
        )}
      </section>

      <Button variant="hero" size="page" type="button" onClick={() => say(m.tools_panel__ask_say({ title: asI18n(t.title) }))}>
        <PikkuDot />
        {m.tools_panel__ask()}
      </Button>

      {technical ? (
        <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-xl bg-secondary px-4 py-3">
          {(
            [
              [m.tools_panel__tech_id(), t.id],
              [m.tools_panel__tech_uri(), t.uri],
              [m.tools_panel__tech_function(), t.funcId],
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
