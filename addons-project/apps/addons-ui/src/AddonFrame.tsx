import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { PikkuProvider, createPikku } from '@pikku/react'
import { PikkuFetch } from './pikku/pikku-fetch.gen'
import { PikkuRPC } from './pikku/pikku-rpc.gen'
import { installedAddons } from '../../../.pikku/screens/pikku-installed-addons.gen'

type Session = { addon: string }
type Screen = { path: string; title: string; component: () => Promise<{ default: ComponentType<any> }> }

const matchScreen = (screens: Screen[], path: string) => {
  const parts = path.split('/').filter(Boolean)
  for (const screen of screens) {
    const pattern = screen.path.split('/').filter(Boolean)
    if (pattern.length !== parts.length) continue
    const params: Record<string, string> = {}
    const ok = pattern.every((segment, i) => (segment.startsWith(':') ? ((params[segment.slice(1)] = parts[i]!), true) : segment === parts[i]))
    if (ok) return { screen, params }
  }
  return null
}

const parentOrigin = () => {
  const claimed = new URLSearchParams(window.location.search).get('parent')
  try {
    return claimed ? new URL(claimed).origin : null
  } catch {
    return null
  }
}

const REFRESH_BEFORE_EXPIRY_MS = 60_000

export function AddonFrame() {
  const [session, setSession] = useState<Session | null>(null)
  const [path, setPath] = useState('/')
  const parent = useMemo(parentOrigin, [])
  const token = useRef<string | null>(null)
  const client = useRef<ReturnType<typeof createPikku> | null>(null)

  useEffect(() => {
    if (!parent) return
    let refresh: ReturnType<typeof setTimeout> | undefined
    const scheduleRefresh = (expiresAt: number) => {
      clearTimeout(refresh)
      refresh = setTimeout(
        () => window.parent.postMessage({ type: 'addon:token-request' }, parent),
        Math.max(1_000, expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_MS)
      )
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parent) return
      const message = event.data
      if (message?.type !== 'addon:session' && message?.type !== 'addon:token') return
      token.current = message.token
      client.current?.fetch.setHeader('authorization', `Bearer ${message.token}`)
      scheduleRefresh(message.expiresAt)
      if (message.type === 'addon:session') {
        setSession({ addon: message.addon })
        setPath(message.path)
      }
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'addon:ready' }, parent)
    return () => {
      clearTimeout(refresh)
      window.removeEventListener('message', onMessage)
    }
  }, [parent])

  const pikku = useMemo(() => {
    if (!session || !token.current) return null
    const created = createPikku(PikkuFetch, PikkuRPC, { serverUrl: window.location.origin })
    created.fetch.setHeader('authorization', `Bearer ${token.current}`)
    created.fetch.setHeader('x-pikku-addon', session.addon)
    client.current = created
    return created
  }, [session])

  const found = useMemo(() => {
    const addon = installedAddons.find((a) => a.name === session?.addon)
    return addon ? matchScreen(addon.screens as Screen[], path) : null
  }, [session, path])

  const [Component, setComponent] = useState<ComponentType<any> | null>(null)
  useEffect(() => {
    setComponent(null)
    void found?.screen.component().then((mod) => setComponent(() => mod.default))
  }, [found])

  if (!session || !pikku) return null
  if (!found) return <p className="p-6 text-sm text-muted-foreground">This add-on has no screen at {path}.</p>
  if (!Component) return null

  const navigate = (next: string) => {
    setPath(next)
    if (parent) window.parent.postMessage({ type: 'addon:navigate', path: next }, parent)
  }

  return (
    <PikkuProvider pikku={pikku}>
      <Component params={found.params} navigate={navigate} />
    </PikkuProvider>
  )
}
