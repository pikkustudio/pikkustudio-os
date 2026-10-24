import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, MessageSquarePlus, MessagesSquare, X } from 'lucide-react'
import type * as Monaco from 'monaco-editor'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { StatusLine } from './StatusLine'
import { commentOf, piIsWorking, type CodeThread, type useCodeThreads } from '../lib/codeComments'

export type Comments = ReturnType<typeof useCodeThreads>
type Editor = Monaco.editor.IStandaloneCodeEditor
type Range = { lineStart: number; lineEnd: number; text?: string }
type Open = { kind: 'thread'; changeId: string } | ({ kind: 'new' } & Range)

const STYLE = `
.cc-range{background:color-mix(in oklab,var(--primary) 12%,transparent)}
.cc-range-open{background:color-mix(in oklab,var(--primary) 24%,transparent)}
.cc-glyph,.cc-add{display:flex!important;align-items:center;justify-content:center;cursor:pointer}
.cc-glyph::after{content:attr(data-count);font:700 11px/16px system-ui;min-width:16px;height:16px;border-radius:999px;text-align:center;background:var(--primary);color:var(--primary-foreground)}
.cc-add::after{content:"+";font:700 13px/16px system-ui;width:16px;height:16px;border-radius:999px;text-align:center;border:1.5px solid var(--primary);color:var(--primary);line-height:13px}
${Array.from({ length: 9 }, (_, i) => `.cc-n${i + 1}::after{content:"${i + 1}"}`).join('\n')}
.cc-n10::after{content:"9+"}
`

const countClass = (n: number) => `cc-n${Math.min(n, 10)}`

const lineLabel = (r: { lineStart: number; lineEnd: number }): I18nString =>
  r.lineEnd > r.lineStart ? m.code_comments__title_lines({ start: r.lineStart, end: r.lineEnd }) : m.code_comments__title_line({ line: r.lineStart })

function Zone({ editor, after, children }: { editor: Editor; after: number; children: ReactNode }) {
  const [top, setTop] = useState<number | null>(null)
  const inner = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const zone = { afterLineNumber: after, heightInPx: 160, domNode: document.createElement('div'), onDomNodeTop: (t: number) => setTop(t) }
    let id = ''
    editor.changeViewZones((acc) => {
      id = acc.addZone(zone)
    })
    const fit = () => {
      const h = inner.current?.offsetHeight
      if (!h || h === zone.heightInPx) return
      zone.heightInPx = h
      editor.changeViewZones((acc) => acc.layoutZone(id))
    }
    const observer = new ResizeObserver(fit)
    if (inner.current) observer.observe(inner.current)
    fit()
    return () => {
      observer.disconnect()
      editor.changeViewZones((acc) => acc.removeZone(id))
    }
  }, [editor, after])
  return (
    <div
      ref={inner}
      dir={document.documentElement.dir || 'ltr'}
      className="absolute end-0 py-2 pe-6"
      style={{ top: top ?? -9999, insetInlineStart: editor.getLayoutInfo().contentLeft }}
      onWheel={(e) => editor.setScrollTop(editor.getScrollTop() + e.deltaY)}
    >
      {children}
    </div>
  )
}

function Composer({ comments, path, range, onCancel, onDone }: { comments: Comments; path: string; range: Range; onCancel: () => void; onDone: (changeId: string) => void }) {
  const [body, setBody] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])
  const send = () => {
    if (!body.trim() || comments.adding.isPending) return
    comments.add({ path, lineStart: range.lineStart, lineEnd: range.lineEnd, text: range.text, body: body.trim() }, onDone)
  }
  return (
    <form
      data-testid="code-comment-composer"
      className="flex flex-col gap-2 rounded-card border border-primary bg-card p-3 shadow-card"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <b className="text-px14">{lineLabel(range)}</b>
      <Textarea
        ref={ref}
        tone="field"
        rows={3}
        value={body}
        aria-label={m.code_comments__label()}
        placeholder={m.code_comments__placeholder()}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          if (e.key === 'Escape') onCancel()
        }}
      />
      {comments.adding.isError ? (
        <p role="alert" className="flex items-center gap-2 text-px14 text-destructive-foreground">
          <CircleAlert className="size-4 shrink-0" />
          {m.code_comments__send_error()}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button variant="bordered" size="compact" type="button" onClick={onCancel}>
          {m.code_comments__cancel()}
        </Button>
        <Button variant="default" size="compact" type="submit" disabled={!body.trim() || comments.adding.isPending}>
          {comments.adding.isPending ? m.code_comments__sending() : m.code_comments__send()}
        </Button>
      </div>
    </form>
  )
}

function PiState({ thread }: { thread: CodeThread }) {
  const nav = useNavigate()
  if (piIsWorking(thread.status)) return <StatusLine tone="wait" text={m.code_comments__working()} />
  if (thread.status === 'needs_answer')
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span role="status" className="text-px145 font-bold text-warning-foreground">{m.code_comments__question()}</span>
        <Button
          variant="quiet"
          type="button"
          onClick={() => nav({ to: `/changes/${thread.changeId}` as never, search: ((p: Record<string, unknown>) => ({ ...p, panel: 'changes' })) as never })}
        >
          {m.code_comments__question_link()}
        </Button>
      </div>
    )
  if (thread.status === 'open') return <span role="status" className="text-px14 text-ink-2">{m.code_comments__waiting()}</span>
  if (thread.status === 'done') return <span role="status" className="text-px14 text-ink-2">{m.code_comments__done()}</span>
  return null
}

function Thread({ comments, thread, onClose }: { comments: Comments; thread: CodeThread; onClose: () => void }) {
  const [body, setBody] = useState('')
  const entries = [
    { id: 'root', agent: false, name: null as string | null, body: thread.body },
    ...thread.messages.map((x) => ({ id: x.messageId, agent: x.authorKind === 'agent', name: x.authorName, body: x.body })),
  ]
  const send = () => {
    if (!body.trim() || comments.replying.isPending) return
    comments.reply(thread.changeId, body.trim(), () => setBody(''))
  }
  return (
    <section data-testid="code-comment-thread" aria-label={lineLabel(thread)} className="flex flex-col gap-3 rounded-card border border-primary bg-card p-3 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <b className="text-px14">{lineLabel(thread)}</b>
          <PiState thread={thread} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="bordered" size="compact" type="button" disabled={comments.resolving.isPending} onClick={() => comments.resolve(thread.changeId, onClose)}>
            {m.code_comments__resolve()}
          </Button>
          <Button variant="ghost" size="icon" type="button" aria-label={m.code_comments__close()} onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      {comments.resolving.isError ? (
        <p role="alert" className="text-px14 text-destructive-foreground">{m.code_comments__resolve_error()}</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {entries.map((e) => (
          <li key={e.id} className={`flex flex-col gap-0.5 rounded-md px-3 py-2 ${e.agent ? 'bg-secondary' : 'bg-accent'}`}>
            <span className="text-px13 font-bold">{e.agent ? asI18n(e.name ?? 'pi') : e.name ? asI18n(e.name) : m.code_comments__you()}</span>
            <span className="text-px14 whitespace-pre-wrap">{asI18n(e.id === 'root' ? commentOf(e.body) : e.body)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Textarea
          tone="field"
          rows={2}
          value={body}
          aria-label={m.code_comments__reply_label()}
          placeholder={m.code_comments__reply_placeholder()}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
        />
        {comments.replying.isError ? (
          <p role="alert" className="text-px14 text-destructive-foreground">{m.code_comments__send_error()}</p>
        ) : null}
        <div className="flex justify-end">
          <Button variant="default" size="compact" type="button" disabled={!body.trim() || comments.replying.isPending} onClick={send}>
            {m.code_comments__reply()}
          </Button>
        </div>
      </div>
    </section>
  )
}

export function CommentsStrip({ comments }: { comments: Comments }) {
  if (comments.query.isError)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary px-4 py-2 text-px14">
        <CircleAlert className="size-4 shrink-0 text-destructive-foreground" />
        <span className="flex-1 basis-56">{m.code_comments__load_error()}</span>
        <Button variant="bordered" size="compact" type="button" disabled={comments.query.isFetching} onClick={() => void comments.query.refetch()}>
          {m.code_comments__retry()}
        </Button>
      </div>
    )
  if (!comments.query.isSuccess || comments.threads.length) return null
  return (
    <p className="flex items-center gap-2 border-b border-border px-4 py-2 text-px14 text-ink-2">
      <MessagesSquare className="size-4 shrink-0" aria-hidden="true" />
      {m.code_comments__hint()}
    </p>
  )
}

export function CommentLayer({ editor, monaco, file, comments }: { editor: Editor; monaco: typeof Monaco; file: string; comments: Comments }) {
  const [open, setOpen] = useState<Open | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [pick, setPick] = useState<(Range & { top: number; left: number }) | null>(null)
  const threads = comments.threads
  const model = editor.getModel()
  const lines = model?.getLineCount() ?? 1
  const clamp = (n: number) => Math.max(1, Math.min(n, lines))
  const byStart = useMemo(() => {
    const map = new Map<number, CodeThread[]>()
    for (const t of threads) map.set(clamp(t.lineStart), [...(map.get(clamp(t.lineStart)) ?? []), t])
    return map
  }, [threads, lines])
  const current = open?.kind === 'thread' ? threads.find((t) => t.changeId === open.changeId) : undefined
  const latest = useRef({ byStart, open, threads })
  latest.current = { byStart, open, threads }

  const collection = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null)
  useEffect(() => {
    const own = editor.createDecorationsCollection([])
    collection.current = own
    return () => own.clear()
  }, [editor])

  useEffect(() => {
    if (!collection.current) return
    const items: Monaco.editor.IModelDeltaDecoration[] = []
    for (const t of threads) {
      const on = open?.kind === 'thread' && open.changeId === t.changeId
      items.push({ range: new monaco.Range(clamp(t.lineStart), 1, clamp(t.lineEnd), 1), options: { isWholeLine: true, className: on ? 'cc-range-open' : 'cc-range' } })
    }
    if (open?.kind === 'new') items.push({ range: new monaco.Range(clamp(open.lineStart), 1, clamp(open.lineEnd), 1), options: { isWholeLine: true, className: 'cc-range-open' } })
    for (const [line, list] of byStart) items.push({ range: new monaco.Range(line, 1, line, 1), options: { glyphMarginClassName: `cc-glyph ${countClass(list.length)}`, glyphMarginHoverMessage: { value: m.code_comments__thread_label({ count: list.length }) } } })
    if (hover && !byStart.has(hover)) items.push({ range: new monaco.Range(hover, 1, hover, 1), options: { glyphMarginClassName: 'cc-add', glyphMarginHoverMessage: { value: m.code_comments__add_line() } } })
    collection.current.set(items)
  }, [editor, monaco, threads, open, hover, byStart])

  useEffect(() => {
    const gutter = (type: number) => type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
    const subs = [
      editor.onMouseMove((e) => setHover(gutter(e.target.type) ? (e.target.position?.lineNumber ?? null) : null)),
      editor.onMouseLeave(() => setHover(null)),
      editor.onMouseDown((e) => {
        if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || !e.target.position) return
        const line = e.target.position.lineNumber
        const there = latest.current.byStart.get(line)
        if (there) return setOpen({ kind: 'thread', changeId: there[0]!.changeId })
        const sel = editor.getSelection()
        const covers = sel && !sel.isEmpty() && sel.startLineNumber <= line && line <= sel.endLineNumber
        setPick(null)
        setOpen(covers ? { kind: 'new', lineStart: sel.startLineNumber, lineEnd: sel.endColumn === 1 && sel.endLineNumber > sel.startLineNumber ? sel.endLineNumber - 1 : sel.endLineNumber, text: editor.getModel()?.getValueInRange(sel) } : { kind: 'new', lineStart: line, lineEnd: line })
      }),
      editor.onDidChangeCursorSelection((e) => {
        const sel = e.selection
        const text = editor.getModel()?.getValueInRange(sel) ?? ''
        if (sel.isEmpty() || !text.trim()) return setPick(null)
        const at = editor.getScrolledVisiblePosition({ lineNumber: sel.endLineNumber, column: sel.endColumn })
        if (!at) return setPick(null)
        setPick({ lineStart: sel.startLineNumber, lineEnd: sel.endColumn === 1 && sel.endLineNumber > sel.startLineNumber ? sel.endLineNumber - 1 : sel.endLineNumber, text, top: at.top, left: at.left })
      }),
      editor.onDidScrollChange(() => setPick(null)),
    ]
    return () => subs.forEach((s) => s.dispose())
  }, [editor, monaco])

  useEffect(() => {
    setOpen(null)
    setPick(null)
  }, [file])

  const close = () => setOpen(null)
  const showPick = pick && open?.kind !== 'new'
  return (
    <>
      <style>{STYLE}</style>
      {showPick ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" dir="ltr">
          <Button
            type="button"
            variant="default"
            size="compact"
            data-testid="code-comment-selection"
            className="pointer-events-auto absolute shadow-card"
            style={{ top: Math.max(4, pick.top - 6), left: pick.left + 12 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen({ kind: 'new', lineStart: pick.lineStart, lineEnd: pick.lineEnd, text: pick.text })
              setPick(null)
            }}
          >
            <MessageSquarePlus className="size-4" />
            {m.code_comments__add_selection()}
          </Button>
        </div>
      ) : null}
      {open?.kind === 'new' ? (
        <Zone key={`new-${open.lineStart}-${open.lineEnd}`} editor={editor} after={clamp(open.lineEnd)}>
          <Composer
            comments={comments}
            path={file}
            range={open}
            onCancel={close}
            onDone={(changeId) => setOpen({ kind: 'thread', changeId })}
          />
        </Zone>
      ) : null}
      {current ? (
        <Zone key={`thread-${current.changeId}`} editor={editor} after={clamp(current.lineEnd)}>
          <Thread comments={comments} thread={current} onClose={close} />
        </Zone>
      ) : null}
    </>
  )
}
