import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useMemo, useState } from 'react'
import { Bot, Globe, Layers, MessageCircle, Radio, Search, Terminal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { itemsFrom, useSurfaceDoc, useSurfaceMeta, type Item, type SurfaceLeaf, type Way } from '../lib/surface'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PikkuDot } from '../blocks/PikkuDot'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { RowCard, RowStack } from '../blocks/RowCard'
import { SurfaceFunctionPanel, SurfaceItemPanel } from '../blocks/SurfacePanel'
import { SurfaceLeafPanel, SurfaceReference } from '../blocks/SurfaceReference'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <rect x="128" y="96" width="84" height="64" rx="12" className="fill-w6" opacity="0.92" />
      <path d="M150 120l-12 12 12 12M190 120l12 12-12 12" className="stroke-w2" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

const ways = (): Array<{ way: Way; Icon: LucideIcon; title: I18nString; text: I18nString }> => [
  { way: 'web', Icon: Globe, title: m.surface__group_web(), text: m.surface__group_web_text() },
  { way: 'tool', Icon: Bot, title: m.surface__group_tool(), text: m.surface__group_tool_text() },
  { way: 'command', Icon: Terminal, title: m.surface__group_command(), text: m.surface__group_command_text() },
  { way: 'chat', Icon: MessageCircle, title: m.surface__group_chat(), text: m.surface__group_chat_text() },
  { way: 'live', Icon: Radio, title: m.surface__group_live(), text: m.surface__group_live_text() },
]

const Group = ({ title, text, children }: { title: I18nString; text: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <div className="px-1 pt-2">
      <h2 className="text-px14 font-bold text-muted-foreground">{title}</h2>
      <p className="mt-0.5 text-px14 text-muted-foreground text-pretty">{text}</p>
    </div>
    {children}
  </section>
)

type Open = { kind: 'item'; id: string } | { kind: 'function'; id: string; from: string | null } | { kind: 'leaf'; leaf: SurfaceLeaf } | null

export function SurfaceScreen() {
  const projectName = useProjectName()
  const key = useProjectKey()
  const { say } = useContext(ShellCtx)
  const meta = useSurfaceMeta(key)
  const surface = useSurfaceDoc(key)
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState<Open>(null)

  const items = useMemo(() => itemsFrom(meta.data), [meta.data])
  const needle = term.trim().toLowerCase()
  const shown = needle ? items.filter((i) => `${i.title} ${i.line} ${i.about} ${i.funcId ?? ''}`.toLowerCase().includes(needle)) : items
  const current: Item | undefined = open?.kind === 'item' ? items.find((i) => i.id === open.id) : undefined
  const ask = () => say(m.surface__hero_say())

  const head = <PageHead crumb={projectName} title={m.surface__title()} text={m.surface__lead({ name: projectName })} size="lead" />

  if (meta.isError)
    return (
      <Page gap="snug" width="full">
        {head}
        <ErrorState error={meta.error} what={m.surface__title()} onRetry={() => void meta.refetch()} retrying={meta.isFetching} />
      </Page>
    )

  return (
    <Page gap="snug" width="full">
      {head}
      <NextCard
        label={m.surface__title()}
        hue="petrol"
        art={<Art />}
        title={meta.isPending ? m.surface__hero_loading() : items.length ? m.surface__hero_ways({ count: items.length }) : m.surface__hero_none()}
        why={items.length ? m.surface__hero_why({ name: projectName }) : m.surface__hero_why_none()}
      >
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={ask}>
            <PikkuDot />
            {m.surface__hero_ask()}
          </Button>
        </div>
      </NextCard>

      <label className="relative block max-w-xl">
        <span className="sr-only">{m.surface__search_label()}</span>
        <Search className="pointer-events-none absolute start-4.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-2" aria-hidden="true" />
        <Input shape="field" className="h-12 w-full rounded-full ps-11" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={m.surface__search_placeholder()} />
      </label>

      {meta.isPending ? (
        <CardsSkeleton count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={Layers} title={m.surface__empty_title()} text={m.surface__empty_text()}>
          <Button variant="default" size="page" type="button" onClick={ask}>
            <PikkuDot />
            {m.surface__hero_ask()}
          </Button>
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState layout="row" icon={Search} title={m.surface__no_match_title()} text={m.surface__no_match_text()}>
          <Button variant="bordered" size="page" type="button" onClick={() => setTerm('')}>
            {m.surface__no_match_clear()}
          </Button>
        </EmptyState>
      ) : (
        ways().map((g) => {
          const rows = shown.filter((i) => i.way === g.way)
          if (!rows.length) return null
          return (
            <Group key={g.way} title={m.surface__group_count({ title: g.title, count: rows.length })} text={g.text}>
              <RowStack>
                {rows.map((i) => (
                  <RowCard
                    key={i.id}
                    tile={<g.Icon className="size-5.5" />}
                    title={asI18n(i.title)}
                    caption={<code dir="ltr" className="font-mono text-px14">{asI18n(i.line)}</code>}
                    note={i.about ? asI18n(i.about) : undefined}
                  >
                    <Badge variant="pillMute">{asI18n(i.tag)}</Badge>
                    <Button variant="bordered" size="compact" type="button" onClick={() => setOpen({ kind: 'item', id: i.id })}>
                      {m.surface__open()}
                    </Button>
                  </RowCard>
                ))}
              </RowStack>
            </Group>
          )
        })
      )}

      {needle ? null : (
        <Group title={m.surface__group_ref()} text={m.surface__group_ref_text()}>
          <QueryState
            query={surface}
            skeleton={<CardsSkeleton count={2} />}
            empty={(data) =>
              data.doc?.entryPoints.some((e) => e.leaves.length) ? null : (
                <EmptyState layout="row" icon={Layers} title={m.surface__ref_empty_title()} text={m.surface__ref_empty_text()}>
                  <Button variant="default" size="page" type="button" onClick={() => say(m.surface__ref_empty_say())}>
                    <PikkuDot />
                    {m.surface__hero_ask()}
                  </Button>
                </EmptyState>
              )
            }
          >
            {(data) => <SurfaceReference doc={data.doc!} usage={data.usage} onOpen={(leaf) => setOpen({ kind: 'leaf', leaf })} />}
          </QueryState>
        </Group>
      )}

      {open?.kind === 'item' && current ? (
        <SurfaceItemPanel projectKey={key} meta={meta.data} item={current} onFunction={(id) => setOpen({ kind: 'function', id, from: current.id })} onClose={() => setOpen(null)} />
      ) : null}
      {open?.kind === 'function' ? (
        <SurfaceFunctionPanel projectKey={key} meta={meta.data} id={open.id} onBack={() => setOpen(open.from ? { kind: 'item', id: open.from } : null)} onClose={() => setOpen(null)} />
      ) : null}
      {open?.kind === 'leaf' ? <SurfaceLeafPanel leaf={open.leaf} usage={surface.data?.usage} onClose={() => setOpen(null)} /> : null}
    </Page>
  )
}
