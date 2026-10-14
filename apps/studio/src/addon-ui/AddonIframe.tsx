import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'

export function AddonIframe({ addon, path }: { addon: string; path: string }) {
  const opened = usePikkuQuery('openAddons', {}, { staleTime: Infinity })
  const mint = usePikkuMutation('mintAddonToken')
  const frame = useRef<HTMLIFrameElement>(null)
  const go = useNavigate()
  const appUrl = opened.data?.appUrl
  const mintToken = mint.mutateAsync

  useEffect(() => {
    if (!appUrl) return
    const origin = new URL(appUrl).origin
    const send = async (message: { type: string; path?: string }) => {
      const { token, expiresAt } = await mintToken({ addon })
      frame.current?.contentWindow?.postMessage({ ...message, token, expiresAt, addon }, origin)
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin) return
      if (event.data?.type === 'addon:ready') void send({ type: 'addon:session', path })
      if (event.data?.type === 'addon:token-request') void send({ type: 'addon:token' })
      if (event.data?.type === 'addon:navigate' && typeof event.data.path === 'string') {
        void go({ to: '/add-ons/$name/$', params: { name: addon, _splat: event.data.path.split('/').filter(Boolean).join('/') } })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [appUrl, addon, path, go, mintToken])

  if (opened.isError) return <p className="p-6 text-sm text-destructive">{m.addons__failed()}</p>
  if (!appUrl) return <p className="p-6 text-sm text-muted-foreground">{m.addons__starting()}</p>
  return (
    <iframe
      ref={frame}
      title={m.addons__frame_title()}
      src={`${appUrl}/?addon=${encodeURIComponent(addon)}&parent=${encodeURIComponent(window.location.origin)}`}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      className="h-[calc(100vh-4rem)] w-full border-0"
    />
  )
}
