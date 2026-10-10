import { asI18n } from '@pikku/react'
import { Check, X } from 'lucide-react'
import { m } from '@/i18n/messages'
import { candidateKey, riskOf, type Candidate, type VerdictKind } from '../lib/review'

/** What is still waiting, riskiest first. The open one is Teal Mist like the current rail item. */
export function ReviewQueueList({ candidates, judged, currentKey, onPick }: { candidates: Candidate[]; judged: Record<string, VerdictKind>; currentKey: string; onPick: (key: string) => void }) {
  const max = Math.max(0, ...candidates.map((c) => c.score))
  return (
    <nav aria-label={m.review_list__label()} data-testid="review-list" className="sticky top-3 flex max-h-[80vh] w-60 shrink-0 flex-col gap-0.5 self-start overflow-auto max-lg:hidden">
      <h2 className="px-3 pb-1.5 text-px14 font-bold text-muted-foreground">{m.review_list__title()}</h2>
      {candidates.map((c) => {
        const key = candidateKey(c)
        const done = judged[key] ?? c.judgedAs
        const flagged = c.suggestedReasons.length + c.commentCount
        const risk = riskOf(c.score, max)
        return (
          <button key={key} type="button" disabled={!!done} aria-current={key === currentKey ? 'true' : undefined} onClick={() => onPick(key)} className={`flex min-h-11.5 flex-col justify-center rounded-xl px-3 py-1.5 text-start transition-colors disabled:cursor-default ${key === currentKey ? 'bg-accent text-accent-foreground' : 'text-ink-2 hover:bg-secondary'}`}>
            <span className="flex items-center gap-2">
              <span dir="ltr" className={`min-w-0 flex-1 truncate font-mono text-[13px] ${done ? 'line-through opacity-60' : 'font-semibold'}`}>{asI18n(c.name)}</span>
              {done === 'keep' ? <Check className="size-4 text-success-foreground" aria-label={m.review_list__kept()} /> : null}
              {done === 'reject' ? <X className="size-4 text-destructive-foreground" aria-label={m.review_list__rejected()} /> : null}
            </span>
            {!done ? (
              <small className="text-px13">
                {flagged > 0 ? m.review_list__noticed({ count: flagged }) : risk === 'high' ? m.review_risk__high() : risk === 'mid' ? m.review_risk__mid() : m.review_risk__low()}
              </small>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
