import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Send } from 'lucide-react'
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

export function OutgoingMessagesScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const q = useWorkMeta(key)
  const head = <PageHead crumb={projectName} title={m.outgoing__title()} text={m.outgoing__text()} size="lead" />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.outgoing__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const items = toWorkItems(q.data?.outgoingWebhooksMeta, q.data?.functions, (w) => [
    [m.work_list__tech_name(), w.name],
    [m.work_list__tech_function(), w.pikkuFuncId],
  ])
  const ask = () => say(m.outgoing__ask_say())
  const add = () => say(m.outgoing__add_say())
  const title = q.isPending ? m.outgoing__hero_loading() : items.length === 0 ? m.outgoing__hero_none() : items.length === 1 ? m.outgoing__hero_one() : m.outgoing__hero_many({ count: items.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.outgoing__title()} hue="teal" page="outgoing-messages" title={title} why={items.length ? m.outgoing__why() : m.outgoing__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={items.length ? ask : add}>
            <PikkuDot />
            {items.length ? m.outgoing__hero_ask() : m.outgoing__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : items.length === 0 ? (
        <EmptyState layout="row" icon={Send} title={m.outgoing__empty()} text={m.outgoing__empty_text()}>
          <Button type="button" size="page" onClick={add}>
            <PikkuDot />
            {m.outgoing__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <WorkList items={items} icon={Send} own={m.outgoing__list()} search={m.outgoing__search()} noDescription={m.work_list__no_description()} side={() => null} />
      )}
    </Page>
  )
}
