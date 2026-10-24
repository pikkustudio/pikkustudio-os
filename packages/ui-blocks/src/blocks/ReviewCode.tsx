import { asI18n } from '@pikku/react'
import { useMemo, useState } from 'react'
import { RefreshCw, Trash2, FileX } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { useProjectQuery } from '../lib/projectRpc'
import { projectPath, type Candidate, type ReviewComment } from '../lib/review'
import type { FileBody } from '../lib/code'

export type Range = { start: number; end: number }

const CONTEXT = 3
const LIMIT = 90

/** The function under review, read from the project itself. Click a line number to mark it, click a second to mark a stretch. */
export function ReviewCode({ projectKey, candidate, comments, selection, onSelect, onDeleteComment, deleting }: { projectKey: string; candidate: Candidate; comments: ReviewComment[]; selection: Range | null; onSelect: (range: Range | null) => void; onDeleteComment: (id: string) => void; deleting: string | null }) {
  const read = useProjectQuery<FileBody>(projectKey, 'console:readProjectFile', { path: projectPath(candidate.sourceFile) })
  const [all, setAll] = useState(false)
  const lines = useMemo(() => (read.data && !read.data.binary ? read.data.content.split('\n') : []), [read.data])

  if (read.isPending) return <div role="status" aria-busy="true" className="h-56 animate-pulse rounded-card border border-border bg-secondary" />
  if (read.isError || !read.data || read.data.binary)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card px-5 py-4 shadow-card">
        <FileX className="size-6 text-ink-2" aria-hidden="true" />
        <span className="min-w-0 flex-1 basis-56">
          <b className="block text-px16">{m.review_code__no_code_title()}</b>
          <small className="block text-px14 text-ink-2">{m.review_code__no_code_text()}</small>
        </span>
        <Button variant="bordered" size="compact" type="button" disabled={read.isFetching} onClick={() => read.refetch()}>
          <RefreshCw className="size-4" />
          {m.query_state__try_again()}
        </Button>
      </div>
    )

  const from = Math.max(1, candidate.bodyStart - CONTEXT)
  const last = Math.min(lines.length, candidate.bodyEnd + CONTEXT)
  const to = all ? last : Math.min(last, from + LIMIT)
  const rows = Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
  const click = (n: number) => {
    if (!selection || selection.start !== selection.end) return onSelect({ start: n, end: n })
    if (selection.start === n) return onSelect(null)
    onSelect({ start: Math.min(n, selection.start), end: Math.max(n, selection.start) })
  }
  const picked = (n: number) => !!selection && n >= selection.start && n <= selection.end

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card" dir="ltr" data-testid="review-code">
      <div className="max-h-[56vh] overflow-auto py-2 font-mono text-[13px] leading-[1.65]">
        {rows.map((n) => {
          const inBody = n >= candidate.bodyStart && n <= candidate.bodyEnd
          const notes = comments.filter((c) => c.lineEnd === n)
          return (
            <div key={n}>
              <div className={`flex ${picked(n) ? 'bg-accent' : ''}`}>
                <button type="button" aria-label={m.review_code__mark_line({ line: n })} aria-pressed={picked(n)} onClick={() => click(n)} className="w-12 shrink-0 cursor-pointer pe-3 text-end text-muted-foreground tabular-nums hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                  {n}
                </button>
                <pre className={`m-0 min-w-0 flex-1 pe-4 whitespace-pre ${inBody ? 'text-foreground' : 'text-muted-foreground'}`}>{asI18n(lines[n - 1] ?? '')}</pre>
              </div>
              {notes.map((c) => (
                <div key={c.commentId} dir="auto" className="ms-12 me-3 my-1 flex items-start gap-3 rounded-xl border border-warning bg-card px-3 py-2 font-sans text-px14">
                  <span className="min-w-0 flex-1 whitespace-pre-wrap">
                    <b className="block text-px13 text-warning-foreground">{c.lineStart === c.lineEnd ? m.review_code__note_line({ line: c.lineStart }) : m.review_code__note_lines({ start: c.lineStart, end: c.lineEnd })}</b>
                    {asI18n(c.body)}
                  </span>
                  <Button variant="ghost" size="icon" type="button" aria-label={m.review_code__remove_note()} disabled={deleting === c.commentId} onClick={() => onDeleteComment(c.commentId)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {to < last ? (
        <div className="border-t border-border px-4 py-2 text-center font-sans">
          <Button variant="quiet" type="button" onClick={() => setAll(true)}>
            {m.review_code__show_rest({ count: last - to })}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
