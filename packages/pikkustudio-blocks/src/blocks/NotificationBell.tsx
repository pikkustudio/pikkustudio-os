import { asI18n } from '@pikku/react'
import { Bell } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useTeamSlug } from '../lib/team'

// studio:notifications counts the viewer's unread notifications. Where nothing holds notifications the count is null
// and the bell is not shown.
const NOTIFICATIONS_STALE_MS = 60_000

export function NotificationBell({ collapsed = false }: { collapsed?: boolean }) {
  const team = useTeamSlug() || undefined
  const query = usePikkuQuery('studio:notifications', { team }, { staleTime: NOTIFICATIONS_STALE_MS, refetchInterval: 120_000 } as never) as { data?: { count: number | null } }
  const count = query.data?.count
  if (count === null || count === undefined) return null
  return (
    <div
      role="status"
      data-testid="notification-bell"
      aria-label={count ? m.notifications__open_unread({ count }) : m.notifications__title()}
      title={collapsed ? m.notifications__title() : undefined}
      className={`flex h-9.25 w-full items-center gap-3 rounded-lg px-3 text-[14px] font-semibold text-ink-2 ${collapsed ? 'relative justify-center px-0' : ''}`}
    >
      <Bell className="size-5 shrink-0" />
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{m.notifications__title()}</span>}
      {count > 0 ? (
        <span className={`grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[12px] leading-none font-bold text-primary-foreground ${collapsed ? 'absolute end-0.5 top-0' : ''}`}>
          {asI18n(count > 99 ? '99+' : String(count))}
        </span>
      ) : null}
    </div>
  )
}
