import { useEffect, useMemo, useRef, useState } from 'react'
import { m } from '@/i18n/messages'
import { useLocale } from '@/i18n/config'
import { liveAppUrl } from './LiveAppFrame'

export type PartsLens = 'library' | 'app'
export type PartEntry = { key: string; title: string; group: string }
export type PartsCatalog = { library: PartEntry[]; app: PartEntry[] }

const isCatalog = (data: Record<string, unknown>): data is PartsCatalog & Record<string, unknown> => Array.isArray(data.library) && Array.isArray(data.app)

export const partsFrameUrl = (url: string, lens: PartsLens, locale: string, dark: boolean) => {
  const params = new URLSearchParams({ chrome: 'off', view: lens, locale, colorScheme: dark ? 'dark' : 'light' })
  return `${liveAppUrl(url)}?${params}`
}

export function DesignPartsFrame({ url, lens, section, themeCss, reloadKey, onCatalog }: { url: string; lens: PartsLens; section: string | null; themeCss?: string; reloadKey: number; onCatalog: (catalog: PartsCatalog) => void }) {
  const { locale } = useLocale()
  const frame = useRef<HTMLIFrameElement>(null)
  const first = useRef({ lens, locale })
  const [ready, setReady] = useState(false)
  const src = useMemo(() => partsFrameUrl(url, first.current.lens, first.current.locale, document.documentElement.classList.contains('dark')), [url, reloadKey])
  const origin = useMemo(() => new URL(src).origin, [src])

  useEffect(() => setReady(false), [src, reloadKey])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      const data = event.data as Record<string, unknown> | null
      if (data?.source !== 'pikku-design') return
      if (data.type === 'ready') setReady(true)
      else if (data.type === 'catalog' && isCatalog(data)) onCatalog({ library: data.library, app: data.app })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onCatalog])

  const send = (message: Record<string, unknown>) => frame.current?.contentWindow?.postMessage({ source: 'pikku-console', ...message }, origin)

  useEffect(() => {
    if (ready) send({ type: 'set-locale', locale })
  }, [ready, locale])

  useEffect(() => {
    if (ready && themeCss) send({ type: 'set-theme-css', css: themeCss })
  }, [ready, themeCss])

  useEffect(() => {
    if (!ready) return
    send({ type: 'set-lens', lens })
    if (section) send({ type: 'set-section', lens, sectionId: section })
  }, [ready, lens, section])

  return (
    <div className="relative flex min-h-0 items-stretch justify-center overflow-auto rounded-card bg-card">
      <iframe ref={frame} data-design-parts key={`${src}#${reloadKey}`} title={m.design_parts__frame()} src={src} className="block size-full min-h-[480px] border-0 bg-white" />
    </div>
  )
}
