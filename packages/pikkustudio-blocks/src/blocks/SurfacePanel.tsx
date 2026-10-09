import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { ArrowLeft, Check, Copy, Lock, LockOpen } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { fieldsOfSchema, fnOf, useSchema, type AllMeta, type Item } from '../lib/surface'
import { QueryState } from './QueryState'
import { SidePanel } from './SidePanel'

const Block = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h3 className="text-px14 font-bold text-muted-foreground">{title}</h3>
    {children}
  </section>
)

const Code = ({ children }: { children: string }) => (
  <code dir="ltr" className="font-mono text-px14 break-all text-foreground">
    {asI18n(children)}
  </code>
)

function Copy_({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant="bordered"
      size="compact"
      type="button"
      className="self-start"
      onClick={() => void navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 2000) })}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? m.common__copied() : m.surface__copy()}
    </Button>
  )
}

function Shape({ projectKey, name, none }: { projectKey: string; name: string | null | undefined; none: I18nString }) {
  const query = useSchema(projectKey, name)
  if (!name) return <p className="m-0 text-px15 text-ink-2">{none}</p>
  return (
    <QueryState query={query} skeleton={<div className="h-16 animate-pulse rounded-xl bg-secondary" />}>
      {(schema) => {
        const { fields, plain } = fieldsOfSchema(schema)
        if (!schema) return <p className="m-0 text-px15 text-ink-2">{m.surface__not_recorded()}</p>
        if (!fields.length)
          return <p className="m-0 text-px15 text-ink-2">{plain ? <Code>{plain}</Code> : none}</p>
        return (
          <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
            {fields.map((f) => (
              <li key={f.name} className="flex flex-col gap-0.5 py-2.5">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="font-mono text-px15" dir="ltr">{asI18n(f.name)}</b>
                  <Badge variant="tag">{asI18n(f.type)}</Badge>
                  <small className="text-px13 text-muted-foreground">{f.needed ? m.surface__needed() : m.surface__optional()}</small>
                </span>
                {f.about ? <small className="text-px14 text-ink-2">{asI18n(f.about)}</small> : null}
              </li>
            ))}
          </ul>
        )
      }}
    </QueryState>
  )
}

function Access({ auth, open, scopes }: { auth?: boolean; open?: boolean; scopes?: string[] }) {
  const isOpen = open ?? auth === false
  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-2 text-px15 font-semibold text-ink-2">
        {isOpen ? <LockOpen className="size-4.5" /> : <Lock className="size-4.5" />}
        {isOpen ? m.surface__access_open() : m.surface__access_signed_in()}
      </span>
      {scopes?.length ? <small className="text-px14 text-ink-2">{m.surface__access_scopes({ scopes: asI18n(scopes.join(', ')) })}</small> : null}
    </div>
  )
}

export function SurfaceItemPanel({ projectKey, meta, item, onFunction, onClose }: { projectKey: string; meta: AllMeta | undefined; item: Item; onFunction: (id: string) => void; onClose: () => void }) {
  const fn = fnOf(meta, item.funcId)
  return (
    <SidePanel title={asI18n(item.title)} sub={item.about ? asI18n(item.about) : undefined} onClose={onClose}>
      <Block title={m.surface__panel_how()}>
        <Code>{item.line}</Code>
        <div>
          <Badge variant="pillMute">{asI18n(item.tag)}</Badge>
        </div>
      </Block>
      {item.fields.length ? (
        <Block title={m.surface__panel_takes_named()}>
          <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
            {item.fields.map((f) => (
              <li key={f.name} className="flex flex-col gap-0.5 py-2.5">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="font-mono text-px15" dir="ltr">{asI18n(f.name)}</b>
                  <small className="text-px13 text-muted-foreground">{f.needed ? m.surface__needed() : m.surface__optional()}</small>
                </span>
                {f.label && f.label !== f.name ? <small className="text-px14 text-ink-2">{asI18n(f.label)}</small> : null}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
      <Block title={m.surface__panel_in()}>
        <Shape projectKey={projectKey} name={fn?.inputSchemaName} none={m.surface__panel_in_none()} />
      </Block>
      <Block title={m.surface__panel_out()}>
        <Shape projectKey={projectKey} name={fn?.outputSchemaName} none={m.surface__panel_out_none()} />
      </Block>
      <Block title={m.surface__panel_access()}>
        <Access auth={fn?.auth} open={item.open} scopes={fn?.scopes} />
      </Block>
      <Block title={m.surface__panel_func()}>
        {item.steps.length ? (
          <div className="flex flex-col items-start gap-2">
            {item.steps.map((s) => (
              <Button key={s.funcId} variant="bordered" size="compact" type="button" onClick={() => onFunction(s.funcId)}>
                {m.surface__step_when({ step: asI18n(s.label), name: asI18n(fnOf(meta, s.funcId)?.name ?? s.funcId) })}
              </Button>
            ))}
          </div>
        ) : item.funcId ? (
          <Button variant="default" size="compact" type="button" className="self-start" onClick={() => onFunction(item.funcId as string)}>
            {asI18n(fn?.name ?? item.funcId)}
          </Button>
        ) : (
          <p className="m-0 text-px15 text-ink-2">{m.surface__not_recorded()}</p>
        )}
      </Block>
    </SidePanel>
  )
}

export function SurfaceFunctionPanel({ projectKey, meta, id, onBack, onClose }: { projectKey: string; meta: AllMeta | undefined; id: string; onBack: () => void; onClose: () => void }) {
  const fn = fnOf(meta, id)
  const used = meta?.functionUsedBy?.[id]
  const where = fn?.sourceFile ? `${fn.sourceFile}${fn.exportedName ? ` (${fn.exportedName})` : ''}` : null
  return (
    <SidePanel title={asI18n(fn?.name ?? id)} sub={m.surface__function_sub()} onClose={onClose}>
      <Button variant="ghost" size="compact" type="button" className="self-start" onClick={onBack}>
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {m.surface__back()}
      </Button>
      <Block title={m.surface__panel_file()}>
        {where ? (
          <>
            <Code>{where}</Code>
            <Copy_ text={fn?.sourceFile ?? where} />
          </>
        ) : (
          <p className="m-0 text-px15 text-ink-2">{m.surface__not_recorded()}</p>
        )}
      </Block>
      <Block title={m.surface__panel_in()}>
        <Shape projectKey={projectKey} name={fn?.inputSchemaName} none={m.surface__panel_in_none()} />
      </Block>
      <Block title={m.surface__panel_out()}>
        <Shape projectKey={projectKey} name={fn?.outputSchemaName} none={m.surface__panel_out_none()} />
      </Block>
      <Block title={m.surface__panel_access()}>
        <Access auth={fn?.auth} scopes={fn?.scopes} />
      </Block>
      <Block title={m.surface__panel_reached()}>
        {used && (used.transports.length || used.jobs.length || used.workflows.length) ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {used.transports.map((t) => (
              <li key={`${t.type}:${t.id}`} className="flex flex-wrap items-center gap-2 text-px15">
                <Badge variant="tag">{asI18n(t.type)}</Badge>
                <Code>{t.name}</Code>
              </li>
            ))}
            {used.jobs.map((t) => (
              <li key={`${t.type}:${t.id}`} className="flex flex-wrap items-center gap-2 text-px15">
                <Badge variant="tag">{asI18n(t.type)}</Badge>
                <Code>{t.name}</Code>
              </li>
            ))}
            {used.workflows.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2 text-px15">
                <Badge variant="tag">{m.surface__workflow()}</Badge>
                <Code>{w.name}</Code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-px15 text-ink-2">{m.surface__reached_none()}</p>
        )}
      </Block>
    </SidePanel>
  )
}
