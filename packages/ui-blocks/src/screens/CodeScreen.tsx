import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { FolderTree, FileCode } from 'lucide-react'
import { Button } from '../ui/button'
import { CodeEditor } from '../blocks/CodeEditor'
import { CodeTree } from '../blocks/CodeTree'
import { EmptyState } from '../blocks/EmptyState'
import { SlimHead } from '../blocks/SlimHead'
import { Page } from '../blocks/Page'
import { isLocalOnly, type FileEntry } from '../lib/code'
import { encodePath, keepSearch } from '../lib/project-url'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'

export function CodeScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const navigate = useNavigate()
  const file = (useParams({ strict: false }) as { _splat?: string })._splat || undefined
  const [pending, setPending] = useState<string | null>(null)
  const [files, setFiles] = useState(true)
  const dirty = useRef(false)
  const onDirty = useCallback((d: boolean) => { dirty.current = d }, [])
  const root = useProjectQuery<{ entries: FileEntry[] }>(key, 'console:listProjectFiles', { path: '' })
  const go = (path: string | undefined) => navigate({ to: (path ? `/code/${encodePath(path)}` : '/code') as never, search: keepSearch as never })
  const pick = (path: string) => {
    if (path === file) return
    if (dirty.current) return setPending(path)
    setPending(null)
    go(path)
    setFiles(false)
  }

  if (root.isError && isLocalOnly(root.error))
    return (
      <Page gap="snug" width="full">
        <SlimHead crumb={projectName} title={m.code_screen__title()} />
        <EmptyState layout="row" icon={FolderTree} title={m.code_files__local_title()} text={m.code_files__local_text()} />
      </Page>
    )

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--dev-bar,0px)-4rem)] min-h-[480px] w-full flex-col gap-3">
      <div className="@min-[900px]/app:hidden">
        <Button variant="bordered" size="compact" type="button" aria-expanded={files} onClick={() => setFiles((v) => !v)}>
          <FolderTree className="size-4" />
          {files ? m.code_screen__hide_files() : m.code_screen__show_files()}
        </Button>
      </div>
      {pending ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-warning bg-card px-4 py-3 shadow-card">
          <b className="flex-1 basis-56 text-px16">{m.code_editor__leave_ask()}</b>
          <Button variant="bordered" size="compact" type="button" onClick={() => { dirty.current = false; const p = pending; setPending(null); go(p); setFiles(false) }}>{m.code_editor__leave()}</Button>
          <Button variant="default" size="compact" type="button" onClick={() => setPending(null)}>{m.code_editor__keep_editing()}</Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 gap-4 @max-[900px]/app:flex-col">
        <aside data-testid="code-files-panel" className={`flex min-h-0 w-[264px] shrink-0 flex-col overflow-hidden rounded-card border border-border bg-card shadow-card @max-[900px]/app:w-full @max-[900px]/app:max-h-[50%] ${files ? '' : '@max-[900px]/app:hidden'}`}>
          <div className="flex items-center gap-2 px-3 pt-3 text-px14 font-bold">
            <FolderTree className="size-4 text-primary" aria-hidden="true" />
            {m.code_screen__files()}
          </div>
          <CodeTree projectKey={key} file={file} onFile={pick} />
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card shadow-card">
          {file ? (
            <CodeEditor projectKey={key} file={file} onDirty={onDirty} />
          ) : (
            <div className="m-auto p-6">
              <EmptyState layout="row" icon={FileCode} title={m.code_screen__pick_title()} text={m.code_screen__pick_text()} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
