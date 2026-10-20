import { useNavigate, useSearch } from '@tanstack/react-router'
import { InboxDetail } from '@pikkustudio/blocks/blocks/InboxDetail'
import { InboxList, type ChannelFilter } from '@pikkustudio/blocks/blocks/InboxList'
import { Page } from '@pikkustudio/blocks/blocks/Page'

// The inbox, at /inbox and /inbox/<message>: what the app sent while you tried it out.
export default function Inbox({ params, navigate }: { params: Record<string, string>; navigate: (path: string) => void }) {
  const go = useNavigate()
  const q = useSearch({ strict: false }) as { channel?: ChannelFilter; device?: 'phone' | 'text' }
  const messageId = params.messageId
  const set = (patch: Record<string, unknown>) =>
    go({
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
        <InboxList channel={channel} onChannel={(next) => set({ channel: next === 'all' ? undefined : next })} onOpen={(message) => navigate(`/inbox/${encodeURIComponent(message)}`)} />
      )}
    </Page>
  )
}
