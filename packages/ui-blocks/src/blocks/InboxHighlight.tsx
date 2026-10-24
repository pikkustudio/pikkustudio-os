import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import type { InboxHighlights } from '../lib/inbox'

export function InboxHighlight({ highlights }: { highlights: InboxHighlights }) {
  const [copied, setCopied] = useState(false)
  const primary = highlights.primary
  if (!primary) return null
  const others = highlights.links.filter((l) => primary.kind !== 'link' || l.url !== primary.value).slice(0, 3)
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-card px-6 py-5 shadow-card" aria-label={primary.kind === 'code' ? m.inbox_detail__code_label() : m.inbox_detail__link_label()}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <small className="block text-px14 font-bold text-muted-foreground">{primary.kind === 'code' ? m.inbox_detail__code_label() : m.inbox_detail__link_label()}</small>
          {primary.kind === 'code' ? (
            <b dir="ltr" className="block font-mono text-px56 leading-[1.1] tracking-[0.08em]">{asI18n(primary.value)}</b>
          ) : (
            <span dir="ltr" className="block max-w-ch62 truncate text-px16 text-ink-2">{asI18n(primary.label || primary.value)}</span>
          )}
        </div>
        {primary.kind === 'code' ? (
          <Button
            type="button"
            size="pageLg"
            onClick={() => void navigator.clipboard?.writeText(primary.value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
          >
            {copied ? <Check className="size-4.5" /> : <Copy className="size-4.5" />}
            {copied ? m.inbox_detail__copied() : m.inbox_detail__copy_code()}
          </Button>
        ) : (
          <a href={primary.value} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'pageLg' })}>
            <ExternalLink className="size-4.5" />
            {m.inbox_detail__open_link()}
          </a>
        )}
      </div>
      {others.length ? (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <small className="text-px14 font-bold text-muted-foreground">{m.inbox_detail__other_links()}</small>
          {others.map((link) => (
            <a key={link.url} dir="ltr" href={link.url} target="_blank" rel="noopener noreferrer" className="truncate text-px15 font-semibold text-primary underline-offset-2 hover:underline">
              {asI18n(link.label)}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  )
}
