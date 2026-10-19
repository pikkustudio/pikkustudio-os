import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, type ReactNode } from 'react'
import { useDeveloperDetails } from '../lib/developer-details'
import { Bot, Clock, Globe, KeyRound, Layers, Lock, Radio, SquareTerminal, Workflow as WorkflowIcon, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { SidePanel } from './SidePanel'
import { Link } from './Link'
import { PikkuDot } from './PikkuDot'
import { Dot } from './RowCard'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'
import { fieldsOfSchema, useSchema } from '../lib/surface'
import { niceName, type Entry, type FunctionsMeta, type Reach } from '../lib/functions'

const Label = ({ children }: { children: I18nString }) => <h3 className="text-px14 font-bold text-muted-foreground">{children}</h3>

const Block = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-1.5">
    <Label>{title}</Label>
    {children}
  </section>
)

function PanelRow({ icon: Icon, children }: { icon: typeof Zap; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg bg-secondary px-3 py-2">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-card text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-px15">{children}</span>
    </li>
  )
}

function Fields({ projectKey, name, empty, technical }: { projectKey: string; name: string | null | undefined; empty: I18nString; technical: boolean }) {
  const schema = useSchema(projectKey, name)
  if (!name) return <p className="text-px15 text-ink-2">{empty}</p>
  if (schema.isPending) return <p className="text-px15 text-ink-2">{m.functions_panel__loading()}</p>
  if (schema.isError) return <p className="text-px15 text-ink-2">{m.functions_panel__fields_failed()}</p>
  const { fields, plain } = fieldsOfSchema(schema.data)
  if (!fields.length) return <p className="text-px15 text-ink-2">{plain ? asI18n(niceName(plain)) : empty}</p>
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {fields.map((f) => (
        <li key={f.name} className="flex flex-col rounded-lg bg-secondary px-3 py-1.5">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <b className="text-px15">{asI18n(niceName(f.name))}</b>
            <span className="flex items-center gap-2 text-px13 text-muted-foreground">
              {technical ? <code className="rounded-md bg-card px-1.5 py-0.5 font-mono text-px13 text-foreground">{asI18n(f.type)}</code> : null}
              {f.needed ? m.functions_panel__needed() : m.functions_panel__optional()}
            </span>
          </span>
          {f.about ? <small className="text-px14 text-ink-2">{asI18n(f.about)}</small> : null}
        </li>
      ))}
    </ul>
  )
}

export function FunctionPanel({ projectKey, entry: e, meta, notes, onClose }: { projectKey: string; entry: Entry; meta: FunctionsMeta | undefined; notes: Record<string, string>; onClose: () => void }) {
  const { say } = useContext(ShellCtx)
  const [technical] = useDeveloperDetails()
  const f = e.fn
  const used = e.used
  const routes = (meta?.httpMeta ?? []).filter((r) => r.pikkuFuncId === e.id)
  const helpers = (meta?.mcpMeta ?? []).filter((t) => t.pikkuFuncId === e.id)
  const schedulers = (used?.jobs ?? []).filter((j) => j.type === 'scheduler')
  const queues = (used?.jobs ?? []).filter((j) => j.type === 'queue')
  const workflows = used?.workflows ?? []
  const commands = (used?.transports ?? []).filter((t) => t.type === 'cli')
  const live = (used?.transports ?? []).filter((t) => t.type === 'channel')
  const reached = (r: Reach) => e.reach.includes(r)

  const ICONS: Record<string, typeof Zap> = { w: Globe, r: Globe, h: Bot, s: Clock, q: Layers, f: WorkflowIcon, c: SquareTerminal, l: Radio }
  const list = (rows: Array<{ key: string; node: I18nNode }>, icon?: typeof Zap) => (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {rows.map((r) => (
        <PanelRow key={r.key} icon={icon ?? ICONS[r.key[0]] ?? Zap}>
          {r.node}
        </PanelRow>
      ))}
    </ul>
  )

  return (
    <SidePanel icon={Zap} title={asI18n(e.title)} sub={e.own ? undefined : m.functions_panel__builtin()} label={m.functions_panel__label({ title: asI18n(e.title) })} onClose={onClose}>
      <Block title={m.functions_panel__what()}>
        <p className="text-px15 text-ink-2">{e.about ? asI18n(e.about) : m.functions_screen__no_description()}</p>
      </Block>

      <Block title={m.functions_panel__who()}>
        <div className="flex flex-col gap-1.5">
          <Dot tone={e.signin ? 'ok' : 'warn'}>{e.signin ? m.functions_panel__who_signin() : m.functions_panel__who_open()}</Dot>
          {e.perm ? <Dot tone="ok">{m.functions_panel__who_perm()}</Dot> : null}
        </div>
        {e.scopes.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-px13 font-semibold text-muted-foreground">{m.functions_panel__who_scopes()}</span>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {e.scopes.map((s) => (
                <PanelRow key={s} icon={KeyRound}>
                  <code className="w-fit max-w-full break-all rounded-md bg-card px-1.5 py-0.5 font-mono text-px13 text-foreground">{asI18n(s)}</code>
                  {notes[s] ? <small className="text-px14 leading-snug text-ink-2">{asI18n(notes[s])}</small> : null}
                </PanelRow>
              ))}
            </ul>
          </div>
        ) : null}
        {e.perm && f.permissions?.length ? list(f.permissions.map((p) => ({ key: p.name, node: <span>{asI18n(niceName(p.name))}</span> })), Lock) : null}
      </Block>

      <Block title={m.functions_panel__where()}>
        {reached('none') ? (
          <p className="text-px15 text-ink-2">{m.functions_panel__where_none()}</p>
        ) : (
          list([
            ...routes.map((r) => ({ key: `w${r.method}${r.route}`, node: <span>{m.functions_panel__where_web({ route: asI18n(r.route) })}</span> })),
            ...(routes.length === 0 && f.expose && e.reach.includes('web') ? [{ key: 'rpc', node: <span>{m.functions_panel__where_rpc()}</span> }] : []),
            ...helpers.map((t) => ({ key: `h${t.name}`, node: <span>{m.functions_panel__where_helper({ name: asI18n(niceName(t.name ?? e.id)) })}</span> })),
            ...schedulers.map((j) => ({
              key: `s${j.id}`,
              node: (
                <Link {...keep} to="/scheduled-tasks" className="font-semibold text-accent-foreground hover:underline">
                  {m.functions_panel__where_scheduled({ name: asI18n(niceName(j.name)) })}
                </Link>
              ),
            })),
            ...queues.map((j) => ({
              key: `q${j.id}`,
              node: (
                <Link {...keep} to="/queues" className="font-semibold text-accent-foreground hover:underline">
                  {m.functions_panel__where_queue({ name: asI18n(niceName(j.name)) })}
                </Link>
              ),
            })),
            ...workflows.map((w) => ({
              key: `f${w.id}`,
              node: (
                <Link {...keep} to={'/workflows/$id' as never} params={{ id: w.id } as never} className="font-semibold text-accent-foreground hover:underline">
                  {m.functions_panel__where_workflow({ name: asI18n(niceName(w.name)) })}
                </Link>
              ),
            })),
            ...commands.map((c) => ({ key: `c${c.id}`, node: <span>{m.functions_panel__where_command({ name: asI18n(c.name) })}</span> })),
            ...live.map((c) => ({ key: `l${c.id}`, node: <span>{m.functions_panel__where_live({ name: asI18n(niceName(c.name)) })}</span> })),
          ])
        )}
      </Block>

      <Block title={m.functions_panel__needs()}>
        <Fields projectKey={projectKey} name={f.inputSchemaName} empty={m.functions_panel__needs_none()} technical={technical} />
      </Block>
      <Block title={m.functions_panel__gives()}>
        <Fields projectKey={projectKey} name={f.outputSchemaName} empty={m.functions_panel__gives_none()} technical={technical} />
      </Block>

      <Button variant="hero" size="page" type="button" onClick={() => say(m.functions_panel__ask_say({ title: asI18n(e.title) }))}>
        <PikkuDot />
        {m.functions_panel__ask()}
      </Button>

      <div className="flex flex-col gap-2">
        {technical ? (
          <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-xl bg-secondary px-4 py-3">
            {(
              [
                [m.functions_panel__tech_id(), e.id],
                [m.functions_panel__tech_file(), f.sourceFile ?? ''],
                [m.functions_panel__tech_input(), f.inputSchemaName ?? ''],
                [m.functions_panel__tech_output(), f.outputSchemaName ?? ''],
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
      </div>
    </SidePanel>
  )
}
