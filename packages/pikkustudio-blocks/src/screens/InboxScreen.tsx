import { useNavigate, useSearch } from '@tanstack/react-router'

import { InboxDetail } from '../blocks/InboxDetail'
import { InboxList, type ChannelFilter } from '../blocks/InboxList'
import { Page } from '../blocks/Page'

export function InboxScreen() {
  const navigate = useNavigate()
  const q = useSearch({ strict: false }) as { channel?: ChannelFilter; message?: string; device?: 'phone' | 'text' }
  const set = (patch: Record<string, unknown>) =>
    navigate({
      to: '.',
      search: ((prev: object) => ({ ...prev, ...patch })) as never,
      replace: true,
    })
  const channel: ChannelFilter = q.channel === 'email' || q.channel === 'sms' ? q.channel : 'all'
  return (
    <Page gap="list">
      {q.message ? (
        <InboxDetail id={q.message} device={q.device ?? 'computer'} onBack={() => set({ message: undefined })} onDevice={(device) => set({ device: device === 'computer' ? undefined : device })} />
      ) : (
        <InboxList channel={channel} onChannel={(next) => set({ channel: next === 'all' ? undefined : next })} onOpen={(message) => set({ message })} />
      )}
    </Page>
  )
}
