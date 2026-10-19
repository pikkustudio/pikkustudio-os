import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { BookOpen, ChevronDown, Globe, Lock, LogIn, MessageSquareText, Search, SearchX, Wrench } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { PikkuDot } from '../blocks/PikkuDot'
import { RowCard, RowStack } from '../blocks/RowCard'
import { Chip, Group, flip } from '../blocks/FilterBits'
import { ToolPanel, kindLabel } from '../blocks/ToolPanel'
import { WorkSkeleton } from './work-shared'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { scopeNotes } from '../lib/functions'
import { countFor, filtersFrom, hasFilters, KINDS, matches, searchFrom, toolsFrom, useToolsMeta, whoHas, WHO, type Filters, type Kind, type Tool, type Who } from '../lib/helper-tools'

const SHOWN = 40
const SCOPES_SHOWN = 8

const whoLabel = (w: Who) => (w === 'open' ? m.tools_screen__who_open() : w === 'signin' ? m.tools_screen__who_signin() : m.tools_screen__who_perm())
const KindIcon = ({ kind }: { kind: Kind }) => (kind === 'resource' ? <BookOpen className="size-5" /> : kind === 'prompt' ? <MessageSquareText className="size-5" /> : <Wrench className="size-5" />)

export function HelperToolsScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { fq?: string; kind?: string; who?: string; scope?: string; tl?: string }
  const q = useToolsMeta(key)
  const [allScopes, setAllScopes] = useState(false)
  const [shown, setShown] = useState(SHOWN)
  const [more, setMore] = useState(false)

  const filters = filtersFrom(search)
  const list = useMemo(() => toolsFrom(q.data), [q.data])
  const notes = useMemo(() => scopeNotes(q.data), [q.data])
  const set = (patch: Partial<Filters>) => {
    setShown(SHOWN)
    void navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...searchFrom({ ...filters, ...patch }) })) as never, replace: true })
  }
  const openOne = (id: string | undefined) => void navigate({ to: '.', search: ((prev: object) => ({ ...prev, tl: id })) as never, replace: true })

  const head = <PageHead crumb={projectName} title={m.tools_screen__title()} text={m.tools_screen__text()} size="lead" developerDetails />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.tools_screen__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const scopeIds = [...new Set(list.flatMap((t) => t.scopes))].sort()
  const scopeList = allScopes ? scopeIds : scopeIds.slice(0, SCOPES_SHOWN)
  const result = list.filter((t) => matches(t, filters))
  const active = hasFilters(filters)
  const extra = filters.who.length + filters.scope.length + Math.max(0, filters.kind.length - 1)
  const open = more || extra > 0
  const clear = () => set({ q: '', kind: [], who: [], scope: [] })
  const ask = () => say(m.tools_screen__ask_say())
  const add = () => say(m.tools_screen__add_say())
  const picked = list.find((t) => t.id === search.tl)
  const title = q.isPending ? m.tools_screen__hero_loading() : list.length === 0 ? m.tools_screen__hero_none() : list.length === 1 ? m.tools_screen__hero_one() : m.tools_screen__hero_many({ count: list.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.tools_screen__title()} hue="petrol" page="helper-tools" title={title} why={list.length ? m.tools_screen__why() : m.tools_screen__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={add}>
            <PikkuDot />
            {m.tools_screen__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : list.length === 0 ? (
        <EmptyState layout="row" icon={Wrench} title={m.tools_screen__empty()} text={m.tools_screen__empty_text()}>
          <Button type="button" size="page" onClick={add}>
            <PikkuDot />
            {m.tools_screen__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <>
          <section aria-label={m.tools_screen__filters()} className="flex flex-col gap-5 rounded-card border border-border bg-card px-5 py-5 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-0 max-w-xl flex-1 basis-72">
                <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder={m.tools_screen__search()} aria-label={m.tools_screen__search()} className="h-11.5 rounded-full ps-11" />
              </label>
              <Select value={filters.kind[0] ?? 'any'} onValueChange={(v) => set({ kind: v === 'any' ? [] : [v as Kind] })}>
                <SelectTrigger shape="pill" aria-label={m.tools_screen__q_kind()} className="h-11.5 w-56 focus-visible:ring-0 data-[state=open]:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{m.tools_screen__kind_any()}</SelectItem>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k} disabled={!filters.kind.includes(k) && countFor(list, filters, 'kind', (t) => t.kind === k) === 0}>
                      {kindLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="bordered" size="compact" type="button" aria-expanded={open} className="h-11.5 rounded-full px-5" onClick={() => setMore((v) => !v)}>
                {m.tools_screen__more_filters()}
                {extra ? <span className="text-muted-foreground">{extra}</span> : null}
                <ChevronDown className={open ? 'size-4 rotate-180' : 'size-4'} />
              </Button>
              {active ? (
                <Button variant="bordered" size="compact" type="button" className="h-11.5 rounded-full px-5" onClick={clear}>
                  {m.tools_screen__clear()}
                </Button>
              ) : null}
            </div>

            {open ? (
              <>
                <Group question={m.tools_screen__q_who()}>
                  {WHO.map((w) => (
                    <Chip key={w} on={filters.who.includes(w)} count={countFor(list, filters, 'who', (t) => whoHas(t, w))} onClick={() => set({ who: flip(filters.who, w) })}>
                      {whoLabel(w)}
                    </Chip>
                  ))}
                </Group>
                {scopeIds.length ? (
                  <Group question={m.tools_screen__q_scope()}>
                    {scopeList.map((s) => (
                      <Chip key={s} on={filters.scope.includes(s)} count={countFor(list, filters, 'scope', (t) => t.scopes.includes(s))} title={notes[s] ? asI18n(notes[s]) : undefined} onClick={() => set({ scope: flip(filters.scope, s) })}>
                        {asI18n(s)}
                      </Chip>
                    ))}
                    {scopeIds.length > SCOPES_SHOWN ? (
                      <Button variant="quiet" size="link" type="button" aria-expanded={allScopes} onClick={() => setAllScopes((v) => !v)}>
                        {allScopes ? m.tools_screen__fewer_scopes() : m.tools_screen__more_scopes({ count: scopeIds.length - SCOPES_SHOWN })}
                      </Button>
                    ) : null}
                  </Group>
                ) : null}
              </>
            ) : null}
          </section>

          <p role="status" className="px-1 text-px15 text-ink-2">
            {result.length === 1 ? m.tools_screen__showing_one() : m.tools_screen__showing({ count: result.length })}
          </p>

          {result.length === 0 ? (
            <EmptyState layout="row" icon={SearchX} title={m.tools_screen__none_match()} text={m.tools_screen__none_match_text()}>
              <Button type="button" size="page" onClick={clear}>
                {m.tools_screen__clear()}
              </Button>
              <Button type="button" variant="bordered" size="page" onClick={ask}>
                <PikkuDot />
                {m.tools_screen__ask_pikku()}
              </Button>
            </EmptyState>
          ) : (
            <RowStack>
              {result.slice(0, shown).map((t) => (
                <ToolRow key={t.id} tool={t} onOpen={() => openOne(t.id)} />
              ))}
            </RowStack>
          )}
          {result.length > shown ? (
            <div className="px-1">
              <Button variant="quiet" size="link" type="button" onClick={() => setShown((n) => n + SHOWN)}>
                {m.tools_screen__show_more({ count: result.length - shown })}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {picked ? <ToolPanel key={picked.id} projectKey={key} tool={picked} notes={notes} onClose={() => openOne(undefined)} /> : null}
    </Page>
  )
}

function ToolRow({ tool: t, onOpen }: { tool: Tool; onOpen: () => void }) {
  const backed: I18nString = t.fn ? m.tools_screen__backed_by({ name: asI18n(t.fn.title) }) : asI18n(t.funcId)
  return (
    <div onClick={onOpen} className="cursor-pointer">
      <RowCard
        on={false}
        tile={<KindIcon kind={t.kind} />}
        title={asI18n(t.title)}
        caption={t.about ? asI18n(t.about) : m.tools_screen__no_description()}
        below={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="pillOk">{kindLabel(t.kind)}</Badge>
            <Badge variant="pillMute">
              {t.signin ? <LogIn aria-hidden="true" /> : <Globe aria-hidden="true" />}
              {t.signin ? m.tools_screen__badge_signin() : m.tools_screen__badge_open()}
            </Badge>
            {t.perm ? (
              <Badge variant="pillInfo">
                <Lock aria-hidden="true" />
                {m.tools_screen__badge_perm()}
              </Badge>
            ) : null}
            <span className="text-px14 text-ink-2">{backed}</span>
          </div>
        }
      >
        <Button variant="bordered" size="compact" type="button">
          {m.tools_screen__details()}
        </Button>
      </RowCard>
    </div>
  )
}
