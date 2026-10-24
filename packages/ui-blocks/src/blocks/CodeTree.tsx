import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Search } from 'lucide-react'
import { Input } from '../ui/input'
import { cn } from '../lib/utils'
import { nameOf, parentOf, type FileEntry } from '../lib/code'
import { useProjectQuery } from '../lib/projectRpc'

function Level({ projectKey, dir, depth, file, onFile, open, toggle }: { projectKey: string; dir: string; depth: number; file?: string; onFile: (path: string) => void; open: Set<string>; toggle: (path: string) => void }) {
  const list = useProjectQuery<{ entries: FileEntry[] }>(projectKey, 'console:listProjectFiles', { path: dir })
  if (list.isError) return <p className="px-2 py-1 text-px14 text-destructive" style={{ paddingInlineStart: depth * 12 + 8 }}>{m.code_tree__load_error()}</p>
  if (!list.data) return <div className="mx-2 my-1 h-4 animate-pulse rounded bg-secondary" role="status" aria-busy="true" />
  return (
    <>
      {list.data.entries.map((e) => {
        const isDir = e.type === 'directory'
        const isOpen = open.has(e.path)
        const on = e.path === file
        const Icon = isDir ? (isOpen ? FolderOpen : Folder) : FileText
        return (
          <div key={e.path}>
            <button
              type="button"
              aria-expanded={isDir ? isOpen : undefined}
              aria-current={on ? 'true' : undefined}
              onClick={() => (isDir ? toggle(e.path) : onFile(e.path))}
              className={cn('flex w-full items-center gap-1 rounded-md py-1 pe-2 text-start text-px14 hover:bg-secondary', on && 'bg-primary text-primary-foreground hover:bg-primary')}
              style={{ paddingInlineStart: depth * 12 + 8 }}
            >
              {isDir ? (isOpen ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0 rtl:-scale-x-100" />) : <span className="w-3 shrink-0" />}
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{asI18n(e.name)}</span>
            </button>
            {isDir && isOpen ? <Level projectKey={projectKey} dir={e.path} depth={depth + 1} file={file} onFile={onFile} open={open} toggle={toggle} /> : null}
          </div>
        )
      })}
    </>
  )
}

function Found({ projectKey, term, file, onFile }: { projectKey: string; term: string; file?: string; onFile: (path: string) => void }) {
  const all = useProjectQuery<{ paths: string[]; truncated: boolean }>(projectKey, 'console:listProjectFilePaths', {})
  if (!all.data) return <div className="mx-2 my-1 h-4 animate-pulse rounded bg-secondary" role="status" aria-busy="true" />
  const needle = term.toLowerCase()
  const hits = all.data.paths.filter((p) => nameOf(p).toLowerCase().includes(needle)).slice(0, 60)
  if (!hits.length) return <p className="px-2 py-1 text-px14 text-muted-foreground">{m.code_files__no_match_title()}</p>
  return (
    <>
      {hits.map((p) => (
        <button key={p} type="button" onClick={() => onFile(p)} aria-current={p === file ? 'true' : undefined} className={cn('flex w-full flex-col rounded-md px-2 py-1 text-start hover:bg-secondary', p === file && 'bg-primary text-primary-foreground hover:bg-primary')}>
          <span className="truncate text-px14">{asI18n(nameOf(p))}</span>
          <span className="truncate text-[12px] opacity-70">{asI18n(parentOf(p) || '/')}</span>
        </button>
      ))}
    </>
  )
}

export function CodeTree({ projectKey, file, onFile }: { projectKey: string; file?: string; onFile: (path: string) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Set<string>>(() => {
    const parts = (file ?? '').split('/').slice(0, -1)
    return new Set(parts.map((_, i) => parts.slice(0, i + 1).join('/')))
  })
  const toggle = (path: string) => setOpen((prev) => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next })
  const term = q.trim()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative px-2 pt-2">
        <Search className="pointer-events-none absolute top-1/2 start-4.5 size-4 translate-y-[-30%] text-muted-foreground" aria-hidden="true" />
        <Input type="search" className="h-9 ps-8 text-px14" placeholder={m.code_files__search_placeholder()} aria-label={m.code_files__search_label()} autoComplete="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <nav aria-label={m.code_screen__files()} className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {term ? <Found projectKey={projectKey} term={term} file={file} onFile={(p) => (setQ(''), onFile(p))} /> : <Level projectKey={projectKey} dir="" depth={0} file={file} onFile={onFile} open={open} toggle={toggle} />}
      </nav>
    </div>
  )
}
