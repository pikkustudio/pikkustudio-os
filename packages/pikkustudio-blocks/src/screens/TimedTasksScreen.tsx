import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { CalendarClock, Clock } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { PikkuDot } from '../blocks/PikkuDot'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { describeSchedule } from '../lib/schedule'
import { toWorkItems, useWorkMeta, WorkList, WorkSkeleton } from './work-shared'

function Art() {
  return (
    <>
      <circle cx="220" cy="60" r="118" className="fill-w1" />
      <circle cx="60" cy="180" r="96" className="fill-w2" />
      <circle cx="170" cy="120" r="62" className="fill-w6" opacity="0.92" />
      <path d="M170 86v34l22 14" fill="none" className="stroke-w2" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="268" cy="168" r="9" className="fill-coral" />
    </>
  )
}

export function TimedTasksScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const q = useWorkMeta(key)

  const head = <PageHead crumb={projectName} title={m.timed_tasks__title()} text={m.timed_tasks__text()} size="lead" developerDetails />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.timed_tasks__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const wires = q.data?.schedulerMeta ?? {}
  const items = toWorkItems(wires, q.data?.functions, (w) => [
    [m.work_list__tech_name(), w.name],
    [m.work_list__tech_function(), w.pikkuFuncId],
    [m.timed_tasks__tech_schedule(), w.schedule],
  ])
  const ask = () => say(m.timed_tasks__ask_say())
  const add = () => say(m.timed_tasks__add_say())
  const title = q.isPending
    ? m.timed_tasks__hero_loading()
    : items.length === 0
      ? m.timed_tasks__hero_none()
      : items.length === 1
        ? m.timed_tasks__hero_one()
        : m.timed_tasks__hero_many({ count: items.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.timed_tasks__title()} hue="teal" art={<Art />} title={title} why={items.length ? m.timed_tasks__why() : m.timed_tasks__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={items.length ? ask : add}>
            <PikkuDot />
            {items.length ? m.timed_tasks__hero_ask() : m.timed_tasks__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : items.length === 0 ? (
        <EmptyState layout="row" icon={Clock} title={m.timed_tasks__empty()} text={m.timed_tasks__empty_text()}>
          <Button type="button" size="page" onClick={add}>
            <PikkuDot />
            {m.timed_tasks__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <WorkList
          items={items}
          icon={Clock}
          own={m.timed_tasks__list()}
          search={m.timed_tasks__search()}
          noDescription={m.work_list__no_description()}
          side={(id) => (
            <span className="inline-flex items-center gap-2 text-px14 font-semibold text-ink-2">
              <CalendarClock className="size-4" aria-hidden="true" />
              {describeSchedule(wires[id].schedule) ?? m.timed_tasks__custom()}
            </span>
          )}
        />
      )}
    </Page>
  )
}
