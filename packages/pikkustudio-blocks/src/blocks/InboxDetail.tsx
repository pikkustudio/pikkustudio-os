import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { ArrowLeft, FileText, Mail, Monitor, Smartphone } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { EmptyState } from './EmptyState'
import { EmailStage } from './EmailStage'
import type { Device } from './EmailPreview'
import { ErrorState } from './ErrorState'
import { InboxHighlight } from './InboxHighlight'
import { InboxStatusChip } from './InboxStatusChip'
import { PageHead } from './PageHead'
import { Segmented } from './Segmented'
import { CardsSkeleton } from './QueryState'
import { useInboxEmail } from '../lib/inbox'
import { useProjectName } from '../lib/project'

const when = (at: string | Date) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at))

const statusOf = (error: unknown) => {
  const s = (error as { status?: unknown } | null)?.status
  return typeof s === 'number' ? s : null
}

export function InboxDetail({ id, device, onBack, onDevice }: { id: string; device: Device; onBack: () => void; onDevice: (d: Device) => void }) {
  const query = useInboxEmail(id)
  const crumb = useProjectName()
  const bar = (
    <Card variant="bar" role="toolbar" aria-label={m.email_bar__email_preview_controls()}>
      <div className="@container/bar flex w-full items-center gap-2">
        <Button variant="bar" size="picker" type="button" aria-label={m.email_inbox_detail__back()} title={m.email_inbox_detail__back()} onClick={onBack}>
          <ArrowLeft className="rtl:-scale-x-100 size-4.5" />
          <span className="hidden @min-[1100px]/bar:inline">{m.email_inbox_detail__back()}</span>
        </Button>
        <Segmented label={m.email_bar__show_as()} value={device} onChange={(v) => onDevice(v as Device)} options={[['computer', <Monitor key="c" className="size-4" />, false, m.email_bar__computer()], ['phone', <Smartphone key="p" className="size-4" />, false, m.email_bar__phone()], ['text', <FileText key="t" className="size-4" />, false, m.email_bar__plain_text()]]} />
      </div>
    </Card>
  )
  if (query.isPending) return <>{bar}<CardsSkeleton count={1} /></>
  if (query.isError) {
    return statusOf(query.error) === 404 ? (
      <>
        {bar}
        <EmptyState icon={Mail} title={m.email_inbox_detail__gone_title()} text={m.email_inbox_detail__gone_text()}>
          <Button type="button" size="page" variant="bordered" onClick={onBack}>
            {m.email_inbox_detail__back()}
          </Button>
        </EmptyState>
      </>
    ) : (
      <>
        {bar}
        <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
      </>
    )
  }
  const email = query.data
  const to = asI18n(email.to.join(', '))
  return (
    <div className="flex flex-col gap-5">
      {bar}
      <PageHead
        width="fit"
        crumb={crumb}
        title={email.subject ? asI18n(email.subject) : m.email_inbox__no_subject()}
        text={email.from ? m.email_inbox_detail__from_to({ from: asI18n(email.from), to, time: asI18n(when(email.createdAt)) }) : m.email_inbox_detail__only_to({ to, time: asI18n(when(email.createdAt)) })}
      >
        <InboxStatusChip status={email.status} />
      </PageHead>
      <InboxHighlight highlights={email.highlights} />
      <div className="flex min-h-130 flex-col">
        <EmailStage preview={email} device={device} reloadKey={0} />
      </div>
    </div>
  )
}
