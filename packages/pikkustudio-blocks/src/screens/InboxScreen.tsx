import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

import { InboxDetail } from '../blocks/InboxDetail'
import { InboxList, type ChannelFilter } from '../blocks/InboxList'
import { Page } from '../blocks/Page'
import { keepSearch } from '../lib/project-url'

export function InboxScreen() {
  const navigate = useNavigate()
  const q = useSearch({ strict: false }) as { channel?: ChannelFilter; device?: 'phone' | 'text' }
  const { messageId } = useParams({ strict: false }) as { messageId?: string }
  const set = (patch: Record<string, unknown>) =>
    navigate({
      to: '.',
      search: ((prev: object) => ({ ...prev, ...patch })) as never,
      replace: true,
    })
  const channel: ChannelFilter = q.channel === 'email' || q.channel === 'sms' ? q.channel : 'all'
  return (
    <Page gap="list">
      {messageId ? (
        <InboxDetail id={messageId} device={q.device ?? 'computer'} backTo="/inbox" onDevice={(device) => set({ device: device === 'computer' ? undefined : device })} />
      ) : (
        <InboxList channel={channel} onChannel={(next) => set({ channel: next === 'all' ? undefined : next })} onOpen={(message) => navigate({ to: `/inbox/${encodeURIComponent(message)}` as never, search: keepSearch as never })} />
      )}
    </Page>
  )
}
