import { asI18n, type I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Mail } from 'lucide-react'
import { Button } from '../ui/button'
import { QueryState } from './QueryState'
import { EmptyState } from './EmptyState'
import { NextCard } from './NextCard'
import { PageHead } from './PageHead'
import { RowCard, RowStack } from './RowCard'
import { InboxStatusChip } from './InboxStatusChip'
import { useProjectName } from '../lib/project'
import { useInboxList, type InboxSummary } from '../lib/inbox'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <rect x="130" y="100" width="80" height="58" rx="12" className="fill-w6" opacity="0.92" />
      <path d="M136 110l34 26 34-26" className="stroke-w2" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

const when = (at: string | Date) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at))

const recipients = (row: InboxSummary) => asI18n(row.to.join(', '))

export function EmailInbox({ tabs, onOpen, onTemplates }: { tabs: I18nNode; onOpen: (id: string) => void; onTemplates: () => void }) {
  const query = useInboxList()
  const count = query.data?.messages.length
  return (
    <>
      <PageHead align="end" width="fit" crumb={useProjectName()} title={m.emails_list__emails()} text={m.email_inbox__lead()} />
      {tabs}
      <NextCard
        label={m.email_inbox__tab_inbox()}
        hue="sea"
        art={<Art />}
        title={count === 0 ? m.email_inbox__hero_title_empty() : m.email_inbox__hero_title()}
        why={m.email_inbox__hero_why()}
      >
        {count ? (
          <span className="inline-flex items-center gap-2.5 text-px16 font-bold">
            <span className="size-3 shrink-0 rounded-full bg-success ring-4 ring-hero-ink/20" />
            {m.email_inbox__kept({ count })}
          </span>
        ) : null}
      </NextCard>
      <QueryState
        query={query}
        skeleton={<div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />}
        empty={(data) =>
          data.messages.length ? null : (
            <EmptyState layout="row" icon={Mail} title={m.email_inbox__empty_title()} text={m.email_inbox__empty_text()}>
              <Button type="button" size="page" variant="bordered" onClick={onTemplates}>
                {m.email_inbox__see_templates()}
              </Button>
            </EmptyState>
          )
        }
      >
        {(data) => (
          <RowStack>
            {data.messages.map((row) => (
              <RowCard
                key={row.id}
                on
                tile={<Mail className="size-5" />}
                title={row.subject ? asI18n(row.subject) : m.email_inbox__no_subject()}
                caption={m.email_inbox__to({ to: recipients(row) })}
                note={row.templateName ? m.email_inbox__made_from({ template: asI18n(row.templateName) }) : undefined}
              >
                <span className="text-px14 text-ink-2">{asI18n(when(row.createdAt))}</span>
                <InboxStatusChip status={row.status} />
                <Button size="compact" variant="bordered" type="button" onClick={() => onOpen(row.id)}>
                  {m.email_inbox__open()}
                </Button>
              </RowCard>
            ))}
          </RowStack>
        )}
      </QueryState>
    </>
  )
}
