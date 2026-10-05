import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Download, File as FileIcon, FileText, Image, Link2, Music, Video, Table } from 'lucide-react'
import { Button } from '../ui/button'
import { contentKind, type ContentKind } from '../lib/content'
import { RowCard } from './RowCard'

const ICONS: Record<ContentKind, typeof FileIcon> = { picture: Image, document: FileText, sound: Music, video: Video, data: Table, file: FileIcon }

const kindText = (kind: ContentKind) =>
  kind === 'picture' ? m.content_file__picture() : kind === 'document' ? m.content_file__document() : kind === 'sound' ? m.content_file__sound() : kind === 'video' ? m.content_file__video() : kind === 'data' ? m.content_file__data() : m.content_file__file()

export function ContentFileRow({
  name,
  canDownload,
  canCopy,
  busy,
  copied,
  onDownload,
  onCopy,
  onRemove,
}: {
  name: string
  canDownload: boolean
  canCopy: boolean
  busy: boolean
  copied: boolean
  onDownload: () => void
  onCopy: () => void
  onRemove: () => void
}) {
  const [sure, setSure] = useState(false)
  const kind = contentKind(name)
  const Icon = ICONS[kind]
  return (
    <RowCard tile={<Icon className="size-5" />} title={name} caption={kindText(kind)}>
      <div className="flex flex-wrap items-center gap-2">
        {sure ? (
          <>
            <Button type="button" variant="destructive" size="compact" disabled={busy} onClick={() => { onRemove(); setSure(false) }}>
              {m.content_file__remove_it_for_good()}
            </Button>
            <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(false)}>
              {m.content_file__keep_it()}
            </Button>
          </>
        ) : (
          <>
            {canCopy ? (
              <Button type="button" variant="bordered" size="compact" disabled={busy} onClick={onCopy}>
                <Link2 className="size-4" />
                {copied ? m.content_file__link_copied() : m.content_file__copy_link()}
              </Button>
            ) : null}
            {canDownload ? (
              <Button type="button" variant="bordered" size="compact" disabled={busy} onClick={onDownload}>
                <Download className="size-4" />
                {m.content_file__download()}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(true)}>
              {m.content_file__remove()}
            </Button>
          </>
        )}
      </div>
    </RowCard>
  )
}
