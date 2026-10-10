import { asI18n } from '@pikku/react'
import { useState } from 'react'
import { Check, Copy, Wrench } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { RowCard, Dot } from './RowCard'
import { ActionNotice } from './ActionNotice'
import { isForbidden, projectPath, useClearVerdict, type Fix, type ReviewSubject } from '../lib/review'

const when = (at: string | Date) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at))

/** One thing someone asked to change. Copy it as a ready-made request, or mark it as settled. */
export function ReviewFixRow({ fix, subject, onCleared }: { fix: Fix; subject: ReviewSubject; onCleared: () => void }) {
  const [copied, setCopied] = useState(false)
  const clear = useClearVerdict(onCleared)
  const copy = () => void navigator.clipboard?.writeText(fix.prompt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
  const where = fix.sourceFile ? `${projectPath(fix.sourceFile)}${fix.bodyStart ? `:${fix.bodyStart}` : ''}` : ''
  return (
    <RowCard
      tile={<Wrench className="size-5" />}
      flag={!fix.stale}
      title={asI18n(fix.label)}
      caption={<span dir="ltr" className="font-mono text-[13px]">{asI18n(where ? `${fix.name} · ${where}` : fix.name)}</span>}
      note={m.review_fixes__asked({ when: asI18n(when(fix.castAt)) })}
      below={
        fix.guidance || fix.note || clear.isError ? (
          <div className="flex flex-col gap-2 ps-14.5">
            {fix.guidance ? <p className="max-w-ch62 text-px15 text-ink-2">{asI18n(fix.guidance)}</p> : null}
            {fix.note ? <p dir="auto" className="max-w-ch62 text-px15 whitespace-pre-wrap">{asI18n(fix.note)}</p> : null}
            {clear.isError ? (
              isForbidden(clear.error) ? (
                <p role="alert" className="text-px14 text-destructive-foreground">{m.review_denied__text()}</p>
              ) : (
                <ActionNotice error={clear.error} what={m.review_fixes__settle_failed()} onRetry={() => clear.mutate({ ...fix.target, subject })} retrying={clear.isPending} />
              )
            ) : null}
          </div>
        ) : undefined
      }
    >
      <Dot tone={fix.stale ? 'quiet' : 'warn'}>{fix.stale ? m.review_fixes__old() : m.review_fixes__open()}</Dot>
      <Button variant="bordered" size="compact" type="button" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? m.common__copied() : m.review_fixes__copy()}
      </Button>
      <Button variant="ghost" size="compact" type="button" disabled={clear.isPending} aria-busy={clear.isPending} onClick={() => clear.mutate({ ...fix.target, subject })}>
        {m.review_fixes__settled()}
      </Button>
    </RowCard>
  )
}
