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
import { toWorkItems, useWorkMeta, WorkList, WorkSkeleton } from './work-shared'

function Art() {
  return (
    <>
      <circle cx="225" cy="50" r="120" className="fill-w1" />
      <circle cx="55" cy="185" r="98" className="fill-w2" />
      <rect x="128" y="76" width="84" height="26" rx="13" className="fill-w6" opacity="0.92" />
      <rect x="128" y="112" width="84" height="26" rx="13" className="fill-w3" />
      <rect x="128" y="148" width="84" height="26" rx="13" className="fill-w6" opacity="0.6" />
      <circle cx="268" cy="166" r="9" className="fill-coral" />
    </>
  )
}

export function BackgroundJobsScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const q = useWorkMeta(key)

  const head = <PageHead crumb={projectName} title={m.background_jobs__title()} text={m.background_jobs__text()} size="lead" developerDetails />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.background_jobs__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const wires = q.data?.queueMeta ?? {}
  const items = toWorkItems(wires, q.data?.functions, (w) => {
    const tech: Array<[I18nString, string]> = [
      [m.work_list__tech_name(), w.name],
      [m.work_list__tech_function(), w.pikkuFuncId],
    ]
    if (w.config) tech.push([m.background_jobs__tech_config(), JSON.stringify(w.config)])
    return tech
  })
  const ask = () => say(m.background_jobs__ask_say())
  const add = () => say(m.background_jobs__add_say())
  const title = q.isPending
    ? m.background_jobs__hero_loading()
    : items.length === 0
      ? m.background_jobs__hero_none()
      : items.length === 1
        ? m.background_jobs__hero_one()
        : m.background_jobs__hero_many({ count: items.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.background_jobs__title()} hue="petrol" art={<Art />} title={title} why={items.length ? m.background_jobs__why() : m.background_jobs__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={items.length ? ask : add}>
            <PikkuDot />
            {items.length ? m.background_jobs__hero_ask() : m.background_jobs__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : items.length === 0 ? (
        <EmptyState layout="row" icon={Layers} title={m.background_jobs__empty()} text={m.background_jobs__empty_text()}>
          <Button type="button" size="page" onClick={add}>
            <PikkuDot />
            {m.background_jobs__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <WorkList
          items={items}
          icon={Layers}
          own={m.background_jobs__list()}
          search={m.background_jobs__search()}
          noDescription={m.work_list__no_description()}
          side={(id) => {
            const at = wires[id].config?.batchSize
            return at && at > 1 ? <span className="text-px14 font-semibold text-ink-2">{m.background_jobs__at_once({ count: at })}</span> : null
          }}
        />
      )}
    </Page>
  )
}
