import { m } from '@/i18n/messages'
import { useState, type ReactNode } from 'react'
import { Folder, Package } from 'lucide-react'
import { Button } from '../ui/button'
import { RowCard } from './RowCard'

export function ContentFolderRow({
  name,
  count,
  owner,
  removing,
  onOpen,
  onRemove,
}: {
  name: string
  count: number
  owner?: ReactNode
  removing: boolean
  onOpen: () => void
  onRemove: () => void
}) {
  const [sure, setSure] = useState(false)
  return (
    <RowCard
      tile={owner ? <Package className="size-5" /> : <Folder className="size-5" />}
      title={name}
      caption={count === 1 ? m.content_folder__one_file() : m.content_folder__files({ count })}
      note={owner}
    >
      <div className="flex items-center gap-2">
        {sure ? (
          <>
            <Button type="button" variant="destructive" size="compact" disabled={removing} onClick={() => { onRemove(); setSure(false) }}>
              {m.content_folder__remove_all({ count })}
            </Button>
            <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(false)}>
              {m.content_folder__keep_them()}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="bordered" size="compact" onClick={onOpen}>
              {m.content_folder__open()}
            </Button>
            <Button type="button" variant="ghost" size="compactTight" onClick={() => setSure(true)}>
              {m.content_folder__remove()}
            </Button>
          </>
        )}
      </div>
    </RowCard>
  )
}
