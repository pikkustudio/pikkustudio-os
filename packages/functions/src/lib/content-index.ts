import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { ContentSideName } from './content-store.js'

export type ContentAuthor = { by: string; at: string; updatedBy: string; updatedAt: string }

export type FolderEntry = { name: string; fileCount: number; totalBytes: number; lastChanged: string | null }
export type FileEntry = {
  name: string
  bucket: string
  key: string
  contentType: string | null
  sizeBytes: number
  createdAt: string
  changedAt: string
  author: ContentAuthor | null
}

const contentRoot = (content: unknown): string | null => {
  const root = (content as { config?: { localFileUploadPath?: string } } | undefined)?.config?.localFileUploadPath
  return root ? resolve(root) : null
}

const indexFile = (root: string) => join(root, '.authors.json')

const readIndex = async (root: string): Promise<Record<string, ContentAuthor>> => {
  try {
    return JSON.parse(await readFile(indexFile(root), 'utf8'))
  } catch {
    return {}
  }
}

let writing: Promise<unknown> = Promise.resolve()

export const recordContentAuthor = (content: unknown, side: ContentSideName, bucket: string, key: string, userId: string | undefined) => {
  const root = contentRoot(content)
  if (!root || !userId) return Promise.resolve()
  const id = `${side}/${bucket}/${key}`
  const now = new Date().toISOString()
  writing = writing.then(async () => {
    const index = await readIndex(root)
    const before = index[id]
    index[id] = { by: before?.by ?? userId, at: before?.at ?? now, updatedBy: userId, updatedAt: now }
    await mkdir(dirname(indexFile(root)), { recursive: true })
    await writeFile(indexFile(root), JSON.stringify(index))
  }).catch(() => undefined)
  return writing
}

const walk = async (dir: string, onFile: (path: string, rel: string) => Promise<void>, rel = ''): Promise<void> => {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const next = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) await walk(join(dir, entry.name), onFile, next)
    else if (entry.isFile()) await onFile(join(dir, entry.name), next)
  }
}

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json',
  mp4: 'video/mp4', mp3: 'audio/mpeg', zip: 'application/zip',
}
const typeOf = (name: string) => MIME[name.split('.').pop()?.toLowerCase() ?? ''] ?? null

export const listContentFolder = async (
  content: unknown,
  side: ContentSideName,
  path: string,
  limit: number,
  cursor: string | undefined
): Promise<{ supported: boolean; folders: FolderEntry[]; files: FileEntry[]; nextCursor: string | null }> => {
  const root = contentRoot(content)
  if (!root) return { supported: false, folders: [], files: [], nextCursor: null }
  const base = resolve(root, side)
  const clean = path.split('/').filter((part) => part && part !== '.' && part !== '..')
  const here = resolve(base, ...clean)
  if (here !== base && !here.startsWith(base + '/')) return { supported: true, folders: [], files: [], nextCursor: null }
  const index = await readIndex(root)
  const folders = new Map<string, FolderEntry>()
  const files: FileEntry[] = []
  let entries
  try {
    entries = await readdir(here, { withFileTypes: true })
  } catch {
    return { supported: true, folders: [], files: [], nextCursor: null }
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = join(here, entry.name)
    if (entry.isDirectory()) {
      const folder: FolderEntry = { name: entry.name, fileCount: 0, totalBytes: 0, lastChanged: null }
      await walk(full, async (file) => {
        const info = await stat(file)
        folder.fileCount++
        folder.totalBytes += info.size
        const changed = info.mtime.toISOString()
        if (!folder.lastChanged || changed > folder.lastChanged) folder.lastChanged = changed
      })
      folders.set(entry.name, folder)
    } else if (entry.isFile()) {
      const info = await stat(full)
      const key = [...clean, entry.name].join('/')
      const [bucket, ...rest] = key.split('/')
      const author = index[`${side}/${bucket}/${rest.join('/')}`] ?? null
      files.push({
        name: entry.name,
        bucket: bucket!,
        key: rest.join('/'),
        contentType: typeOf(entry.name),
        sizeBytes: info.size,
        createdAt: author?.at ?? info.birthtime.toISOString(),
        changedAt: info.mtime.toISOString(),
        author,
      })
    }
  }
  files.sort((a, b) => a.name.localeCompare(b.name))
  const start = cursor ? files.findIndex((file) => file.name > cursor) : 0
  const page = start < 0 ? [] : files.slice(start, start + limit)
  const more = start >= 0 && start + limit < files.length
  return {
    supported: true,
    folders: [...folders.values()].sort((a, b) => a.name.localeCompare(b.name)),
    files: page,
    nextCursor: more ? page.at(-1)!.name : null,
  }
}
