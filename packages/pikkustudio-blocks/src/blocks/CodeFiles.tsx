import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState, type Ref } from 'react'
import { ChevronRight, FileText, Folder, FolderOpen, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { EmptyState } from './EmptyState'
import { CardsSkeleton, QueryState } from './QueryState'
import { RowCard, RowStack } from './RowCard'
import { isLocalOnly, kindOf, nameOf, parentOf, type FileEntry } from '../lib/code'
import { useProjectQuery } from '../lib/projectRpc'

const SHOWN = 40

function Crumbs({ folder, onFolder }: { folder: string; onFolder: (path: string) => void }) {
  const parts = folder ? folder.split('/') : []
  return (
    <nav aria-label={m.code_files__where_you_are()} className="flex flex-wrap items-center gap-1">
      <Button variant={parts.length ? 'ghost' : 'selected'} size="compactTight" type="button" onClick={() => onFolder('')}>
        <FolderOpen className="size-4" />
        {m.code_files__all_files()}
      </Button>
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight className="size-4 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
          <Button variant={i === parts.length - 1 ? 'selected' : 'ghost'} size="compactTight" type="button" onClick={() => onFolder(parts.slice(0, i + 1).join('/'))}>
            {asI18n(part)}
          </Button>
        </span>
      ))}
    </nav>
  )
}

function FileRow({ entry, where, onFolder, onFile }: { entry: FileEntry; where?: string; onFolder: (path: string) => void; onFile: (path: string) => void }) {
  const dir = entry.type === 'directory'
  const caption = where !== undefined ? (where ? m.code_files__in_folder({ folder: asI18n(where) }) : m.code_files__at_top()) : dir ? m.code_files__folder() : kindOf(entry.path)
  return (
    <RowCard tile={dir ? <Folder className="size-5.5" /> : <FileText className="size-5.5" />} on={dir} title={asI18n(entry.name)} caption={caption}>
      <Button variant="bordered" size="compact" type="button" onClick={() => (dir ? onFolder(entry.path) : onFile(entry.path))}>
        {dir ? m.code_files__look_inside() : m.code_files__open()}
      </Button>
    </RowCard>
  )
}

function Found({ projectKey, term, onFolder, onFile }: { projectKey: string; term: string; onFolder: (path: string) => void; onFile: (path: string) => void }) {
  const all = useProjectQuery<{ paths: string[]; truncated: boolean }>(projectKey, 'console:listProjectFilePaths', {})
  return (
    <QueryState query={all} skeleton={<CardsSkeleton count={2} />}>
      {(data) => {
        const needle = term.toLowerCase()
        const hits = data.paths.filter((p) => nameOf(p).toLowerCase().includes(needle))
        if (!hits.length)
          return <EmptyState layout="row" icon={Search} title={m.code_files__no_match_title()} text={m.code_files__no_match_text()} />
        return (
          <div className="flex flex-col gap-3">
            {hits.length > SHOWN ? <p className="px-1 text-px14 text-muted-foreground">{m.code_files__more_matches({ count: SHOWN })}</p> : null}
            <RowStack>
              {hits.slice(0, SHOWN).map((p) => (
                <FileRow key={p} entry={{ name: nameOf(p), path: p, type: 'file' }} where={parentOf(p)} onFolder={onFolder} onFile={onFile} />
              ))}
            </RowStack>
          </div>
        )
      }}
    </QueryState>
  )
}

export function CodeFiles({ projectKey, folder, inputRef, onFolder, onFile }: { projectKey: string; folder: string; inputRef: Ref<HTMLInputElement>; onFolder: (path: string) => void; onFile: (path: string) => void }) {
  const [q, setQ] = useState('')
  const term = q.trim()
  const list = useProjectQuery<{ entries: FileEntry[] }>(projectKey, 'console:listProjectFiles', { path: folder })

  if (list.isError && isLocalOnly(list.error))
    return <EmptyState layout="row" icon={FolderOpen} title={m.code_files__local_title()} text={m.code_files__local_text()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 start-3.5 size-5.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="search"
          shape="pill"
          className="h-12 border-[1.5px] border-input bg-field ps-10.5 text-px16 shadow-none md:text-px16"
          placeholder={m.code_files__search_placeholder()}
          aria-label={m.code_files__search_label()}
          autoComplete="off"
          spellCheck={false}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {term ? (
        <Found projectKey={projectKey} term={term} onFolder={(p) => (setQ(''), onFolder(p))} onFile={onFile} />
      ) : (
        <>
          <Crumbs folder={folder} onFolder={onFolder} />
          <QueryState
            query={list}
            skeleton={<CardsSkeleton count={2} />}
            empty={(data) => (data.entries.length ? null : <EmptyState layout="row" icon={Folder} title={m.code_files__empty_title()} text={m.code_files__empty_text()} />)}
          >
            {(data) => (
              <RowStack>
                {data.entries.map((e) => (
                  <FileRow key={e.path} entry={e} onFolder={onFolder} onFile={onFile} />
                ))}
              </RowStack>
            )}
          </QueryState>
        </>
      )}
    </div>
  )
}
