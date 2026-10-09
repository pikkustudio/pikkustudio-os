import { m } from '@/i18n/messages'
import { UserRound } from 'lucide-react'
import { Button } from '../ui/button'
import { Dot, RowCard } from './RowCard'
import { ago, outcomeOf, whatHappened, whoDid, type AuditEntry, type AuditUser } from '../lib/audit'

export function AuditEntryRow({ entry, users, now, onOpen }: { entry: AuditEntry; users: Record<string, AuditUser> | undefined; now: number; onOpen: () => void }) {
  const outcome = outcomeOf(entry)
  return (
    <RowCard
      tile={<UserRound className="size-5.5" />}
      title={m.audit_screen__line({ who: whoDid(entry, users), did: whatHappened(entry.type) })}
      caption={<time dateTime={entry.occurredAt}>{ago(entry.occurredAt, now)}</time>}
    >
      {outcome ? <Dot tone={outcome.tone}>{outcome.text}</Dot> : null}
      <Button type="button" variant="bordered" size="compact" onClick={onOpen}>
        {m.audit_screen__details()}
      </Button>
    </RowCard>
  )
}
