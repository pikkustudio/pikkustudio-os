import { asI18n, type I18nNode } from '@pikku/react'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, Copy, ListChecks, RefreshCw, ShieldAlert, Undo2 } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Hero } from '../blocks/Hero'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { ActionNotice } from '../blocks/ActionNotice'
import { Segmented } from '../blocks/Segmented'
import { ReviewCode, type Range } from '../blocks/ReviewCode'
import { ReviewActions } from '../blocks/ReviewActions'
import { ReviewQueueList } from '../blocks/ReviewQueueList'
import { ReviewNotePanel, type Draft } from '../blocks/ReviewNotePanel'
import { keep as keepSearch } from '../lib/links'
import { ShellCtx } from '../lib/shell'
import { useProjectKey, useProjectName } from '../lib/project'
import {
  candidateKey, isForbidden, isNothingBuilt, projectPath, reviewProjectId, riskOf, targetOf,
  useAddComment, useCastVerdict, useClearVerdict, useDeleteComment, useReviewQueue,
  type Candidate, type ReviewSubject, type VerdictKind,
} from '../lib/review'

type Step = { key: string; kind: VerdictKind | 'skip' }

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

const CHANGE = { added: m.review_change__added, contract: m.review_change__contract, implementation: m.review_change__implementation, removed: m.review_change__removed }

export const ReviewSections = ({ current }: { current: 'review' | 'review-ui' | 'review-fixes' }) => {
  const navigate = useNavigate()
  return (
    <Segmented
      label={m.review_sections__label()}
      value={current}
      options={[['review', m.review_sections__code()], ['review-ui', m.review_sections__screens()], ['review-fixes', m.review_sections__fixes()]]}
      onChange={(to) => navigate({ ...keepSearch, to: `/${to}` as never })}
    />
  )
}

export function ReviewScreen({ subject }: { subject: ReviewSubject }) {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const projectId = reviewProjectId(key)
  const queue = useReviewQueue(projectId, subject)
  const cast = useCastVerdict()
  const clear = useClearVerdict()
  const addComment = useAddComment()
  const deleteComment = useDeleteComment(() => void queue.refetch())

  const [judged, setJudged] = useState<Record<string, VerdictKind>>({})
  const [skipped, setSkipped] = useState<string[]>([])
  const [history, setHistory] = useState<Step[]>([])
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [selection, setSelection] = useState<Range | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [failed, setFailed] = useState<{ error: unknown; retry: () => void } | null>(null)

  const candidates = useMemo(() => queue.data?.candidates ?? [], [queue.data])
  const reasons = useMemo(() => queue.data?.reasons ?? [], [queue.data])
  const rejectReasons = useMemo(() => reasons.filter((r) => r.kind === 'reject'), [reasons])
  const known = useMemo(() => new Set(rejectReasons.map((r) => r.id)), [rejectReasons])
  const example = reasons.find((r) => r.kind === 'keep' && r.id.endsWith('exemplar'))
  const pending = candidates.filter((c) => !(judged[candidateKey(c)] ?? c.judgedAs))
  const open = pending.filter((c) => !skipped.includes(candidateKey(c)))
  const current = open.find((c) => candidateKey(c) === focusKey) ?? open[0] ?? null
  const currentKey = current ? candidateKey(current) : ''
  const comments = useMemo(() => (current ? (queue.data?.comments ?? []).filter((c) => c.targetId === current.pikkuFuncId) : []), [queue.data, current])
  const suggested = useMemo(() => (current ? current.suggestedReasons.filter((id) => known.has(id)) : []), [current, known])
  const hot = useMemo(() => new Set(current?.suggestedReasons ?? []), [current])
  const bodyRange: Range = current ? { start: current.bodyStart, end: current.bodyEnd } : { start: 1, end: 1 }
  const max = Math.max(0, ...candidates.map((c) => c.score))
  const denied = isForbidden(cast.error) || isForbidden(clear.error)

  const moveTo = (k: string | null) => {
    setDraft(null)
    setSelection(null)
    setFocusKey(k)
  }

  const label = (kind: VerdictKind, chosen: string[], note: string | null) => {
    if (!current) return
    const k = currentKey
    const target = targetOf(projectId, current)
    const send = () => {
      setFailed(null)
      cast.mutate({ ...target, subject, kind, reasons: chosen, note }, {
        onError: (error) => {
          setJudged((p) => { const n = { ...p }; delete n[k]; return n })
          setHistory((p) => p.filter((s) => s.key !== k))
          setFocusKey(k)
          setFailed({ error, retry: () => { setJudged((p) => ({ ...p, [k]: kind })); setHistory((p) => [...p, { key: k, kind }]); send() } })
        },
      })
    }
    setJudged((p) => ({ ...p, [k]: kind }))
    setHistory((p) => [...p, { key: k, kind }])
    send()
    moveTo(null)
  }

  const keepIt = (asExample: boolean) => label('keep', asExample && example ? [example.id] : [], null)
  const rejectIt = (choose: boolean) => {
    if (!current) return
    if (!choose && suggested.length > 0) return label('reject', suggested, null)
    setDraft({ mode: 'reject', picked: suggested, note: '' })
  }
  const skipIt = () => {
    if (!current) return
    setSkipped((p) => [...p, currentKey])
    setHistory((p) => [...p, { key: currentKey, kind: 'skip' }])
    moveTo(null)
  }
  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory((p) => p.slice(0, -1))
    setSkipped((p) => p.filter((k) => k !== last.key))
    if (last.kind !== 'skip') {
      setJudged((p) => { const n = { ...p }; delete n[last.key]; return n })
      const c = candidates.find((x) => candidateKey(x) === last.key)
      if (c) clear.mutate({ ...targetOf(projectId, c), subject })
    }
    moveTo(last.key)
  }
  const noteIt = () => {
    if (!current) return
    if (!selection) setSelection(bodyRange)
    setDraft({ mode: 'comment', picked: [], note: '' })
  }
  const step = (by: number) => {
    if (!current || open.length < 2) return
    const at = open.findIndex((c) => candidateKey(c) === currentKey)
    moveTo(candidateKey(open[(at + by + open.length) % open.length]))
  }

  const send = () => {
    if (!current || !draft) return
    if (draft.mode === 'reject') {
      label('reject', draft.picked.filter((id) => known.has(id)), draft.note.trim() || null)
      return
    }
    const lines = selection ?? bodyRange
    addComment.mutate({ ...targetOf(projectId, current), subject, sourceFile: current.sourceFile, lineStart: lines.start, lineEnd: lines.end, body: draft.note.trim() }, {
      onSuccess: () => { setDraft(null); setSelection(null); void queue.refetch() },
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || draft) return
      const k = e.key.toLowerCase()
      const go = (fn: () => void) => { e.preventDefault(); fn() }
      if (k === 'u' || k === 'z') return go(undo)
      if (!current || denied) return
      if (k === 'k') return go(() => keepIt(false))
      if (k === 'e') return go(() => keepIt(true))
      if (k === 'r') return go(() => rejectIt(e.shiftKey))
      if (k === 's') return go(skipIt)
      if (k === 'c') return go(noteIt)
      if (k === 'j' || k === 'arrowdown') return go(() => step(1))
      if (k === 'arrowup') return go(() => step(-1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const head = (
    <PageHead crumb={projectName} title={subject === 'ui' ? m.review_screen__title_screens() : m.review_screen__title()} text={subject === 'ui' ? m.review_screen__text_screens() : m.review_screen__text()} size="lead">
      <ReviewSections current={subject === 'ui' ? 'review-ui' : 'review'} />
    </PageHead>
  )
  const shell = (children: I18nNode) => (
    <Page gap="snug">
      {head}
      {children}
    </Page>
  )

  if (queue.isPending) return shell(<div role="status" aria-busy="true" className="h-72 animate-pulse rounded-card border border-border bg-secondary" />)

  if (queue.isError) {
    const e = queue.error
    return shell(
      isNothingBuilt(e) ? (
        <EmptyState icon={ListChecks} title={m.review_state__nothing_built_title()} text={m.review_state__nothing_built_text()}>
          <Button variant="bordered" size="page" type="button" disabled={queue.isFetching} onClick={() => queue.refetch()}><RefreshCw />{m.review_state__check_again()}</Button>
        </EmptyState>
      ) : isForbidden(e) ? (
        <EmptyState icon={ShieldAlert} title={m.review_denied__title()} text={m.review_denied__text()}>
          <Button variant="default" size="page" type="button" onClick={() => say(m.review_denied__ask())}>{m.review_denied__ask_button()}</Button>
        </EmptyState>
      ) : (
        <ErrorState error={e} what={m.review_screen__what()} onRetry={() => queue.refetch()} retrying={queue.isFetching} />
      ),
    )
  }

  const total = candidates.length
  const left = pending.length
  const kept = Object.values(judged).filter((k) => k === 'keep').length
  const rejected = Object.values(judged).filter((k) => k === 'reject').length

  if (total === 0)
    return shell(
      <Hero hue="sea" art="bubbles" title={subject === 'ui' ? m.review_empty__title_screens() : m.review_empty__title()} why={subject === 'ui' ? m.review_empty__text_screens() : m.review_empty__text()} actions={<Button variant="hero" size="hero" type="button" disabled={queue.isFetching} onClick={() => queue.refetch()}><RefreshCw />{m.review_state__check_again()}</Button>} />,
    )

  if (!current)
    return shell(
      <Hero
        hue="teal"
        art="arch"
        title={m.review_done__title()}
        why={kept + rejected > 0 ? m.review_done__text({ kept, rejected }) : m.review_done__text_quiet()}
        hint={skipped.length > 0 ? m.review_done__skipped({ count: skipped.length }) : undefined}
        actions={
          <>
            {skipped.length > 0 ? <Button variant="hero" size="hero" type="button" onClick={() => setSkipped([])}>{m.review_done__revisit()}</Button> : null}
            {history.length > 0 ? <Button variant="heroGhost" size="hero" type="button" onClick={undo}><Undo2 />{m.review_bar__undo()}</Button> : null}
            <Button variant={skipped.length > 0 ? 'heroGhost' : 'hero'} size="hero" type="button" disabled={queue.isFetching} onClick={() => queue.refetch()}><RefreshCw />{m.review_done__more()}</Button>
          </>
        }
      />,
    )

  const risk = riskOf(current.score, max)
  const pct = Math.round(((total - left) / total) * 100)
  const path = projectPath(current.sourceFile)
  const where = `${path}:${current.bodyStart}–${current.bodyEnd}`

  return shell(
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2" data-testid="review-progress">
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={m.review_progress__left({ left, total })} className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-px15 font-semibold text-ink-2">{m.review_progress__left({ left, total })}</span>
        <Button variant="ghost" size="compact" type="button" disabled={queue.isFetching} onClick={() => queue.refetch()}><RefreshCw />{m.review_screen__refresh()}</Button>
      </div>
      <div className="flex items-start gap-6">
        <ReviewQueueList candidates={candidates} judged={judged} currentKey={currentKey} onPick={moveTo} />
        <div className="flex min-w-0 flex-1 flex-col gap-4" data-testid="review-item">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 dir="auto" className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] break-words">{asI18n(current.name)}</h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[12px] font-bold text-ink-2">{asI18n(current.targetKind)}</span>
              {current.change ? <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-[12px] font-bold text-info-foreground">{CHANGE[current.change]()}</span> : null}
              <span className="ms-auto inline-flex items-center gap-2 text-[14px] font-semibold text-ink-2">
                <i className={`size-2.5 rounded-full ${risk === 'high' ? 'bg-destructive' : risk === 'mid' ? 'bg-warning' : 'bg-success'}`} aria-hidden="true" />
                {risk === 'high' ? m.review_risk__high() : risk === 'mid' ? m.review_risk__mid() : m.review_risk__low()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span dir="ltr" className="min-w-0 truncate font-mono text-[13px] text-ink-2">{asI18n(where)}</span>
              <CopyPath value={`${path}:${current.bodyStart}`} />
              {[...current.wires, ...current.services].map((x) => (
                <span key={x} dir="ltr" className="rounded-md border border-border px-2 py-0.5 font-mono text-[12px] text-ink-2">{asI18n(x)}</span>
              ))}
            </div>
            {suggested.length > 0 ? (
              <p className="text-px14 font-semibold text-warning-foreground" role="note">
                {m.review_item__noticed({ what: asI18n(suggested.map((id) => reasons.find((r) => r.id === id)?.label ?? id).join(' · ')) })}
              </p>
            ) : null}
          </header>
          {failed ? <ActionNotice error={failed.error} what={m.review_item__save_failed()} onRetry={failed.retry} retrying={cast.isPending} /> : null}
          <ReviewCode projectKey={key} candidate={current} comments={comments} selection={selection} onSelect={setSelection} onDeleteComment={(commentId) => deleteComment.mutate({ projectId, subject, commentId })} deleting={deleteComment.isPending ? (deleteComment.variables?.commentId ?? null) : null} />
          {deleteComment.isError ? <ActionNotice error={deleteComment.error} what={m.review_item__remove_failed()} /> : null}
          {denied ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-warning bg-card px-4 py-3 shadow-card">
              <ShieldAlert className="size-5 text-warning-foreground" aria-hidden="true" />
              <b className="min-w-0 flex-1 basis-56 text-px15">{m.review_denied__text()}</b>
              <Button variant="default" size="compact" type="button" onClick={() => say(m.review_denied__ask())}>{m.review_denied__ask_button()}</Button>
            </div>
          ) : (
            <ReviewActions canUndo={history.length > 0} busy={false} hasSuggestions={suggested.length > 0} onUndo={undo} onSkip={skipIt} onNote={noteIt} onExample={() => keepIt(true)} onReject={() => rejectIt(false)} onKeep={() => keepIt(false)} />
          )}
          <p className="hidden text-px14 text-muted-foreground lg:block">{m.review_item__keys_hint()}</p>
        </div>
      </div>
      {draft ? (
        <ReviewNotePanel name={current.name} draft={draft} reasons={rejectReasons} hot={hot} lines={selection ?? bodyRange} saving={addComment.isPending || cast.isPending} error={draft.mode === 'comment' ? addComment.error : null} onChange={setDraft} onSubmit={send} onClose={() => { setDraft(null); addComment.reset() }} />
      ) : null}
    </>,
  )
}

function CopyPath({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  return (
    <Button variant="ghost" size="icon" type="button" aria-label={done ? m.common__copied() : m.review_item__copy_path()} onClick={() => { void navigator.clipboard?.writeText(value); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1500) }}>
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  )
}

