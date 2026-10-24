import { m } from '@/i18n/messages'
import { KeyRound, Package } from 'lucide-react'
import { RowCard, RowStack } from './RowCard'
import { asI18n } from '@pikku/react'

export type ContentAccessItem = {
  addon: string
  folder: string
  grants: { path: string; mode: 'read' | 'write' }[]
  wholeStore: string | null
}

export function ContentAccess({ items }: { items: ContentAccessItem[] }) {
  return (
    <RowStack>
      {items.map((item) => (
        <RowCard
          key={item.addon}
          tile={item.wholeStore ? <KeyRound className="size-5" /> : <Package className="size-5" />}
          flag={!!item.wholeStore}
          title={asI18n(item.addon)}
          caption={item.wholeStore ? m.content_access__whole_store({ reason: item.wholeStore }) : m.content_access__keeps_in({ folder: item.folder })}
          below={
            item.grants.length ? (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px] text-ink-2">
                {item.grants.map((grant) => (
                  <li key={grant.path}>{grant.mode === 'write' ? m.content_access__can_change({ path: grant.path }) : m.content_access__can_read({ path: grant.path })}</li>
                ))}
              </ul>
            ) : undefined
          }
        />
      ))}
    </RowStack>
  )
}
