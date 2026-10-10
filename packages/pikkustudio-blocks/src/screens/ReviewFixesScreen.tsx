import { useContext, useState } from 'react'
import { RefreshCw, ShieldAlert, Wrench } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Hero } from '../blocks/Hero'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { Segmented } from '../blocks/Segmented'
import { RowStack } from '../blocks/RowCard'
import { ReviewFixRow } from '../blocks/ReviewFixRow'
import { ReviewSections } from './ReviewScreen'
import { ShellCtx } from '../lib/shell'
import { useProjectKey, useProjectName } from '../lib/project'
import { isForbidden, isNothingBuilt, reviewProjectId, useReviewFixes, type ReviewSubject } from '../lib/review'

export function ReviewFixesScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const [subject, setSubject] = useState<ReviewSubject>('code')
  const [stale, setStale] = useState(false)
  const q = useReviewFixes(reviewProjectId(key), subject, stale)
  const fixes = q.data?.fixes ?? []

  const body = q.isPending ? (
    <div role="status" aria-busy="true" className="h-40 animate-pulse rounded-card border border-border bg-secondary" />
  ) : q.isError ? (
    isNothingBuilt(q.error) ? (
      <EmptyState icon={Wrench} title={m.review_state__nothing_built_title()} text={m.review_state__nothing_built_text()}>
        <Button variant="bordered" size="page" type="button" disabled={q.isFetching} onClick={() => q.refetch()}><RefreshCw />{m.review_state__check_again()}</Button>
      </EmptyState>
    ) : isForbidden(q.error) ? (
      <EmptyState icon={ShieldAlert} title={m.review_denied__title()} text={m.review_denied__text()}>
        <Button variant="default" size="page" type="button" onClick={() => say(m.review_denied__ask())}>{m.review_denied__ask_button()}</Button>
      </EmptyState>
    ) : (
      <ErrorState error={q.error} what={m.review_fixes__what()} onRetry={() => q.refetch()} retrying={q.isFetching} />
    )
  ) : fixes.length === 0 ? (
    <Hero hue="sea" art="bubbles" title={m.review_fixes__empty_title()} why={m.review_fixes__empty_text()} />
  ) : (
    <RowStack>
      {fixes.map((f) => (
        <ReviewFixRow key={`${f.target.targetId}\u0000${f.target.implementationHash ?? ''}\u0000${f.reason}\u0000${f.commentId ?? ''}`} fix={f} subject={subject} onCleared={() => void q.refetch()} />
      ))}
    </RowStack>
  )

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.review_fixes__title()} text={m.review_fixes__text()} size="lead">
        <ReviewSections current="review-fixes" />
      </PageHead>
      <div className="flex flex-wrap items-center gap-4 text-[14px] text-ink-2">
        <Segmented label={m.review_fixes__kind()} value={subject} options={[['code', m.review_sections__code()], ['ui', m.review_sections__screens()]]} onChange={(v) => setSubject(v as ReviewSubject)} />
        <label className="flex items-center gap-2.5 font-semibold text-foreground">
          <Switch checked={stale} onCheckedChange={setStale} aria-label={m.review_fixes__show_old()} />
          {m.review_fixes__show_old_count({ count: q.data?.stale ?? 0 })}
        </label>
        {q.data ? <span className="ms-auto">{m.review_fixes__count({ count: q.data.total })}</span> : null}
      </div>
      {body}
    </Page>
  )
}
