import { asI18n, sep, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { ArrowUpRight, BookOpen, Bot, Check, CircleAlert, Copy, Globe, ImageOff, MessageCircle, Plug, Radio, Terminal, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { shotUrl, type Docs, type Door } from '../lib/frontDoors'
import { PikkuDot } from './PikkuDot'

const nice = (s: string): I18nString => {
  const text = s.replace(/[-_.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
  return asI18n(text)
}

const kinds = (): Record<Door['kind'], { Icon: LucideIcon; label: I18nString }> => ({
  web: { Icon: Globe, label: m.front_doors__kind_web() },
  cli: { Icon: Terminal, label: m.front_doors__kind_cli() },
  mcp: { Icon: Bot, label: m.front_doors__kind_mcp() },
  gateway: { Icon: MessageCircle, label: m.front_doors__kind_gateway() },
  http: { Icon: Plug, label: m.front_doors__kind_http() },
  live: { Icon: Radio, label: m.front_doors__kind_live() },
})

const hows = () => ({
  webhook: m.front_doors__how_webhook(),
  websocket: m.front_doors__how_websocket(),
  listener: m.front_doors__how_listener(),
})

function Frame({ label, children }: { label: I18nString; children: I18nNode }) {
  return (
    <div role="group" aria-label={label} className="relative min-h-60 overflow-hidden border-b border-border bg-secondary md:border-e md:border-b-0">
      {children}
    </div>
  )
}

function Rows({ children }: { children: I18nNode }) {
  return <ul className="m-0 flex list-none flex-col p-0 divide-y divide-border">{children}</ul>
}

function Row({ icon: Icon, title, text, tail }: { icon: LucideIcon; title: I18nString; text?: I18nString; tail?: I18nString }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3">
      <span className="grid size-9 place-items-center rounded-lg bg-card text-ink-2">
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <b className="block truncate text-px15">{title}</b>
        {text ? <small className="block truncate text-px14 text-ink-2">{text}</small> : null}
      </span>
      {tail ? <small className="text-px13 font-semibold text-muted-foreground">{tail}</small> : null}
    </li>
  )
}

function Shot({ projectKey, door }: { projectKey: string; door: Extract<Door, { kind: 'web' }> }) {
  const [broken, setBroken] = useState(false)
  const url = shotUrl(projectKey, door.app)
  const name = nice(door.app.slug)
  return (
    <Frame label={m.front_doors__shot_alt({ name })}>
      {url && !broken ? (
        <img src={url} alt={m.front_doors__shot_alt({ name })} loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 size-full object-cover object-top" />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="flex max-w-72 flex-col items-center gap-2">
            <span className="grid size-14 place-items-center rounded-card bg-card text-ink-2 shadow-card">
              <ImageOff className="size-7" />
            </span>
            <b className="text-px16">{m.front_doors__no_shot()}</b>
            <span className="text-px14 text-ink-2 text-pretty">{m.front_doors__no_shot_text()}</span>
          </div>
        </div>
      )}
    </Frame>
  )
}

function Terminal_({ door }: { door: Extract<Door, { kind: 'cli' }> }) {
  return (
    <Frame label={door.program}>
      <div dir="ltr" className="absolute inset-0 overflow-auto bg-[#0e1f24] p-5 font-mono text-px14 leading-7 text-[#d5e2e6]">
        {door.commands.length ? (
          door.commands.map((c) => (
            <div key={c.line} className="whitespace-pre-wrap">
              <span className="text-[#2ed3c6]">{sep('$ ')}</span>
              {c.line}
              {c.about ? <span className="block ps-4 text-px13 text-[#8aa5ad]">{c.about}</span> : null}
            </div>
          ))
        ) : (
          <div>
            <span className="text-[#2ed3c6]">{sep('$ ')}</span>
            {door.program}
          </div>
        )}
      </div>
    </Frame>
  )
}

function Visual({ projectKey, door }: { projectKey: string; door: Door }) {
  if (door.kind === 'web') return <Shot projectKey={projectKey} door={door} />
  if (door.kind === 'cli') return <Terminal_ door={door} />
  if (door.kind === 'mcp')
    return (
      <Frame label={m.front_doors__mcp_title()}>
        {door.tools.length ? (
          <Rows>
            {door.tools.slice(0, 5).map((t) => (
              <Row key={t.name} icon={Wrench} title={nice(t.name)} text={t.about} />
            ))}
            {door.tools.length > 5 ? <li className="px-5 py-3 text-px14 font-semibold text-ink-2">{m.front_doors__more({ count: door.tools.length - 5 })}</li> : null}
          </Rows>
        ) : (
          <p className="m-0 p-6 text-px15 text-ink-2">{m.front_doors__mcp_no_tools()}</p>
        )}
      </Frame>
    )
  if (door.kind === 'gateway')
    return (
      <Frame label={nice(door.platform)}>
        <Rows>
          {door.items.map((g) => (
            <Row key={g.name} icon={MessageCircle} title={nice(g.name)} text={g.about} tail={hows()[g.how]} />
          ))}
        </Rows>
      </Frame>
    )
  if (door.kind === 'live')
    return (
      <Frame label={m.front_doors__live_title()}>
        <Rows>
          {door.channels.slice(0, 6).map((c) => (
            <Row key={c.name} icon={Radio} title={nice(c.name)} text={c.about} />
          ))}
        </Rows>
      </Frame>
    )
  return (
    <Frame label={m.front_doors__http_title()}>
      <Rows>
        {door.routes.map((r) => (
          <Row key={`${r.method} ${r.route}`} icon={Plug} title={r.about || r.route} text={r.about ? r.route : undefined} tail={r.method} />
        ))}
        {door.total > door.routes.length ? <li className="px-5 py-3 text-px14 font-semibold text-ink-2">{m.front_doors__more({ count: door.total - door.routes.length })}</li> : null}
      </Rows>
    </Frame>
  )
}

function Copy_({ text }: { text: I18nString }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant="bordered"
      size="compact"
      type="button"
      onClick={() => void navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 2000) })}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? m.action_notice__copied() : m.front_doors__copy()}
    </Button>
  )
}

function Actions({ door, docs }: { door: Door; docs: Docs }) {
  const { say } = useContext(ShellCtx)
  if (door.kind === 'web') {
    const { app } = door
    const name = nice(app.slug)
    if (app.state === 'failed')
      return (
        <Button variant="default" size="compact" type="button" onClick={() => say(m.front_doors__fix_say({ name }))}>
          <PikkuDot />
          {m.front_doors__fix_ask()}
        </Button>
      )
    return app.url ? (
      <Button asChild variant="bordered" size="compact">
        <a href={app.url} target="_blank" rel="noreferrer">
          {m.front_doors__open_app()}
          <ArrowUpRight className="rtl:-scale-x-100 size-4" />
        </a>
      </Button>
    ) : null
  }
  if (door.kind === 'cli') return door.commands[0] ? <Copy_ text={door.commands[0].line} /> : null
  if (door.kind === 'http') {
    if (docs.state === 'ready')
      return (
        <Button variant="bordered" size="compact" type="button" onClick={docs.open}>
          <BookOpen className="size-4" />
          {m.front_doors__docs_open()}
        </Button>
      )
    if (docs.state === 'loading') return <span className="text-px14 text-ink-2" role="status">{m.front_doors__docs_loading()}</span>
    return (
      <div className="flex flex-col items-start gap-2">
        <span className="flex items-center gap-2 text-px14 font-bold text-warning-ink" role="status">
          <CircleAlert className="size-4.5" strokeWidth={2.5} />
          {m.front_doors__docs_missing()}
        </span>
        <Button variant="default" size="compact" type="button" onClick={() => say(m.front_doors__docs_say())}>
          <PikkuDot />
          {m.front_doors__docs_ask()}
        </Button>
      </div>
    )
  }
  return null
}

function Status({ door }: { door: Door }) {
  if (door.kind !== 'web') return null
  const s = door.app.state
  if (s === 'ready')
    return (
      <span className="inline-flex items-center gap-2 text-px14 font-bold text-success-foreground" role="status">
        <Check className="size-4.5" strokeWidth={2.5} />
        {m.front_doors__state_ready()}
      </span>
    )
  if (s === 'starting')
    return (
      <span className="inline-flex items-center gap-2 text-px14 font-bold text-ink-2" role="status">
        <i className="size-4 shrink-0 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-e-transparent" />
        {m.front_doors__state_starting()}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-2 text-px14 font-bold text-destructive-foreground" role="alert">
      <CircleAlert className="size-4.5" strokeWidth={2.5} />
      {m.front_doors__state_failed()}
    </span>
  )
}

function textOf(door: Door): { title: I18nString; caption: I18nString } {
  if (door.kind === 'web') return { title: nice(door.app.slug), caption: m.front_doors__web_caption() }
  if (door.kind === 'cli') return { title: door.program, caption: door.about || m.front_doors__cli_caption() }
  if (door.kind === 'mcp') return { title: m.front_doors__mcp_title(), caption: m.front_doors__mcp_caption({ count: door.tools.length }) }
  if (door.kind === 'gateway') return { title: nice(door.platform), caption: m.front_doors__gateway_caption({ count: door.items.length }) }
  if (door.kind === 'live') return { title: m.front_doors__live_title(), caption: m.front_doors__live_caption() }
  return { title: m.front_doors__http_title(), caption: m.front_doors__http_caption({ count: door.total }) }
}

export function FrontDoorCard({ projectKey, door, docs }: { projectKey: string; door: Door; docs: Docs }) {
  const { Icon, label } = kinds()[door.kind]
  const { title, caption } = textOf(door)
  return (
    <article aria-label={title} className="grid grid-cols-1 overflow-hidden rounded-card border border-border bg-card shadow-card md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Visual projectKey={projectKey} door={door} />
      <div className="flex flex-col gap-3 px-6 py-5.5">
        <Badge variant="pillMute" className="gap-1.5 self-start">
          <Icon />
          {label}
        </Badge>
        <b className="text-[22px] leading-[1.2] text-balance">{title}</b>
        <p className="m-0 text-px16 text-ink-2 text-pretty">{caption}</p>
        <Status door={door} />
        <div className="mt-auto pt-2">
          <Actions door={door} docs={docs} />
        </div>
      </div>
    </article>
  )
}
