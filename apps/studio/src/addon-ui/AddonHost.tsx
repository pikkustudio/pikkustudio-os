import { Suspense, lazy, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AddonProvider } from './AddonProvider'
import type { ResolvedAddonScreen } from './resolve'

export function AddonHost({ resolved }: { resolved: ResolvedAddonScreen }) {
  const { addon, screen, params } = resolved
  const Screen = useMemo(() => (screen.component ? lazy(screen.component) : null), [screen])
  const go = useNavigate()
  const navigate = useCallback(
    (path: string) => void go({ to: '/addons/$', params: { _splat: [addon.name, ...path.split('/').filter(Boolean)].join('/') }, search: ((prev: object) => prev) as never }),
    [go, addon.name],
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
