import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Bot, ChevronDown, Globe, LogIn, Lock, Search, SearchX, Zap } from 'lucide-react'
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
import { FunctionPanel } from '../blocks/FunctionPanel'
import { WorkSkeleton } from './work-shared'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import {
  countFor,
  entriesFrom,
  filtersFrom,
  hasFilters,
  matches,
  reachHas,
  REACH,
  scopeNotes,
  searchFrom,
  useFunctionsMeta,
  whoHas,
  WHO,
  type Entry,
  type Filters,
  type Reach,
  type Who,
} from '../lib/functions'

const SHOWN = 40
const SCOPES_SHOWN = 8

const whoLabel = (w: Who) => (w === 'open' ? m.functions_screen__who_open() : w === 'signin' ? m.functions_screen__who_signin() : m.functions_screen__who_perm())
const reachLabel = (r: Reach): I18nString =>
  r === 'web' ? m.functions_screen__reach_web() : r === 'helper' ? m.functions_screen__reach_helper() : r === 'auto' ? m.functions_screen__reach_auto() : r === 'command' ? m.functions_screen__reach_command() : r === 'live' ? m.functions_screen__reach_live() : m.functions_screen__reach_none()

const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

function Chip({ on, count, onClick, title, children }: { on: boolean; count: number; onClick: () => void; title?: I18nString; children: I18nString }) {
  return (
    <Button variant="filter" size="filter" type="button" aria-pressed={on} disabled={!on && count === 0} title={title} onClick={onClick} className="max-w-full">
      <span className="truncate">{children}</span>
      <span className={on ? 'opacity-80' : 'text-muted-foreground'}>{count}</span>
    </Button>
  )
}

function Group({ question, children }: { question: I18nString; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={question} className="flex min-w-0 flex-col gap-2">
      <h3 className="text-px14 font-bold text-muted-foreground">{question}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function FunctionsScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { fq?: string; who?: string; reach?: string; scope?: string; builtin?: string; fn?: string }
  const q = useFunctionsMeta(key)
  const [allScopes, setAllScopes] = useState(false)
  const [shown, setShown] = useState(SHOWN)
  const [more, setMore] = useState(false)

  const filters = filtersFrom(search)
  const entries = useMemo(() => entriesFrom(q.data), [q.data])
  const notes = useMemo(() => scopeNotes(q.data), [q.data])
  const set = (patch: Partial<Filters>) => {
    setShown(SHOWN)
    void navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...searchFrom({ ...filters, ...patch }) })) as never, replace: true })
  }
  const openFn = (id: string | undefined) => void navigate({ to: '.', search: ((prev: object) => ({ ...prev, fn: id })) as never, replace: true })

  const head = <PageHead crumb={projectName} title={m.functions_screen__title()} text={m.functions_screen__text()} size="lead" />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.functions_screen__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const own = entries.filter((e) => e.own)
  const builtIn = entries.length - own.length
  const scopeIds = [...new Set(entries.filter((e) => filters.builtin || e.own).flatMap((e) => e.scopes))].sort()
  const scopeList = allScopes ? scopeIds : scopeIds.slice(0, SCOPES_SHOWN)
  const result = entries.filter((e) => matches(e, filters))
  const active = hasFilters(filters)
  const extra = filters.who.length + filters.scope.length + (filters.builtin ? 1 : 0)
  const open = more || extra > 0
  const ask = () => say(m.functions_screen__ask_say())
  const add = () => say(m.functions_screen__add_say())
  const picked = entries.find((e) => e.id === search.fn)
  const title = q.isPending ? m.functions_screen__hero_loading() : own.length === 0 ? m.functions_screen__hero_none() : own.length === 1 ? m.functions_screen__hero_one() : m.functions_screen__hero_many({ count: own.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.functions_screen__title()} hue="petrol" page="functions" title={title} why={own.length ? m.functions_screen__why() : m.functions_screen__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={add}>
            <PikkuDot />
            {m.functions_screen__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState layout="row" icon={Zap} title={m.functions_screen__empty()} text={m.functions_screen__empty_text()}>
          <Button type="button" size="page" onClick={add}>
            <PikkuDot />
            {m.functions_screen__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <>
          <section aria-label={m.functions_screen__filters()} className="flex flex-col gap-5 rounded-card border border-border bg-card px-5 py-5 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-0 max-w-xl flex-1 basis-72">
                <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder={m.functions_screen__search()} aria-label={m.functions_screen__search()} className="h-11.5 rounded-full ps-11" />
              </label>
              <Select value={filters.reach[0] ?? 'any'} onValueChange={(v) => set({ reach: v === 'any' ? [] : [v as Reach] })}>
                <SelectTrigger shape="pill" aria-label={m.functions_screen__q_reach()} className="h-11.5 w-56 focus-visible:ring-0 data-[state=open]:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{m.functions_screen__reach_any()}</SelectItem>
                  {REACH.map((r) => (
                    <SelectItem key={r} value={r} disabled={!filters.reach.includes(r) && countFor(entries, filters, 'reach', (e) => reachHas(e, r)) === 0}>
                      {reachLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="bordered" size="compact" type="button" aria-expanded={open} className="h-11.5 rounded-full px-5" onClick={() => setMore((v) => !v)}>
                {m.functions_screen__more_filters()}
                {extra ? <span className="text-muted-foreground">{extra}</span> : null}
                <ChevronDown className={open ? 'size-4 rotate-180' : 'size-4'} />
              </Button>
              {active ? (
                <Button variant="bordered" size="compact" type="button" className="h-11.5 rounded-full px-5" onClick={() => set({ q: '', who: [], reach: [], scope: [], builtin: false })}>
                  {m.functions_screen__clear()}
                </Button>
              ) : null}
            </div>

            {open ? (
              <>
                <Group question={m.functions_screen__q_who()}>
                  {WHO.map((w) => (
                    <Chip key={w} on={filters.who.includes(w)} count={countFor(entries, filters, 'who', (e) => whoHas(e, w))} onClick={() => set({ who: flip(filters.who, w) })}>
                      {whoLabel(w)}
                    </Chip>
                  ))}
                </Group>
            {scopeIds.length ? (
              <Group question={m.functions_screen__q_scope()}>
                {scopeList.map((s) => (
                  <Chip key={s} on={filters.scope.includes(s)} count={countFor(entries, filters, 'scope', (e) => e.scopes.includes(s))} title={notes[s] ? asI18n(notes[s]) : undefined} onClick={() => set({ scope: flip(filters.scope, s) })}>
                    {asI18n(s)}
                  </Chip>
                ))}
                {scopeIds.length > SCOPES_SHOWN ? (
                  <Button variant="quiet" size="link" type="button" aria-expanded={allScopes} onClick={() => setAllScopes((v) => !v)}>
                    {allScopes ? m.functions_screen__fewer_scopes() : m.functions_screen__more_scopes({ count: scopeIds.length - SCOPES_SHOWN })}
                  </Button>
                ) : null}
              </Group>
            ) : null}

            {builtIn > 0 ? (
              <Group question={m.functions_screen__q_more()}>
                <Chip on={filters.builtin} count={builtIn} onClick={() => set({ builtin: !filters.builtin })}>
                  {m.functions_screen__builtin()}
                </Chip>
              </Group>
            ) : null}
              </>
            ) : null}
          </section>

          <p role="status" className="px-1 text-px15 text-ink-2">
            {result.length === 1 ? m.functions_screen__showing_one() : m.functions_screen__showing({ count: result.length })}
          </p>

          {result.length === 0 ? (
            <EmptyState layout="row" icon={SearchX} title={m.functions_screen__none_match()} text={m.functions_screen__none_match_text()}>
              <Button type="button" size="page" onClick={() => set({ q: '', who: [], reach: [], scope: [], builtin: false })}>
                {m.functions_screen__clear()}
              </Button>
              <Button type="button" variant="bordered" size="page" onClick={ask}>
                <PikkuDot />
                {m.functions_screen__ask_pikku()}
              </Button>
            </EmptyState>
          ) : (
            <RowStack>
              {result.slice(0, shown).map((e) => (
                <FunctionRow key={e.id} entry={e} onOpen={() => openFn(e.id)} />
              ))}
            </RowStack>
          )}
          {result.length > shown ? (
            <div className="px-1">
              <Button variant="quiet" size="link" type="button" onClick={() => setShown((n) => n + SHOWN)}>
                {m.functions_screen__show_more({ count: result.length - shown })}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {picked ? <FunctionPanel key={picked.id} projectKey={key} entry={picked} meta={q.data} notes={notes} onClose={() => openFn(undefined)} /> : null}
    </Page>
  )
}

function FunctionRow({ entry: e, onOpen }: { entry: Entry; onOpen: () => void }) {
  return (
    <div onClick={onOpen} className="cursor-pointer">
      <RowCard
        on={false}
        tile={<Zap className="size-5" />}
        title={asI18n(e.title)}
        caption={e.about ? asI18n(e.about) : m.functions_screen__no_description()}
        below={
          <div className="flex flex-wrap gap-2">
            {e.perm ? (
              <Badge variant="pillInfo">
                <Lock aria-hidden="true" />
                {m.functions_screen__badge_perm()}
              </Badge>
            ) : null}
            <Badge variant="pillMute">
              {e.signin ? <LogIn aria-hidden="true" /> : <Globe aria-hidden="true" />}
              {e.signin ? m.functions_screen__badge_signin() : m.functions_screen__badge_open()}
            </Badge>
            {reachHas(e, 'helper') ? (
              <Badge variant="pillOk">
                <Bot aria-hidden="true" />
                {m.functions_screen__badge_helper()}
              </Badge>
            ) : null}
            {e.scopes.slice(0, 2).map((s) => (
              <Badge key={s} variant="tag">
                {asI18n(s)}
              </Badge>
            ))}
            {e.scopes.length > 2 ? <Badge variant="tag">{asI18n(["+", e.scopes.length - 2].join(""))}</Badge> : null}
          </div>
        }
      >
        <Button variant="bordered" size="compact" type="button">
          {m.functions_screen__details()}
        </Button>
      </RowCard>
    </div>
  )
}
