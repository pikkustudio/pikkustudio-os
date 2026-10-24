import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { PikkuDot } from '../blocks/PikkuDot'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { Dot } from '../blocks/RowCard'
import { failedRunsSay, RecentRuns, toWorkItems, useJobHistory, useWorkMeta, WorkList, WorkSkeleton, type JobRecord, type RunRow } from './work-shared'

const jobState = (job: JobRecord): Pick<RunRow, 'tone' | 'state'> =>
  job.status === 'failed'
    ? { tone: 'bad', state: m.work_list__went_wrong() }
    : job.status === 'completed'
      ? { tone: 'ok', state: m.work_list__went_fine() }
      : job.status === 'active'
        ? { tone: 'quiet', state: m.work_list__running() }
        : { tone: 'quiet', state: m.work_list__waiting() }

export function QueuesScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const q = useWorkMeta(key)
  const history = useJobHistory(key)

  const head = <PageHead crumb={projectName} title={m.queues__title()} text={m.queues__text()} size="lead" />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.queues__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const wires = q.data?.queueMeta ?? {}
  const items = toWorkItems(wires, q.data?.functions, (w) => {
    const tech: Array<[I18nString, string]> = [
      [m.work_list__tech_name(), w.name],
      [m.work_list__tech_function(), w.pikkuFuncId],
    ]
    if (w.config) tech.push([m.queues__tech_config(), JSON.stringify(w.config)])
    return tech
  })
  const ask = () => say(m.queues__ask_say())
  const add = () => say(m.queues__add_say())
  const queues = history.data
  const titleOf = (name: string) => items.find((i) => i.id === name || wires[i.id]?.name === name)?.title ?? name
  const runRows: RunRow[] = Object.entries(queues ?? {})
    .flatMap(([name, q]) => q.recent.map((job) => ({ name, job })))
    .sort((a, b) => new Date(b.job.createdAt).getTime() - new Date(a.job.createdAt).getTime())
    .map(({ name, job }) => ({ id: `${name}-${job.jobId}`, title: titleOf(name), at: job.finishedAt ?? job.processedAt ?? job.createdAt, error: job.error, ...jobState(job) }))
  const failed = runRows.filter((r) => r.tone === 'bad').length
  const fixAll = () => say(failedRunsSay(runRows))
  const title = q.isPending
    ? m.queues__hero_loading()
    : failed === 1
      ? m.work_list__hero_failed_one()
      : failed > 1
        ? m.work_list__hero_failed_many({ count: failed })
        : items.length === 0
          ? m.queues__hero_none()
          : items.length === 1
            ? m.queues__hero_one()
            : m.queues__hero_many({ count: items.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.queues__title()} hue="petrol" page="queues" title={title} why={failed ? m.work_list__why_failed() : items.length ? m.queues__why() : m.queues__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={failed ? fixAll : items.length ? ask : add}>
            <PikkuDot />
            {failed ? m.work_list__fix_all() : items.length ? m.queues__hero_ask() : m.queues__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : items.length === 0 ? (
        <EmptyState layout="row" icon={Layers} title={m.queues__empty()} text={m.queues__empty_text()}>
          <Button type="button" size="page" onClick={add}>
            <PikkuDot />
            {m.queues__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <WorkList
          items={items}
          icon={Layers}
          own={m.queues__list()}
          search={m.queues__search()}
          noDescription={m.work_list__no_description()}
          side={(id) => {
            const at = wires[id].config?.batchSize
            const counts = (queues?.[id] ?? queues?.[wires[id].name])?.counts
            const waiting = counts ? counts.waiting + counts.delayed : 0
            return (
              <span className="flex flex-col items-end gap-1">
                {at && at > 1 ? <span className="text-px14 font-semibold text-ink-2">{m.queues__at_once({ count: at })}</span> : null}
                {counts?.active ? <Dot tone="quiet">{m.queues__working_count({ count: counts.active })}</Dot> : null}
                {waiting ? <Dot tone="quiet">{m.queues__waiting_count({ count: waiting })}</Dot> : null}
                {counts?.failed ? <Dot tone="bad">{m.queues__failed_count({ count: counts.failed })}</Dot> : null}
              </span>
            )
          }}
        />
      )}

      {!q.isPending && items.length > 0 && history.isSuccess ? <RecentRuns rows={runRows} icon={Layers} /> : null}
    </Page>
  )
}
