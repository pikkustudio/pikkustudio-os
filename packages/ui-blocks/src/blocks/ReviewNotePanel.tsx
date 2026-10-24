import { asI18n } from '@pikku/react'
import { MessageSquarePlus, X } from 'lucide-react'
import { useMemo } from 'react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { SidePanel } from './SidePanel'
import { ActionNotice } from './ActionNotice'
import type { Range } from './ReviewCode'
import type { Reason } from '../lib/review'

export type Draft = { mode: 'reject' | 'comment'; picked: string[]; note: string }

const TIER: Record<string, number> = { lint: 0, critic: 1, human: 2 }

/** Where a reject gets its reasons and where a comment gets its words. Ctrl or Cmd plus Enter sends. */
export function ReviewNotePanel({ name, draft, reasons, hot, lines, saving, error, onChange, onSubmit, onClose }: { name: string; draft: Draft; reasons: Reason[]; hot: Set<string>; lines: Range; saving: boolean; error: unknown; onChange: (d: Draft) => void; onSubmit: () => void; onClose: () => void }) {
  const ranked = useMemo(() => [...reasons].sort((a, b) => Number(hot.has(b.id)) - Number(hot.has(a.id)) || (TIER[a.tier] ?? 3) - (TIER[b.tier] ?? 3)), [reasons, hot])
  const reject = draft.mode === 'reject'
  const ready = reject ? draft.picked.length > 0 || draft.note.trim() !== '' : draft.note.trim() !== ''
  const toggle = (id: string) => onChange({ ...draft, picked: draft.picked.includes(id) ? draft.picked.filter((x) => x !== id) : [...draft.picked, id] })
  return (
    <SidePanel icon={reject ? X : MessageSquarePlus} label={reject ? m.review_panel__reject_title() : m.review_panel__comment_title()} title={reject ? m.review_panel__reject_title() : m.review_panel__comment_title()} sub={asI18n(name)} onClose={onClose}>
      {reject ? (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2 text-px14 font-bold text-muted-foreground">{m.review_panel__why()}</legend>
          <div className="flex flex-wrap gap-2">
            {ranked.map((r) => (
              <Button key={r.id} variant="filter" size="filter" type="button" aria-pressed={draft.picked.includes(r.id)} onClick={() => toggle(r.id)}>
                {asI18n(r.label)}
                {hot.has(r.id) ? <i className="size-2 rounded-full bg-warning" aria-label={m.review_panel__noticed()} /> : null}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-px15 text-ink-2">{lines.start === lines.end ? m.review_panel__on_line({ line: lines.start }) : m.review_panel__on_lines({ start: lines.start, end: lines.end })}</p>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-px14 font-bold text-muted-foreground">{reject ? m.review_panel__note_optional() : m.review_panel__your_words()}</span>
        <Textarea tone="field" autoFocus={!reject} rows={5} value={draft.note} onChange={(e) => onChange({ ...draft, note: e.target.value })} onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && ready && !saving && onSubmit()} />
      </label>
      {error ? <ActionNotice error={error} what={reject ? m.review_panel__reject_failed() : m.review_panel__comment_failed()} onRetry={onSubmit} retrying={saving} /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="default" size="page" type="button" disabled={!ready || saving} aria-busy={saving} onClick={onSubmit} data-testid="review-panel-send">
          {reject ? m.review_panel__send_reject() : m.review_panel__send_comment()}
        </Button>
        <Button variant="ghost" size="page" type="button" onClick={onClose}>{m.review_panel__cancel()}</Button>
      </div>
    </SidePanel>
  )
}
