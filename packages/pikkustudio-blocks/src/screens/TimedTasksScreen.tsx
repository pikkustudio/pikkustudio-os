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
import { Dot } from '../blocks/RowCard'
import { ago } from '../lib/virtualUsers'
import { failedRunsSay, RecentRuns, toWorkItems, useTimedHistory, useWorkMeta, WorkList, WorkSkeleton, type RunRow, type TaskRun } from './work-shared'

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

const runState = (run: TaskRun): Pick<RunRow, 'tone' | 'state'> =>
  run.status === 'failed'
    ? { tone: 'bad', state: m.work_list__went_wrong() }
    : run.status === 'skipped'
      ? { tone: 'quiet', state: m.work_list__skipped() }
      : { tone: 'ok', state: m.work_list__went_fine() }

export function TimedTasksScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const q = useWorkMeta(key)
  const history = useTimedHistory(key)

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
  const runs = history.data
  const titleOf = (name: string) => items.find((i) => i.id === name || wires[i.id]?.name === name)?.title ?? name
  const runRows: RunRow[] = Object.entries(runs ?? {})
    .flatMap(([name, r]) => r.history.map((run, n) => ({ name, run, n })))
    .sort((a, b) => new Date(b.run.startedAt).getTime() - new Date(a.run.startedAt).getTime())
    .map(({ name, run, n }) => ({ id: `${name}-${n}-${run.startedAt}`, title: titleOf(name), at: run.startedAt, error: run.error, ...runState(run) }))
  const failed = runRows.filter((r) => r.tone === 'bad').length
  const fixAll = () => say(failedRunsSay(runRows))
  const title = q.isPending
    ? m.timed_tasks__hero_loading()
    : failed === 1
      ? m.work_list__hero_failed_one()
      : failed > 1
        ? m.work_list__hero_failed_many({ count: failed })
        : items.length === 0
          ? m.timed_tasks__hero_none()
          : items.length === 1
            ? m.timed_tasks__hero_one()
            : m.timed_tasks__hero_many({ count: items.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.timed_tasks__title()} hue="teal" art={<Art />} title={title} why={failed ? m.work_list__why_failed() : items.length ? m.timed_tasks__why() : m.timed_tasks__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={failed ? fixAll : items.length ? ask : add}>
            <PikkuDot />
            {failed ? m.work_list__fix_all() : items.length ? m.timed_tasks__hero_ask() : m.timed_tasks__hero_add()}
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
          side={(id) => {
            const r = runs?.[id] ?? runs?.[wires[id].name]
            return (
              <span className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-2 text-px14 font-semibold text-ink-2">
                  <CalendarClock className="size-4" aria-hidden="true" />
                  {describeSchedule(wires[id].schedule) ?? m.timed_tasks__custom()}
                </span>
                {r?.lastRun ? <Dot tone={runState(r.lastRun).tone}>{m.timed_tasks__last_run({ state: runState(r.lastRun).state, when: ago(r.lastRun.startedAt) })}</Dot> : r?.nextRun ? <span className="text-px13 text-muted-foreground">{m.timed_tasks__next_run({ when: ago(r.nextRun) })}</span> : null}
              </span>
            )
          }}
        />
      )}

      {!q.isPending && items.length > 0 && history.isSuccess ? <RecentRuns rows={runRows} icon={Clock} /> : null}
    </Page>
  )
}
