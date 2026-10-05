import { m } from '@/i18n/messages'
import type { ReactNode } from 'react'

/** One narrow white card of facts in order, split by dashed hairlines (dividers, not boxes). Read once, filed. */
export function WeekReceipt({ flag, title, stamp, children }: { flag?: boolean; title: string; stamp: ReactNode; children: ReactNode }) {
  return (
    <article className={`mx-auto flex w-full max-w-[640px] flex-col rounded-card border bg-card px-7 py-6 shadow-card ${flag ? 'border-warning' : 'border-border'}`} aria-label={m.week_receipt__the_receipt()}>
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h2 className="text-[20px] leading-[1.2] font-bold">{title}</h2>
        {stamp}
      </header>
      {children}
    </article>
  )
}

export const ReceiptPart = ({ title, children }: { title?: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2.5 border-t border-dashed border-border py-4 last:pb-0">
    {title ? <h3 className="text-[14px] font-bold text-muted-foreground">{title}</h3> : null}
    {children}
  </section>
)

export const ReceiptFact = ({ label, children, soft }: { label: string; children: ReactNode; soft?: boolean }) => (
  <div className="grid grid-cols-[132px_1fr] gap-x-4 text-[16px]">
    <dt className="text-[14px] leading-[1.7] text-ink-2">{label}</dt>
    <dd className={soft ? 'text-muted-foreground' : ''}>{children}</dd>
  </div>
)
