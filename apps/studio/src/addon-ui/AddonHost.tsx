import { Suspense, lazy, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AddonProvider } from './AddonProvider'
import type { AddonScreenDef, InstalledAddon } from './registry'

export type ResolvedAddonScreen = { addon: InstalledAddon; screen: AddonScreenDef; params: Record<string, string> }

export function AddonHost({ resolved }: { resolved: ResolvedAddonScreen }) {
  const { addon, screen, params } = resolved
  const Screen = useMemo(() => (screen.component ? lazy(screen.component) : null), [screen])
  const go = useNavigate()
  const navigate = useCallback(
    (path: string) => void go({ to: path as never, search: ((prev: object) => prev) as never }),
    [go],
  )
  if (!Screen) return null
  return (
    <AddonProvider key={addon.name} addon={addon.name}>
      <Suspense fallback={null}>
        <Screen params={params} navigate={navigate} />
      </Suspense>
    </AddonProvider>
  )
}
