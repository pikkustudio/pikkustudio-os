export type ContentFileItem = { bucket: string; key: string; name: string }

export type ContentFolderItem = { name: string; path: string; count: number }

export type ContentLevel = { folders: ContentFolderItem[]; files: ContentFileItem[] }

export const contentLevel = (files: ContentFileItem[], bucket: string | null, folder: string): ContentLevel => {
  const counts = new Map<string, number>()
  const here: ContentFileItem[] = []
  for (const file of files) {
    if (bucket === null) {
      counts.set(file.bucket, (counts.get(file.bucket) ?? 0) + 1)
      continue
    }
    if (file.bucket !== bucket) continue
    const inside = folder ? (file.key.startsWith(`${folder}/`) ? file.key.slice(folder.length + 1) : null) : file.key
    if (inside === null) continue
    const [first, ...rest] = inside.split('/')
    if (rest.length === 0) here.push(file)
    else counts.set(first!, (counts.get(first!) ?? 0) + 1)
  }
  const folders = [...counts.entries()]
    .map(([name, count]) => ({ name, path: bucket === null ? name : folder ? `${folder}/${name}` : name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { folders, files: here.sort((a, b) => a.name.localeCompare(b.name)) }
}

export type ContentKind = 'picture' | 'document' | 'sound' | 'video' | 'data' | 'file'

const KINDS: Record<string, ContentKind> = {
  png: 'picture', jpg: 'picture', jpeg: 'picture', gif: 'picture', webp: 'picture', svg: 'picture', avif: 'picture', ico: 'picture',
  pdf: 'document', doc: 'document', docx: 'document', txt: 'document', md: 'document', rtf: 'document',
  mp3: 'sound', wav: 'sound', ogg: 'sound', m4a: 'sound',
  mp4: 'video', mov: 'video', webm: 'video',
  json: 'data', csv: 'data', xml: 'data', xlsx: 'data',
}

export const contentKind = (name: string): ContentKind => KINDS[name.split('.').at(-1)?.toLowerCase() ?? ''] ?? 'file'

export const absoluteLink = (url: string, origin: string): string => (url.startsWith('/') ? `${origin}${url}` : url)
