import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { LayoutTemplate, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { PikkuDot } from '../blocks/PikkuDot'
import { RowCard, RowStack } from '../blocks/RowCard'
import { TechDetails } from '../blocks/TechDetails'
import { useDeveloperDetails } from '../lib/developer-details'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'
import { WorkSkeleton } from './work-shared'

type AppPage = { app: string; path: string; title?: string }

export function ScreensScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const [technical] = useDeveloperDetails()
  const [term, setTerm] = useState('')
  const q = useProjectQuery<{ pages?: AppPage[] }>(key, 'console:getPages', {})
  const head = <PageHead crumb={projectName} title={m.screens_page__title()} text={m.screens_page__text()} size="lead" />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.screens_page__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const pages = q.data?.pages ?? []
  const needle = term.trim().toLowerCase()
  const shown = needle ? pages.filter((p) => [p.title, p.path, p.app].some((v) => v?.toLowerCase().includes(needle))) : pages
  const ask = () => say(pages.length ? m.screens_page__ask_say() : m.screens_page__add_say())
  const title = q.isPending ? m.screens_page__hero_loading() : pages.length === 0 ? m.screens_page__hero_none() : pages.length === 1 ? m.screens_page__hero_one() : m.screens_page__hero_many({ count: pages.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.screens_page__title()} hue="sea" page="screens" title={title} why={pages.length ? m.screens_page__why() : m.screens_page__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={ask}>
            <PikkuDot />
            {pages.length ? m.screens_page__hero_ask() : m.screens_page__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : pages.length === 0 ? (
        <EmptyState layout="row" icon={LayoutTemplate} title={m.screens_page__empty()} text={m.screens_page__empty_text()}>
          <Button type="button" size="page" onClick={ask}>
            <PikkuDot />
            {m.screens_page__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <>
          {pages.length > 5 ? (
            <label className="relative max-w-xl">
              <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={m.screens_page__search()} aria-label={m.screens_page__search()} className="h-11.5 rounded-full ps-11" />
            </label>
          ) : null}
          {shown.length === 0 ? <p className="px-1 text-px15 text-ink-2">{m.work_list__no_matches({ query: term.trim() })}</p> : null}
          <RowStack>
            {shown.map((p) => (
              <RowCard
                key={`${p.app}:${p.path}`}
                tile={<LayoutTemplate className="size-5" />}
                title={asI18n(p.title || p.path)}
                caption={m.screens_page__in_app({ app: asI18n(p.app) })}
                below={technical ? <TechDetails rows={[[m.screens_page__tech_path(), p.path], [m.screens_page__tech_app(), p.app]]} /> : undefined}
              />
            ))}
          </RowStack>
        </>
      )}
    </Page>
  )
}
