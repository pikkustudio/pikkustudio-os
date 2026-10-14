import { createFileRoute, useLocation } from '@tanstack/react-router'
import { ShellLayout } from '@pikkustudio/blocks/screens/ShellLayout'
import { AddonNavContext, type AddonNav } from '@pikkustudio/blocks/lib/addon-nav'
import { requireStudioSession } from '@/lib/studio-gate'
import { installedAddons } from '@/addon-ui/registry'
import { splitAddonPath } from '@/addon-ui/match'

const addonNav = (pathname: string): AddonNav | null => {
  const at = pathname.match(/\/addons\/(.+?)\/?$/)
  if (!at) return null
  const { name } = splitAddonPath(at[1]!)
  const addon = installedAddons.find((candidate) => candidate.name === name)
  if (!addon) return null
  const sub = (path: string) => [name, ...path.split('/').filter(Boolean)].join('/')
  return {
    title: addon.title,
    current: at[1]!.replace(/\/$/, ''),
    items: addon.screens.filter((s) => s.nav && !s.path.includes(':')).map((s) => ({ splat: sub(s.path), label: s.title })),
  }
}

function StudioLayout() {
  const pathname = useLocation({ select: (l) => l.pathname })
  return (
    <AddonNavContext.Provider value={addonNav(pathname)}>
      <ShellLayout />
    </AddonNavContext.Provider>
  )
}

export const Route = createFileRoute('/_studio')({ beforeLoad: requireStudioSession, component: StudioLayout })
