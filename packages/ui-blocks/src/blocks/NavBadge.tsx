import { asI18n } from '@pikku/react'
import { getLocale } from '@/paraglide/runtime.js'
import { Badge } from '../ui/badge'
import { createAddonRpc } from '../lib/addon-rpc'
import { screenAt } from '../lib/nav-registry'

// A nav entry's count: the screen's `nav.badge` names a function of its addon, called through that addon's rpc
// (so it runs with only the addon's scopes). A count of 0, an error or no badge shows nothing.
function Count({ addon, fn, className = '' }: { addon: string; fn: string; className?: string }) {
  const query = createAddonRpc(addon).useQuery(fn, {} as never, { refetchInterval: 60_000 })
  const data = query.data as unknown
  const count = typeof data === 'number' ? data : (data as { count?: unknown } | undefined)?.count
  if (typeof count !== 'number' || count <= 0) return null
  return (
    <Badge variant="pillInfo" className={`ms-auto ${className}`} data-testid="nav-badge">
      {asI18n(new Intl.NumberFormat(getLocale()).format(count))}
    </Badge>
  )
}

/** The badge of the screen at `path`, if it has one. */
export function NavBadge({ path, className }: { path: string; className?: string }) {
  const screen = screenAt(path)
  return screen?.addon && screen.nav?.badge ? <Count addon={screen.addon} fn={screen.nav.badge} className={className} /> : null
}
