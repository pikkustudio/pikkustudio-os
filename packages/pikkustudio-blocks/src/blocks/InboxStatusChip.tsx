import { m } from '@/i18n/messages'
import { Ban, Check, Inbox } from 'lucide-react'
import { Badge } from '../ui/badge'
import type { InboxStatus } from '../lib/inbox'

export function InboxStatusChip({ status }: { status: InboxStatus }) {
  if (status === 'sent')
    return (
      <Badge variant="pillOk">
        <Check />
        {m.inbox__status_sent()}
      </Badge>
    )
  if (status === 'rejected')
    return (
      <Badge variant="pillBad">
        <Ban />
        {m.inbox__status_rejected()}
      </Badge>
    )
  return (
    <Badge variant="pillInfo">
      <Inbox />
      {m.inbox__status_captured()}
    </Badge>
  )
}
