import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { FileX, Save } from 'lucide-react'
import type { OnMount } from '@monaco-editor/react'
import { CommentLayer, CommentsStrip } from './CodeComments'
import { useCodeThreads } from '../lib/codeComments'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'
import { FixNotice } from './FixNotice'
import { CardsSkeleton, QueryState } from './QueryState'
import { StatusLine } from './StatusLine'
import { detailsOf, faultOf } from './ErrorState'
import { languageOf, nameOf, type FileBody } from '../lib/code'
import { useProjectTarget } from '../lib/project-target'
import { Alert } from '../ui/alert'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'

const Monaco = lazy(async () => {
  await import('../lib/monaco')
  return import('@monaco-editor/react')
})

const dark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

function Open({ projectKey, file, body, onDirty }: { projectKey: string; file: string; body: FileBody; onDirty: (dirty: boolean) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const save = useProjectAction<{ path: string; content: string }>(projectKey, 'console:writeProjectFile', ['console:readProjectFile'])
  const target = useProjectTarget()
  const locked = target.readOnly || !!target.changesOnly
  const editable = !body.binary && !body.truncated && !locked
  const dirty = draft !== null && draft !== body.content
  const go = useRef<() => void>(() => {})
  go.current = () => {
    if (dirty && editable && !save.isPending) save.mutate({ path: file, content: draft! }, { onSuccess: () => setDraft(null) })
  }
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  const comments = useCodeThreads(projectKey, file)
  const [ed, setEd] = useState<{ editor: Parameters<OnMount>[0]; monaco: Parameters<OnMount>[1] } | null>(null)
  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => go.current())
    setEd({ editor, monaco })
  }

  const status = save.isPending
    ? <StatusLine tone="wait" text={m.code_editor__saving()} />
    : dirty
      ? <StatusLine tone="bad" text={m.code_editor__unsaved()} />
      : <StatusLine tone="ok" text={m.code_editor__all_saved()} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-muted-foreground">{asI18n(file)}</div>
          <h2 className="truncate text-px16 font-bold">{asI18n(nameOf(file))}</h2>
        </div>
        {editable ? (
          <div className="flex items-center gap-2.5">
            {status}
            <Button variant="default" size="compact" type="button" disabled={!dirty || save.isPending} onClick={() => go.current()}>
              <Save className="size-4" />
              {m.code_editor__save()}
            </Button>
          </div>
        ) : null}
      </div>
      {target.changesOnly ? (
        <Alert variant="info" role="status" data-testid="changes-only-notice">
          <p className="text-px14 text-pretty text-ink-2">{m.code_editor__changes_only()}</p>
        </Alert>
      ) : null}
      {save.isError ? (
        <FixNotice
          title={m.code_editor__save_failed_title()}
          body={m.code_editor__save_failed_text()}
          ask={m.code_editor__fix_ask({ path: asI18n(file), details: detailsOf(faultOf(save.error), file) })}
          onRetry={() => go.current()}
          retrying={save.isPending}
        />
      ) : null}
      {body.binary ? (
        <EmptyState layout="row" icon={FileX} title={m.code_editor__not_text_title()} text={m.code_editor__not_text_text()} />
      ) : (
        <>
        <CommentsStrip comments={comments} />
        <div className="relative min-h-0 flex-1 overflow-hidden" dir="ltr">
          <Suspense fallback={<div className="h-full animate-pulse bg-secondary" role="status" aria-busy="true" />}>
            <Monaco
              key={file}
              height="100%"
              path={file}
              language={languageOf(file)}
              defaultValue={body.content}
              onChange={(v) => setDraft(v ?? '')}
              onMount={onMount}
              theme={dark() ? 'vs-dark' : 'vs'}
              loading={<div className="h-full animate-pulse bg-secondary" />}
              options={{ readOnly: !editable, glyphMargin: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 14, wordWrap: 'on', contextmenu: false, padding: { top: 12, bottom: 12 }, ariaLabel: m.code_editor__contents() }}
            />
          </Suspense>
          {ed ? <CommentLayer editor={ed.editor} monaco={ed.monaco} file={file} comments={comments} /> : null}
        </div>
        </>
      )}
    </div>
  )
}

export function CodeEditor({ projectKey, file, onDirty }: { projectKey: string; file: string; onDirty: (dirty: boolean) => void }) {
  const read = useProjectQuery<FileBody>(projectKey, 'console:readProjectFile', { path: file })
  return (
    <QueryState query={read} skeleton={<CardsSkeleton count={2} />}>
      {(body) => <Open key={`${file}:${body.content.length}`} projectKey={projectKey} file={file} body={body} onDirty={onDirty} />}
    </QueryState>
  )
}
