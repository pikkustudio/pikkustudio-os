import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Link } from '@tanstack/react-router'
import { keepSearch } from '../lib/project-url'
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
import { useInboxMessage } from '../lib/inbox'
import { useProjectName } from '../lib/project'

const when = (at: string | Date) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at))

const statusOf = (error: unknown) => {
  const s = (error as { status?: unknown } | null)?.status
  return typeof s === 'number' ? s : null
}

export function InboxDetail({ id, device, backTo, onDevice }: { id: string; device: Device; backTo: string; onDevice: (d: Device) => void }) {
  const query = useInboxMessage(id)
  const crumb = useProjectName()
  const isEmail = query.data ? query.data.channel === 'email' : true
  const bar = (
    <Card variant="bar" role="toolbar" aria-label={m.email_bar__email_preview_controls()}>
      <div className="@container/bar flex w-full items-center gap-2">
        <Button variant="bar" size="picker" asChild>
          <Link to={backTo as never} search={keepSearch as never} aria-label={m.inbox_detail__back()} title={m.inbox_detail__back()}>
            <ArrowLeft className="rtl:-scale-x-100 size-4.5" />
            <span className="hidden @min-[1100px]/bar:inline">{m.inbox_detail__back()}</span>
          </Link>
        </Button>
        {isEmail ? (
          <Segmented label={m.email_bar__show_as()} value={device} onChange={(v) => onDevice(v as Device)} options={[['computer', <Monitor key="c" className="size-4" />, false, m.email_bar__computer()], ['phone', <Smartphone key="p" className="size-4" />, false, m.email_bar__phone()], ['text', <FileText key="t" className="size-4" />, false, m.email_bar__plain_text()]]} />
        ) : null}
      </div>
    </Card>
  )
  if (query.isPending) return <>{bar}<CardsSkeleton count={1} /></>
  if (query.isError) {
    return statusOf(query.error) === 404 ? (
      <>
        {bar}
        <EmptyState icon={Mail} title={m.inbox_detail__gone_title()} text={m.inbox_detail__gone_text()}>
          <Button size="page" variant="bordered" asChild>
            <Link to={backTo as never} search={keepSearch as never}>{m.inbox_detail__back()}</Link>
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
  const message = query.data
  const to = asI18n(message.to.join(', '))
  const time = asI18n(when(message.createdAt))
  return (
    <div className="flex flex-col gap-5">
      {bar}
      <PageHead
        width="fit"
        crumb={crumb}
        title={message.subject ? asI18n(message.subject) : message.channel === 'sms' ? m.inbox__to({ to }) : m.inbox__no_subject()}
        text={message.from ? m.inbox_detail__from_to({ from: asI18n(message.from), to, time }) : m.inbox_detail__only_to({ to, time })}
      >
        <InboxStatusChip status={message.status} />
      </PageHead>
      <InboxHighlight highlights={message.highlights} />
      {message.channel === 'email' ? (
        <div className="flex min-h-130 flex-col">
          <EmailStage preview={{ subject: message.subject ?? '', html: message.html ?? '', text: message.body }} device={device} reloadKey={0} />
        </div>
      ) : (
        <div className="flex">
          <p dir="auto" className="max-w-ch62 whitespace-pre-wrap rounded-card rounded-es-sm border border-border bg-secondary px-5 py-3.5 text-px16 leading-relaxed">
            {asI18n(message.body)}
          </p>
        </div>
      )}
    </div>
  )
}
