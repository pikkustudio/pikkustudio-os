import { m } from '@/i18n/messages'
import { useState } from 'react'
import type { I18nNode } from '@pikku/react'
import { ArrowRight, Mail, Search } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { useProjectName } from '../lib/project'
import { PageHead } from './PageHead'
import { SectionHead } from './SectionHead'
import type { EmailsData } from '../types/emails'

export function EmailsList({ data, onOpen, tabs }: { data: EmailsData; onOpen: (id: string) => void; tabs?: I18nNode }) {
  const { emails, short } = data
  const [q, setQ] = useState('')
  const hit = (e: (typeof emails)[number]) => `${e.name} ${e.when} ${e.to}`.toLowerCase().includes(q.toLowerCase())
  const groups = [
    { group: 'A', title: m.emails_list__account_emails(), sub: m.emails_list__sent_on_account() },
    { group: 'B', title: m.emails_list__other_emails(), sub: m.emails_list__sent_to_visitors() },
  ]
  const none = !emails.some(hit)
  return (
    <>
      <PageHead
        align="end"
        width="fit"
        crumb={useProjectName()}
        title={m.emails_list__emails()}
        text={m.emails_list__these_are_the_emails()}
      >
        <div className="relative max-w-105 flex-1">
          <Search className="absolute top-2.75 start-3.5 size-5 text-muted-foreground" />
          <Input shape="field" type="search" className="rounded-full ps-10.5" placeholder={m.emails_list__search_emails()} aria-label={m.emails_list__search_emails()} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </PageHead>
      {tabs}
      {groups.map((g) => {
        const rows = emails.filter((e) => e.group === g.group && hit(e))
        return (
          <section key={g.group} className="flex flex-col gap-3">
            <SectionHead title={g.title} sub={g.sub} />
            <div className="flex flex-col gap-2.5">
              {rows.length ? (
                rows.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onOpen(e.id)}
                    className="grid w-full grid-cols-[44px_minmax(0,1.3fr)_minmax(0,1.2fr)_auto_22px] items-center gap-4 rounded-2xl border border-border bg-card px-4.5 py-3.5 text-start transition-all duration-140 hover:-translate-y-px hover:border-primary hover:shadow-lift"
                  >
                    <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Mail className="size-6" />
                    </span>
                    <span>
                      <b className="block text-[16px]">{e.name}</b>
                      <small className="block text-[14px] leading-[1.4] text-ink-2">{e.when}</small>
                    </span>
                    <span>
                      <small className="block text-[14px] leading-[1.4] text-ink-2">{m.emails_list__goes_to()}</small>
                      <small className="block text-[14px] leading-[1.4]">
                        <b className="inline text-[15px] font-semibold">{e.to}</b>
                      </small>
                    </span>
                    <span className="flex gap-1.5">
                      {e.locales.map((l) => (
                        <Badge key={l} variant="tag">
                          {short[l]}
                        </Badge>
                      ))}
                    </span>
                    <ArrowRight className="rtl:-scale-x-100 size-5.5 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <p className="text-[14px] text-muted-foreground">{m.emails_list__nothing_here_matches()}</p>
              )}
            </div>
          </section>
        )
      })}
      {none ? <p className="text-[14px] text-muted-foreground">{m.emails_list__no_email_matches_that()}</p> : null}
    </>
  )
}
