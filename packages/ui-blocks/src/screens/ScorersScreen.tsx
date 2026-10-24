import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { ClipboardCheck, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { RowCard, RowStack, Dot } from '../blocks/RowCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { PikkuDot } from '../blocks/PikkuDot'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'

type Scorer = { name: string; description: string; lane: 'fast' | 'slow'; sampleRate: number; requiresReference: boolean; agents: string[] }

/** Check names come from the project's own code, so they are not ours to translate. */
const checkName = (name: string) => {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.:]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const isLive = (s: Scorer) => !s.requiresReference && s.sampleRate > 0

const sampling = (s: Scorer): I18nString => {
  if (s.requiresReference) return m.scorers_screen__tests_only()
  if (s.sampleRate <= 0) return m.scorers_screen__not_live()
  if (s.sampleRate >= 1) return m.scorers_screen__every_answer()
  const every = 1 / s.sampleRate
  return Number.isInteger(every) ? m.scorers_screen__one_in({ count: every }) : m.scorers_screen__percent({ percent: Math.round(s.sampleRate * 100) })
}

export function ScorersScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const q = useProjectQuery<Scorer[]>(key, 'console:getScorers', {})
  const [search, setSearch] = useState('')

  const head = <PageHead crumb={projectName} title={m.scorers_screen__title()} text={m.scorers_screen__text()} size="lead" />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.scorers_screen__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const all = q.data ?? []
  const attached = all.filter((s) => s.agents.length > 0).length
  const live = all.filter((s) => isLive(s) && s.agents.length > 0).length
  const idle = attached === 0
  const term = search.trim().toLowerCase()
  const shown = term ? all.filter((s) => [s.name, checkName(s.name), s.description].some((v) => v?.toLowerCase().includes(term))) : all

  const ask = () => say(m.scorers_screen__ask_say())
  const title = q.isPending
    ? m.scorers_screen__hero_loading()
    : all.length === 0
      ? m.scorers_screen__hero_none()
      : idle
        ? m.scorers_screen__hero_idle()
        : attached === 1
          ? m.scorers_screen__hero_one()
          : m.scorers_screen__hero_many({ count: attached })
  const why = all.length === 0 ? m.scorers_screen__why_none() : idle ? m.scorers_screen__why_idle({ count: all.length }) : m.scorers_screen__why({ live, count: all.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.scorers_screen__title()} hue="sea" page="scorers" title={title} why={why}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={ask}>
            <PikkuDot />
            {idle && all.length > 0 ? m.scorers_screen__hero_attach() : m.scorers_screen__hero_ask()}
          </Button>
        </div>
      </NextCard>

      {all.length > 0 ? (
        <label className="relative max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={m.scorers_screen__search()} aria-label={m.scorers_screen__search()} className="h-11.5 rounded-full ps-11" />
        </label>
      ) : null}

      {q.isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-secondary" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <EmptyState layout="row" icon={ClipboardCheck} title={m.scorers_screen__empty()} text={m.scorers_screen__empty_text()}>
          <Button type="button" size="page" onClick={ask}>
            <PikkuDot />
            {m.scorers_screen__hero_ask()}
          </Button>
        </EmptyState>
      ) : (
        <section className="flex flex-col gap-2" aria-label={m.scorers_screen__list()}>
          <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{m.scorers_screen__list()}</h2>
          {shown.length === 0 ? (
            <p className="px-1 text-px15 text-ink-2">{m.scorers_screen__no_matches({ query: search.trim() })}</p>
          ) : (
            <RowStack>
              {shown.map((s) => {
                const off = !isLive(s)
                const free = s.agents.length === 0
                return (
                  <RowCard
                    key={s.name}
                    flag={!off && free}
                    on={!off && !free}
                    tile={<ClipboardCheck className="size-5" />}
                    title={asI18n(checkName(s.name))}
                    caption={s.description ? asI18n(s.description) : m.scorers_screen__no_description()}
                    note={<>{s.lane === 'fast' ? m.scorers_screen__quick() : m.scorers_screen__thorough()}{sep(' · ')}{sampling(s)}</>}
                  >
                    <Dot tone={off ? 'quiet' : free ? 'warn' : 'ok'}>{off ? m.scorers_screen__off() : free ? m.scorers_screen__unattached() : m.scorers_screen__checking({ count: s.agents.length })}</Dot>
                  </RowCard>
                )
              })}
            </RowStack>
          )}
        </section>
      )}
    </Page>
  )
}
