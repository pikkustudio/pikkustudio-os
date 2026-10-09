import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileX, Save } from 'lucide-react'
import type { OnMount } from '@monaco-editor/react'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'
import { FixNotice } from './FixNotice'
import { SlimHead } from './SlimHead'
import { CardsSkeleton, QueryState } from './QueryState'
import { StatusLine } from './StatusLine'
import { detailsOf, faultOf } from './ErrorState'
import { languageOf, nameOf, type FileBody } from '../lib/code'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'

const Monaco = lazy(async () => {
  await import('../lib/monaco')
  return import('@monaco-editor/react')
})

const dark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

function Open({ projectKey, file, body, onBack }: { projectKey: string; file: string; body: FileBody; onBack: () => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const save = useProjectAction<{ path: string; content: string }>(projectKey, 'console:writeProjectFile', ['console:readProjectFile'])
  const editable = !body.binary && !body.truncated
  const dirty = draft !== null && draft !== body.content
  const go = useRef<() => void>(() => {})
  go.current = () => {
    if (dirty && editable && !save.isPending) save.mutate({ path: file, content: draft! }, { onSuccess: () => setDraft(null) })
  }
  useEffect(() => setLeaving(false), [dirty])
  const onMount: OnMount = (editor, monaco) => editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => go.current())
  const back = () => (dirty ? setLeaving(true) : onBack())

  const status = save.isPending
    ? <StatusLine tone="wait" text={m.code_editor__saving()} />
    : dirty
      ? <StatusLine tone="bad" text={m.code_editor__unsaved()} />
      : <StatusLine tone="ok" text={m.code_editor__all_saved()} />

  return (
    <>
      <SlimHead crumb={asI18n(file)} title={asI18n(nameOf(file))}>
        {editable ? status : null}
        <Button variant="bordered" size="compact" type="button" onClick={back}>
          <ArrowLeft className="size-4 rtl:-scale-x-100" />
          {m.code_editor__back()}
        </Button>
        {editable ? (
          <Button variant="default" size="compact" type="button" disabled={!dirty || save.isPending} onClick={() => go.current()}>
            <Save className="size-4" />
            {m.code_editor__save()}
          </Button>
        ) : null}
      </SlimHead>
      {leaving ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-warning bg-card px-4 py-3 shadow-card">
          <b className="flex-1 basis-56 text-px16">{m.code_editor__leave_ask()}</b>
          <Button variant="bordered" size="compact" type="button" onClick={onBack}>{m.code_editor__leave()}</Button>
          <Button variant="default" size="compact" type="button" onClick={() => setLeaving(false)}>{m.code_editor__keep_editing()}</Button>
        </div>
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
        <div className="min-h-[420px] flex-1 overflow-hidden rounded-card border border-border bg-card shadow-card" dir="ltr">
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
              options={{ readOnly: !editable, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 14, wordWrap: 'on', contextmenu: false, padding: { top: 12, bottom: 12 }, ariaLabel: m.code_editor__contents() }}
            />
          </Suspense>
        </div>
      )}
    </>
  )
}

export function CodeEditor({ projectKey, file, onBack }: { projectKey: string; file: string; onBack: () => void }) {
  const read = useProjectQuery<FileBody>(projectKey, 'console:readProjectFile', { path: file })
  return (
    <QueryState query={read} skeleton={<CardsSkeleton count={2} />}>
      {(body) => <Open key={`${file}:${body.content.length}`} projectKey={projectKey} file={file} body={body} onBack={onBack} />}
    </QueryState>
  )
}
