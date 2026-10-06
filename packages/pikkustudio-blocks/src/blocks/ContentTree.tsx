import { m } from '@/i18n/messages'
import { useEffect, useState } from 'react'
import { ChevronRight, Download, File as FileIcon, FileText, Folder, Image, Link2, Music, Package, Table, Trash2, Video } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { Button } from '../ui/button'
import { contentKind, formatBytes, timeAgo, type ContentKind } from '../lib/content'

const ICONS: Record<ContentKind, typeof FileIcon> = { picture: Image, document: FileText, sound: Music, video: Video, data: Table, file: FileIcon }

const COLUMNS = 'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_112px_112px_112px_auto]'

type FileRef = { bucket: string; key: string }

export type ContentTreeProps = {
  side: 'private' | 'public'
  stamp: number
  canDownload: boolean
  canCopy: boolean
  busy: boolean
  copied: string | null
  ownerOf: (folder: string) => string | undefined
  onDownload: (file: FileRef) => void
  onCopy: (file: FileRef) => void
  onRemoveFile: (file: FileRef) => void
  onRemoveFolder: (bucket: string, prefix: string) => void
}

const locale = () => (typeof navigator === 'undefined' ? 'en' : navigator.language)

const Bar = ({ share }: { share: number }) => (
  <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.max(share * 100, share > 0 ? 3 : 0)}%` }} />
  </span>
)

const Confirm = ({ label, keep, busy, onYes, onNo }: { label: string; keep: string; busy: boolean; onYes: () => void; onNo: () => void }) => (
  <div className="flex items-center justify-end gap-2">
    <Button type="button" variant="destructive" size="compact" disabled={busy} onClick={onYes}>{label}</Button>
    <Button type="button" variant="ghost" size="compactTight" onClick={onNo}>{keep}</Button>
  </div>
)

type Who = { id: string; you: boolean } | null
const whoText = (who: Who) => (who ? (who.you ? m.content_tree__you() : m.content_tree__someone()) : m.content_tree__before_tracking())

function FileLine({ file, depth, share, props }: { file: { name: string; bucket: string; key: string; sizeBytes: number; changedAt: string; createdBy: Who }; depth: number; share: number; props: ContentTreeProps }) {
  const [sure, setSure] = useState(false)
  const Icon = ICONS[contentKind(file.name)]
  const id = `${file.bucket}/${file.key}`
  return (
    <li className={`grid ${COLUMNS} items-center gap-x-3 border-t border-border px-3 py-2`}>
      <div className="flex min-w-0 items-center gap-2" style={{ paddingInlineStart: depth * 22 + 22 }}>
        <Icon className="size-4.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-px15 font-semibold">{file.name}</span>
      </div>
      <div className="text-px14 tabular-nums max-md:hidden">
        {formatBytes(file.sizeBytes)}
        <Bar share={share} />
      </div>
      <div className="text-px14 text-ink-2 max-md:hidden">{timeAgo(file.changedAt, locale(), m.content_tree__just_now())}</div>
      <div className="truncate text-px14 text-ink-2 max-md:hidden">{whoText(file.createdBy)}</div>
      {sure ? (
        <Confirm label={m.content_file__remove_it_for_good()} keep={m.content_file__keep_it()} busy={props.busy} onYes={() => { props.onRemoveFile(file); setSure(false) }} onNo={() => setSure(false)} />
      ) : (
        <div className="flex items-center justify-end gap-1">
          {props.canCopy ? (
            <Button type="button" variant="ghost" size="compactTight" disabled={props.busy} onClick={() => props.onCopy(file)} aria-label={m.content_file__copy_link()} title={props.copied === id ? m.content_file__link_copied() : m.content_file__copy_link()}>
              <Link2 className="size-4" />
              {props.copied === id ? m.content_file__link_copied() : null}
            </Button>
          ) : null}
          {props.canDownload ? (
            <Button type="button" variant="ghost" size="compactTight" disabled={props.busy} onClick={() => props.onDownload(file)} aria-label={m.content_file__download()} title={m.content_file__download()}>
              <Download className="size-4" />
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(true)} aria-label={m.content_file__remove()} title={m.content_file__remove()}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </li>
  )
}

function FolderLine({ folder, path, depth, share, props }: { folder: { name: string; fileCount: number; totalBytes: number; lastChanged: string | null }; path: string; depth: number; share: number; props: ContentTreeProps }) {
  const [open, setOpen] = useState(false)
  const [sure, setSure] = useState(false)
  const owner = depth === 0 ? props.ownerOf(folder.name) : undefined
  const [bucket, ...rest] = path.split('/')
  const Icon = owner ? Package : Folder
  return (
    <>
      <li className={`grid ${COLUMNS} items-center gap-x-3 border-t border-border px-3 py-2`}>
        <button type="button" className="flex min-w-0 items-center gap-2 text-start" style={{ paddingInlineStart: depth * 22 }} aria-expanded={open} aria-label={open ? m.content_tree__collapse({ name: folder.name }) : m.content_tree__expand({ name: folder.name })} onClick={() => setOpen(!open)}>
          <ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
          <Icon className="size-4.5 shrink-0 text-primary" />
          <span className="truncate text-px15 font-bold">{folder.name}</span>
          <span className="shrink-0 text-px13 text-muted-foreground">{folder.fileCount === 1 ? m.content_tree__one_file() : m.content_tree__files({ count: folder.fileCount })}</span>
          {owner ? <span className="shrink-0 text-px13 text-muted-foreground max-md:hidden">· {m.content__kept_by_addon({ addon: owner })}</span> : null}
        </button>
        <div className="text-px14 font-semibold tabular-nums max-md:hidden">
          {formatBytes(folder.totalBytes)}
          <Bar share={share} />
        </div>
        <div className="text-px14 text-ink-2 max-md:hidden">{folder.lastChanged ? timeAgo(folder.lastChanged, locale(), m.content_tree__just_now()) : ''}</div>
        <div className="max-md:hidden" />
        {sure ? (
          <Confirm label={m.content_folder__remove_all({ count: folder.fileCount })} keep={m.content_folder__keep_them()} busy={props.busy} onYes={() => { props.onRemoveFolder(bucket!, rest.length ? `${rest.join('/')}/` : ''); setSure(false) }} onNo={() => setSure(false)} />
        ) : (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(true)} aria-label={m.content_folder__remove()} title={m.content_folder__remove()}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </li>
      {open ? <Level path={path} depth={depth + 1} props={props} /> : null}
    </>
  )
}

function LevelPage({ path, depth, cursor, last, onMore, props }: { path: string; depth: number; cursor: string | undefined; last: boolean; onMore: (cursor: string) => void; props: ContentTreeProps }) {
  const query = usePikkuQuery('listContentFolder', { visibility: props.side, path, cursor })
  useEffect(() => {
    if (props.stamp > 0) query.refetch()
  }, [props.stamp])
  if (query.isError) {
    return (
      <li className="flex items-center gap-3 border-t border-border px-3 py-3 text-px14 text-destructive-foreground" style={{ paddingInlineStart: depth * 22 + 12 }}>
        {m.content_tree__failed()}
        <Button type="button" variant="bordered" size="compact" onClick={() => query.refetch()}>{m.content_tree__try_again()}</Button>
      </li>
    )
  }
  if (!query.data) {
    return <li className="border-t border-border px-3 py-3" style={{ paddingInlineStart: depth * 22 + 12 }}><span className="block h-4 w-40 animate-pulse rounded bg-secondary" aria-label={m.content_tree__loading()} /></li>
  }
  const { folders, files, nextCursor } = query.data
  const biggest = Math.max(1, ...folders.map((f) => f.totalBytes), ...files.map((f) => f.sizeBytes))
  const empty = cursor === undefined && folders.length === 0 && files.length === 0
  return (
    <>
      {cursor === undefined ? folders.map((folder) => <FolderLine key={folder.name} folder={folder} path={path ? `${path}/${folder.name}` : folder.name} depth={depth} share={folder.totalBytes / biggest} props={props} />) : null}
      {files.map((file) => <FileLine key={`${file.bucket}/${file.key}`} file={file} depth={depth} share={file.sizeBytes / biggest} props={props} />)}
      {empty && depth > 0 ? <li className="border-t border-border px-3 py-2 text-px14 text-ink-2" style={{ paddingInlineStart: depth * 22 + 22 }}>{m.content_tree__empty_folder()}</li> : null}
      {last && nextCursor ? (
        <li className="border-t border-border px-3 py-2" style={{ paddingInlineStart: depth * 22 + 12 }}>
          <Button type="button" variant="bordered" size="compact" onClick={() => onMore(nextCursor)}>{m.content_tree__more()}</Button>
        </li>
      ) : null}
    </>
  )
}

function Level({ path, depth, props }: { path: string; depth: number; props: ContentTreeProps }) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  return (
    <>
      {cursors.map((cursor, index) => (
        <LevelPage key={cursor ?? 'first'} path={path} depth={depth} cursor={cursor} last={index === cursors.length - 1} onMore={(next) => setCursors([...cursors, next])} props={props} />
      ))}
    </>
  )
}

export function ContentTree(props: ContentTreeProps) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className={`grid ${COLUMNS} gap-x-3 px-3 py-2 text-px13 font-bold text-muted-foreground`}>
        <div>{m.content_tree__name()}</div>
        <div className="max-md:hidden">{m.content_tree__size()}</div>
        <div className="max-md:hidden">{m.content_tree__changed()}</div>
        <div className="max-md:hidden">{m.content_tree__by()}</div>
        <div />
      </div>
      <ul key={props.side}>
        <Level path="" depth={0} props={props} />
      </ul>
    </div>
  )
}
