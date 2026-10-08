import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronRight, Download, File as FileIcon, FileText, Folder, Image, Link2, Music, Package, Table, Trash2, Video } from 'lucide-react'
import { asyncDataLoaderFeature, hotkeysCoreFeature, type ItemInstance } from '@headless-tree/core'
import { useTree } from '@headless-tree/react'
import { usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
import { Button } from '../ui/button'
import { contentKind, formatBytes, timeAgo, type ContentKind } from '../lib/content'

const ICONS: Record<ContentKind, typeof FileIcon> = { picture: Image, document: FileText, sound: Music, video: Video, data: Table, file: FileIcon }

const COLUMNS = 'grid-cols-[2rem_minmax(0,1fr)_7rem] md:grid-cols-[2rem_minmax(0,1fr)_7rem_7rem_7rem_11rem]'

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

const Confirm = ({ label, keep, busy, onYes, onNo }: { label: I18nString; keep: I18nString; busy: boolean; onYes: () => void; onNo: () => void }) => (
  <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
    <Button type="button" variant="destructive" size="compact" disabled={busy} onClick={onYes}>{label}</Button>
    <Button type="button" variant="ghost" size="compactTight" onClick={onNo}>{keep}</Button>
  </div>
)

type Who = { id: string; you: boolean } | null
const whoText = (who: Who) => (who ? (who.you ? m.content_tree__you() : m.content_tree__someone()) : m.content_tree__before_tracking())

type FileNode = { kind: 'file'; id: string; name: string; bucket: string; key: string; sizeBytes: number; changedAt: string; createdBy: Who }
type FolderNode = { kind: 'folder'; id: string; name: string; path: string; fileCount: number; totalBytes: number; lastChanged: string | null }
type MoreNode = { kind: 'more'; id: string; path: string }
type EmptyNode = { kind: 'empty'; id: string; path: string }
type RootNode = { kind: 'root'; id: string }
type Node = FileNode | FolderNode | MoreNode | EmptyNode | RootNode

const ROOT = 'root'
const STEP = 22

const isRtl = () => typeof document !== 'undefined' && document.dir === 'rtl'
const selectable = (node: Node) => node.kind === 'file' || node.kind === 'folder'

type RowProps = { item: ItemInstance<Node>; props: ContentTreeProps; picked: boolean; onPick: (id: string, range: boolean) => void; onMore: (path: string) => void }

const Pick = ({ name, picked, onChange }: { name: string; picked: boolean; onChange: (range: boolean) => void }) => (
  <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
    <input type="checkbox" className="size-4 accent-primary" checked={picked} aria-label={m.content_tree__select({ name })} onClick={(e) => onChange(e.shiftKey)} onChange={() => undefined} />
  </div>
)

function Row({ item, props, picked, onPick, onMore }: RowProps) {
  const [sure, setSure] = useState(false)
  const node = item.getItemData()
  const level = item.getItemMeta().level
  const pad = (extra: number) => `${level * STEP + extra}px`
  const base = `group grid ${COLUMNS} min-h-12 items-center gap-x-3 border-t border-border px-3 py-2 outline-none focus-visible:bg-secondary`
  const tint = picked ? 'bg-primary/10' : node.kind === 'folder' ? 'bg-secondary/60' : 'bg-card'
  const row = `${base} ${tint}`
  const stop = { onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(), onClick: (e: React.MouseEvent) => e.stopPropagation() }

  if (node.kind === 'empty') {
    return (
      <div {...item.getProps()} className={`${row} text-px14 text-ink-2`}>
        <div />
        <div className="ps-(--pad)" style={{ '--pad': pad(24) } as CSSProperties}>{m.content_tree__empty_folder()}</div>
      </div>
    )
  }
  if (node.kind === 'more') {
    return (
      <div {...item.getProps()} className={row}>
        <div />
        <div className="ps-(--pad)" style={{ '--pad': pad(24) } as CSSProperties}>
          <Button type="button" variant="bordered" size="compact" onClick={() => onMore(node.path)}>{m.content_tree__more()}</Button>
        </div>
      </div>
    )
  }
  if (node.kind === 'folder') {
    const owner = level === 0 ? props.ownerOf(node.name) : undefined
    const Icon = owner ? Package : Folder
    const [bucket, ...rest] = node.path.split('/')
    return (
      <div {...item.getProps()} className={`${row} cursor-pointer`}>
        <Pick name={node.name} picked={picked} onChange={(range) => onPick(node.id, range)} />
        <div className="flex min-w-0 items-center gap-2 ps-(--pad)" style={{ '--pad': pad(0) } as CSSProperties}>
          <ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform rtl:-scale-x-100 ${item.isExpanded() ? 'rotate-90 rtl:-rotate-90' : ''}`} aria-hidden="true" />
          <Icon className="size-4.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate text-px15 font-bold">{asI18n(node.name)}</span>
          <span className="shrink-0 text-px13 text-muted-foreground">{m.content_tree__file_count({ count: node.fileCount })}</span>
          {item.isLoading() ? <span className="size-3 shrink-0 animate-pulse rounded-full bg-secondary" aria-label={m.content_tree__loading()} /> : null}
          {owner ? <span className="shrink-0 text-px13 text-muted-foreground max-md:hidden">{sep('· ')}{m.content__kept_by_addon({ addon: owner })}</span> : null}
        </div>
        <div className="text-px14 font-semibold tabular-nums max-md:hidden">{formatBytes(node.totalBytes)}</div>
        <div className="text-px14 text-ink-2 max-md:hidden">{node.lastChanged ? timeAgo(node.lastChanged, locale(), m.content_tree__just_now()) : null}</div>
        <div className="max-md:hidden" />
        <div {...stop}>
          {sure ? (
            <Confirm label={m.content_folder__remove_all({ count: node.fileCount })} keep={m.content_folder__keep_them()} busy={props.busy} onYes={() => { props.onRemoveFolder(bucket!, rest.length ? `${rest.join('/')}/` : ''); setSure(false) }} onNo={() => setSure(false)} />
          ) : (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="compactTight" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100" onClick={() => setSure(true)} aria-label={m.content_folder__remove()} title={m.content_folder__remove()}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }
  if (node.kind === 'root') return null
  const Icon = ICONS[contentKind(node.name)]
  const id = `${node.bucket}/${node.key}`
  return (
    <div {...item.getProps()} className={row}>
      <Pick name={node.name} picked={picked} onChange={(range) => onPick(node.id, range)} />
      <div className="flex min-w-0 items-center gap-2 ps-(--pad)" style={{ '--pad': pad(24) } as CSSProperties}>
        <Icon className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate text-px15 font-semibold">{asI18n(node.name)}</span>
      </div>
      <div className="text-px14 tabular-nums max-md:hidden">{formatBytes(node.sizeBytes)}</div>
      <div className="text-px14 text-ink-2 max-md:hidden">{timeAgo(node.changedAt, locale(), m.content_tree__just_now())}</div>
      <div className="truncate text-px14 text-ink-2 max-md:hidden">{whoText(node.createdBy)}</div>
      <div {...stop}>
        {sure ? (
          <Confirm label={m.content_file__remove_it_for_good()} keep={m.content_file__keep_it()} busy={props.busy} onYes={() => { props.onRemoveFile(node); setSure(false) }} onNo={() => setSure(false)} />
        ) : (
          <div className="flex items-center justify-end gap-1">
            {props.canCopy ? (
              <Button type="button" variant="ghost" size="compactTight" disabled={props.busy} onClick={() => props.onCopy(node)} aria-label={m.content_file__copy_link()} title={props.copied === id ? m.content_file__link_copied() : m.content_file__copy_link()}>
                <Link2 className="size-4" />
                {props.copied === id ? m.content_file__link_copied() : null}
              </Button>
            ) : null}
            {props.canDownload ? (
              <Button type="button" variant="ghost" size="compactTight" disabled={props.busy} onClick={() => props.onDownload(node)} aria-label={m.content_file__download()} title={m.content_file__download()}>
                <Download className="size-4" />
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="compactTight" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100" onClick={() => setSure(true)} aria-label={m.content_file__remove()} title={m.content_file__remove()}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ContentTree(props: ContentTreeProps) {
  const list = usePikkuMutation('listContentFolder')
  const nodes = useRef(new Map<string, Node>([[ROOT, { kind: 'root', id: ROOT }]]))
  const levels = useRef(new Map<string, { ids: string[]; cursor: string | null }>())
  const latest = useRef({ side: props.side, list })
  latest.current = { side: props.side, list }
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [asking, setAsking] = useState(false)
  const anchor = useRef<string | null>(null)

  const load = async (path: string, more: boolean): Promise<string[]> => {
    const before = more ? levels.current.get(path) : undefined
    const result = await latest.current.list.mutateAsync({ visibility: latest.current.side, path, cursor: before?.cursor ?? undefined })
    const ids = (before?.ids ?? []).filter((id) => !id.startsWith('m:'))
    for (const folder of result.folders) {
      const full = path ? `${path}/${folder.name}` : folder.name
      const id = `d:${full}`
      nodes.current.set(id, { kind: 'folder', id, name: folder.name, path: full, fileCount: folder.fileCount, totalBytes: folder.totalBytes, lastChanged: folder.lastChanged })
      ids.push(id)
    }
    for (const file of result.files) {
      const id = `f:${file.bucket}/${file.key}`
      nodes.current.set(id, { kind: 'file', id, name: file.name, bucket: file.bucket, key: file.key, sizeBytes: file.sizeBytes, changedAt: file.changedAt, createdBy: file.createdBy })
      ids.push(id)
    }
    if (result.nextCursor) {
      nodes.current.set(`m:${path}`, { kind: 'more', id: `m:${path}`, path })
      ids.push(`m:${path}`)
    } else if (ids.length === 0 && path) {
      nodes.current.set(`e:${path}`, { kind: 'empty', id: `e:${path}`, path })
      ids.push(`e:${path}`)
    }
    levels.current.set(path, { ids, cursor: result.nextCursor })
    return ids
  }

  const pathOf = (id: string) => (id === ROOT ? '' : (nodes.current.get(id) as FolderNode).path)

  const below = (id: string) => {
    if (!id.startsWith('d:')) return []
    const path = id.slice(2)
    return [...nodes.current.keys()].filter((key) => key.startsWith(`d:${path}/`) || key.startsWith(`f:${path}/`))
  }

  const up = (id: string) => {
    const out: string[] = []
    let at = tree.getItemInstance(id).getItemMeta().parentId
    while (at && at !== ROOT) {
      out.push(at)
      at = tree.getItemInstance(at).getItemMeta().parentId
    }
    return out
  }

  const covered = (id: string, set: Set<string>) => set.has(id) || up(id).some((parent) => set.has(parent))

  const toggle = (id: string) =>
    setPicked((now) => {
      const next = new Set(now)
      if (covered(id, now)) {
        const parents = up(id).filter((parent) => now.has(parent))
        next.delete(id)
        for (const parent of parents) {
          next.delete(parent)
          for (const key of below(parent)) if (key !== id && !up(id).includes(key) && !below(id).includes(key)) next.add(key)
        }
        for (const key of below(id)) next.delete(key)
      } else {
        next.add(id)
        for (const key of below(id)) next.add(key)
      }
      return next
    })

  const tree = useTree<Node>({
    rootItemId: ROOT,
    getItemName: (item) => {
      const node = item.getItemData()
      return node.kind === 'file' || node.kind === 'folder' ? node.name : ''
    },
    isItemFolder: (item) => {
      const kind = item.getItemData().kind
      return kind === 'folder' || kind === 'root'
    },
    createLoadingItemData: () => ({ kind: 'empty', id: 'loading', path: '' }),
    dataLoader: {
      getItem: (id) => nodes.current.get(id)!,
      getChildren: (id) => load(pathOf(id), false),
    },
    indent: STEP,
    hotkeys: {
      customPick: {
        hotkey: 'Space',
        preventDefault: true,
        handler: (_e, instance) => {
          const focused = instance.getFocusedItem()
          if (selectable(focused.getItemData())) toggle(focused.getId())
        },
      },
      ...(isRtl() ? { expandOrDown: { hotkey: 'ArrowLeft' }, collapseOrUp: { hotkey: 'ArrowRight' } } : {}),
    },
    features: [asyncDataLoaderFeature, hotkeysCoreFeature],
  })

  const more = async (path: string) => {
    await load(path, true)
    await tree.getItemInstance(path ? `d:${path}` : ROOT).invalidateChildrenIds()
  }

  useEffect(() => {
    if (props.stamp === 0) return
    levels.current.clear()
    setPicked(new Set())
    const open = tree.getItems().filter((item) => item.isFolder() && item.isExpanded()).map((item) => item.getId())
    for (const id of [ROOT, ...open]) void tree.getItemInstance(id).invalidateChildrenIds()
  }, [props.stamp])

  const items = tree.getItems().filter((item) => item.getId() !== ROOT)
  const shown = items.filter((item) => selectable(item.getItemData())).map((item) => item.getId())
  const top = [...picked].filter((id) => !up(id).some((parent) => picked.has(parent))).length
  const allPicked = shown.length > 0 && shown.every((id) => covered(id, picked))

  const pick = (id: string, range: boolean) => {
    if (range && anchor.current && shown.includes(anchor.current)) {
      const [a, b] = [shown.indexOf(anchor.current), shown.indexOf(id)].sort((x, y) => x - y)
      for (const key of shown.slice(a, b! + 1)) if (!covered(key, picked)) toggle(key)
    } else toggle(id)
    anchor.current = id
  }

  const removePicked = () => {
    for (const id of picked) {
      if (up(id).some((parent) => picked.has(parent))) continue
      const node = nodes.current.get(id)
      if (node?.kind === 'file') props.onRemoveFile(node)
      else if (node?.kind === 'folder') {
        const [bucket, ...rest] = node.path.split('/')
        props.onRemoveFolder(bucket!, rest.length ? `${rest.join('/')}/` : '')
      }
    }
    setPicked(new Set())
    setAsking(false)
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className={`grid ${COLUMNS} h-12 items-center gap-x-3 px-3 text-px13 font-bold text-muted-foreground ${top > 0 ? 'bg-primary/10' : ''}`}>
        <div className="flex items-center justify-center">
          <input type="checkbox" className="size-4 accent-primary" checked={allPicked} aria-label={m.content_tree__select_all()} onChange={() => setPicked(allPicked ? new Set() : new Set(shown))} />
        </div>
        {top > 0 ? (
          <>
            <div className="truncate text-px14 text-foreground">{m.content_tree__selected({ count: top })}</div>
            <div className="col-span-1 flex items-center justify-end gap-2 md:col-span-4">
              {asking ? (
                <Confirm label={m.content_tree__remove_selected({ count: top })} keep={m.content_folder__keep_them()} busy={props.busy} onYes={removePicked} onNo={() => setAsking(false)} />
              ) : (
                <Button type="button" variant="bordered" size="compact" onClick={() => setAsking(true)}>
                  <Trash2 className="size-4" />
                  {m.content_tree__remove_selected_ask()}
                </Button>
              )}
              <Button type="button" variant="ghost" size="compactTight" onClick={() => { setPicked(new Set()); setAsking(false) }}>{m.content_tree__clear()}</Button>
            </div>
          </>
        ) : (
          <>
            <div>{m.content_tree__name()}</div>
            <div className="max-md:hidden">{m.content_tree__size()}</div>
            <div className="max-md:hidden">{m.content_tree__changed()}</div>
            <div className="max-md:hidden">{m.content_tree__by()}</div>
            <div />
          </>
        )}
      </div>
      <div {...tree.getContainerProps(m.content__all_folders())}>
        {items.map((item) => (
          <Row key={item.getId()} item={item} props={props} picked={covered(item.getId(), picked)} onPick={pick} onMore={more} />
        ))}
      </div>
    </div>
  )
}
