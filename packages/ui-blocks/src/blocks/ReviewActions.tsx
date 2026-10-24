import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { Check, MessageSquarePlus, SkipForward, Star, Undo2, X } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'

const Key = ({ k }: { k: string }) => (
  <kbd aria-hidden="true" className="rounded-md border border-input px-1.5 font-sans text-px13 leading-5 text-muted-foreground">{asI18n(k)}</kbd>
)

/** One bar, one key per answer. Keep is the recommendation; everything else is quieter. */
export function ReviewActions({ canUndo, busy, hasSuggestions, onUndo, onSkip, onNote, onExample, onReject, onKeep }: { canUndo: boolean; busy: boolean; hasSuggestions: boolean; onUndo: () => void; onSkip: () => void; onNote: () => void; onExample: () => void; onReject: () => void; onKeep: () => void }) {
  const b = (label: I18nString, k: string, props: { variant: 'default' | 'bordered' | 'ghost'; onClick: () => void; icon: I18nNode; disabled?: boolean; testid: string }) => (
    <Button variant={props.variant} size="compact" type="button" disabled={props.disabled} onClick={props.onClick} data-testid={props.testid}>
      {props.icon}
      {label}
      {props.variant === 'default' ? null : <Key k={k} />}
    </Button>
  )
  return (
    <div role="group" aria-label={m.review_bar__label()} className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2.5 rounded-card border border-border bg-card px-3.5 py-2.5 shadow-card">
      {b(m.review_bar__undo(), 'U', { variant: 'ghost', onClick: onUndo, icon: <Undo2 />, disabled: !canUndo, testid: 'review-undo' })}
      {b(m.review_bar__skip(), 'S', { variant: 'ghost', onClick: onSkip, icon: <SkipForward />, disabled: busy, testid: 'review-skip' })}
      {b(m.review_bar__note(), 'C', { variant: 'ghost', onClick: onNote, icon: <MessageSquarePlus />, testid: 'review-note' })}
      <span className="ms-auto flex flex-wrap items-center gap-2.5">
        {b(m.review_bar__example(), 'E', { variant: 'bordered', onClick: onExample, icon: <Star />, testid: 'review-example' })}
        {b(hasSuggestions ? m.review_bar__reject_noticed() : m.review_bar__reject(), 'R', { variant: 'bordered', onClick: onReject, icon: <X />, testid: 'review-reject' })}
        <Button variant="default" size="compact" type="button" onClick={onKeep} data-testid="review-keep">
          <Check />
          {m.review_bar__keep()}
          <kbd aria-hidden="true" className="rounded-md border border-primary-foreground/50 px-1.5 font-sans text-px13 leading-5">{asI18n('K' as string)}</kbd>
        </Button>
      </span>
    </div>
  )
}
