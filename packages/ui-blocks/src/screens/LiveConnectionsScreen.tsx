import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, Globe, Lock, LogIn, Radio, Search, SearchX } from 'lucide-react'
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
import { LivePanel, abilityLabel } from '../blocks/LivePanel'
import { WorkSkeleton } from './work-shared'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { scopeNotes, type FunctionsMeta } from '../lib/functions'
import { countFor, filtersFrom, hasFilters, liveFrom, matches, searchFrom, useLiveMeta, whoHas, WHO, type Filters, type Live, type Who } from '../lib/live-connections'

const SHOWN = 40
const SCOPES_SHOWN = 8
const ABILITIES_SHOWN = 3

const whoLabel = (w: Who) => (w === 'open' ? m.live_screen__who_open() : w === 'signin' ? m.live_screen__who_signin() : m.live_screen__who_perm())

export function LiveConnectionsScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { fq?: string; who?: string; scope?: string; ch?: string }
  const q = useLiveMeta(key)
  const [allScopes, setAllScopes] = useState(false)
  const [shown, setShown] = useState(SHOWN)
  const [more, setMore] = useState(false)

  const filters = filtersFrom(search)
  const list = useMemo(() => liveFrom(q.data), [q.data])
  const notes = useMemo(() => scopeNotes(q.data as FunctionsMeta | undefined), [q.data])
  const set = (patch: Partial<Filters>) => {
    setShown(SHOWN)
    void navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...searchFrom({ ...filters, ...patch }) })) as never, replace: true })
  }
  const openOne = (id: string | undefined) => void navigate({ to: '.', search: ((prev: object) => ({ ...prev, ch: id })) as never, replace: true })

  const head = <PageHead crumb={projectName} title={m.live_screen__title()} text={m.live_screen__text()} size="lead" developerDetails />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.live_screen__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const scopeIds = [...new Set(list.flatMap((l) => l.scopes))].sort()
  const scopeList = allScopes ? scopeIds : scopeIds.slice(0, SCOPES_SHOWN)
  const result = list.filter((l) => matches(l, filters))
  const active = hasFilters(filters)
  const extra = filters.who.length > 1 ? filters.who.length - 1 : 0
  const open = more || filters.scope.length > 0 || extra > 0
  const clear = () => set({ q: '', who: [], scope: [] })
  const ask = () => say(m.live_screen__ask_say())
  const add = () => say(m.live_screen__add_say())
  const picked = list.find((l) => l.id === search.ch)
  const title = q.isPending ? m.live_screen__hero_loading() : list.length === 0 ? m.live_screen__hero_none() : list.length === 1 ? m.live_screen__hero_one() : m.live_screen__hero_many({ count: list.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.live_screen__title()} hue="petrol" page="live-connections" title={title} why={list.length ? m.live_screen__why() : m.live_screen__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={add}>
            <PikkuDot />
            {m.live_screen__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : list.length === 0 ? (
        <EmptyState layout="row" icon={Radio} title={m.live_screen__empty()} text={m.live_screen__empty_text()}>
          <Button type="button" size="page" onClick={add}>
            <PikkuDot />
            {m.live_screen__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <>
          <section aria-label={m.live_screen__filters()} className="flex flex-col gap-5 rounded-card border border-border bg-card px-5 py-5 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-0 max-w-xl flex-1 basis-72">
                <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder={m.live_screen__search()} aria-label={m.live_screen__search()} className="h-11.5 rounded-full ps-11" />
              </label>
              <Select value={filters.who[0] ?? 'any'} onValueChange={(v) => set({ who: v === 'any' ? [] : [v as Who] })}>
                <SelectTrigger shape="pill" aria-label={m.live_screen__q_who()} className="h-11.5 w-56 focus-visible:ring-0 data-[state=open]:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{m.live_screen__who_any()}</SelectItem>
                  {WHO.map((w) => (
                    <SelectItem key={w} value={w} disabled={!filters.who.includes(w) && countFor(list, filters, 'who', (l) => whoHas(l, w)) === 0}>
                      {whoLabel(w)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scopeIds.length ? (
                <Button variant="bordered" size="compact" type="button" aria-expanded={open} className="h-11.5 rounded-full px-5" onClick={() => setMore((v) => !v)}>
                  {m.live_screen__more_filters()}
                  {filters.scope.length ? <span className="text-muted-foreground">{filters.scope.length}</span> : null}
                  <ChevronDown className={open ? 'size-4 rotate-180' : 'size-4'} />
                </Button>
              ) : null}
              {active ? (
                <Button variant="bordered" size="compact" type="button" className="h-11.5 rounded-full px-5" onClick={clear}>
                  {m.live_screen__clear()}
                </Button>
              ) : null}
            </div>

            {open && scopeIds.length ? (
              <Group question={m.live_screen__q_scope()}>
                {scopeList.map((s) => (
                  <Chip key={s} on={filters.scope.includes(s)} count={countFor(list, filters, 'scope', (l) => l.scopes.includes(s))} title={notes[s] ? asI18n(notes[s]) : undefined} onClick={() => set({ scope: flip(filters.scope, s) })}>
                    {asI18n(s)}
                  </Chip>
                ))}
                {scopeIds.length > SCOPES_SHOWN ? (
                  <Button variant="quiet" size="link" type="button" aria-expanded={allScopes} onClick={() => setAllScopes((v) => !v)}>
                    {allScopes ? m.live_screen__fewer_scopes() : m.live_screen__more_scopes({ count: scopeIds.length - SCOPES_SHOWN })}
                  </Button>
                ) : null}
              </Group>
            ) : null}
          </section>

          <p role="status" className="px-1 text-px15 text-ink-2">
            {result.length === 1 ? m.live_screen__showing_one() : m.live_screen__showing({ count: result.length })}
          </p>

          {result.length === 0 ? (
            <EmptyState layout="row" icon={SearchX} title={m.live_screen__none_match()} text={m.live_screen__none_match_text()}>
              <Button type="button" size="page" onClick={clear}>
                {m.live_screen__clear()}
              </Button>
              <Button type="button" variant="bordered" size="page" onClick={ask}>
                <PikkuDot />
                {m.live_screen__ask_pikku()}
              </Button>
            </EmptyState>
          ) : (
            <RowStack>
              {result.slice(0, shown).map((l) => (
                <LiveRow key={l.id} live={l} onOpen={() => openOne(l.id)} />
              ))}
            </RowStack>
          )}
          {result.length > shown ? (
            <div className="px-1">
              <Button variant="quiet" size="link" type="button" onClick={() => setShown((n) => n + SHOWN)}>
                {m.live_screen__show_more({ count: result.length - shown })}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {picked ? <LivePanel key={picked.id} live={picked} notes={notes} onClose={() => openOne(undefined)} /> : null}
    </Page>
  )
}

function LiveRow({ live: l, onOpen }: { live: Live; onOpen: () => void }) {
  const labels: I18nString[] = [...new Set(l.abilities.map(abilityLabel))]
  return (
    <div onClick={onOpen} className="cursor-pointer">
      <RowCard
        on={false}
        tile={<Radio className="size-5" />}
        title={asI18n(l.title)}
        caption={l.about ? asI18n(l.about) : m.live_screen__no_description()}
        below={
          <div className="flex flex-wrap gap-2">
            <Badge variant="pillMute">
              {l.signin ? <LogIn aria-hidden="true" /> : <Globe aria-hidden="true" />}
              {l.signin ? m.live_screen__badge_signin() : m.live_screen__badge_open()}
            </Badge>
            {l.perm ? (
              <Badge variant="pillInfo">
                <Lock aria-hidden="true" />
                {m.live_screen__badge_perm()}
              </Badge>
            ) : null}
            {labels.slice(0, ABILITIES_SHOWN).map((a, i) => (
              <Badge key={i} variant="tag">
                {a}
              </Badge>
            ))}
            {labels.length > ABILITIES_SHOWN ? <Badge variant="tag">{asI18n(["+", labels.length - ABILITIES_SHOWN].join(""))}</Badge> : null}
          </div>
        }
      >
        <Button variant="bordered" size="compact" type="button">
          {m.live_screen__details()}
        </Button>
      </RowCard>
    </div>
  )
}
