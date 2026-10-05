/**
 * The kind of an asset, decided from the file alone. The kind picks the extraction
 * workflow (knowledge/decisions/workflows-per-kind.md), so it is decided once, at
 * registration, and never guessed again downstream.
 */
export const ASSET_KINDS = ['document', 'text', 'audio', 'video', 'image'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

const BY_EXTENSION: Record<string, AssetKind> = {
  pdf: 'document',
  txt: 'text',
  md: 'text',
  markdown: 'text',
  csv: 'text',
  json: 'text',
  html: 'text',
  htm: 'text',
  rtf: 'text',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  flac: 'audio',
  ogg: 'audio',
  opus: 'audio',
  mp4: 'video',
  mov: 'video',
  m4v: 'video',
  mkv: 'video',
  webm: 'video',
  avi: 'video',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  heic: 'image',
  tif: 'image',
  tiff: 'image',
}

export function assetKindOf(fileName: string, mimeType: string): AssetKind | null {
  const mime = mimeType.toLowerCase()
  if (mime === 'application/pdf') return 'document'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('text/')) return 'text'
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  return BY_EXTENSION[ext] ?? null
}

/** "Kiln_log 2019-03.pdf" -> "Kiln log 2019-03", "glaze-defects.pdf" -> "glaze defects" */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^./]+$/, '').replace(/_+|(?<!\d)-+|-+(?!\d)/g, ' ').trim()
  return base || fileName
}

/** Keeps a file name safe as the last segment of a content key. */
export function safeKeySegment(fileName: string): string {
  const cleaned = fileName.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return (cleaned || 'file').slice(-120)
}

export const MAX_ASSET_BYTES = 2 * 1024 * 1024 * 1024

/** The logical bucket every library file lives in; keys start with an owner prefix. */
export const LIBRARY_BUCKET = 'library'

/** The extraction workflow each kind goes through (knowledge/decisions/workflows-per-kind.md). */
export const WORKFLOW_FOR_KIND: Partial<
  Record<AssetKind, 'extractDocument' | 'extractAudio' | 'extractVideo' | 'extractImage'>
> = {
  document: 'extractDocument',
  text: 'extractDocument',
  audio: 'extractAudio',
  video: 'extractVideo',
  image: 'extractImage',
}

/** Where a step keeps a file it produced from an asset; under the owner's prefix like the original. */
export const derivedKey = (owner: string, assetId: string, name: string) =>
  `${owner}/derived/${assetId}/${name}`
