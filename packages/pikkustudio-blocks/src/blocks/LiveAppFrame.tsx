import { useEffect, useRef, useState } from 'react'
import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { Device } from '../types/designTypes'

export const liveAppUrl = (url: string) => {
  const parsed = new URL(url)
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) return url
  return `${window.location.protocol}//${window.location.hostname}:${parsed.port}/`
}

export const frameSize = (device: Device) => (device === 'phone' ? { width: 390, height: 844 } : device === 'tablet' ? { width: 820, height: 1180 } : undefined)

const useFit = (size: { width: number; height: number } | undefined) => {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const node = ref.current
    if (!node || !size) return
    const measure = () => {
      const style = getComputedStyle(node)
      const w = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const h = node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      setScale(Math.min(1, w / size.width, h / size.height))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [size?.width, size?.height])
  return { ref, scale }
}

export type Look = { background: string; color: string; fontSize: number; fontWeight: number; padding: number; textAlign: string; borderRadius: number; borderWidth: number; borderColor: string; font: string }
export type Mark = { id: string; omId: string; omIndex: number; color: string }
export type PickedElement = { omId: string; omIndex: number; root: string | null; component: string; tag: string; text: string; count: number; i18n: string | null; look: Look | null; tokens: Partial<Record<'background' | 'color' | 'borderColor', string | null>> }
export type InspectMode = 'design' | 'i18n' | 'off'
export type StyleRule = { omId: string; styles: Record<string, string> }
export type Wording = { base: string; locales: string[]; values: Record<string, string | null>; variant?: boolean }

let asked = 0

export const askLiveApp = <T,>(type: string, extra: Record<string, unknown>, timeout = 4000): Promise<T> =>
  new Promise((resolve, reject) => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe[data-live-app]')
    if (!frame?.contentWindow) return reject(new Error('The preview of your app is not open.'))
    const id = `${type}-${++asked}`
    const done = () => {
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (event.source !== frame.contentWindow || data?.source !== 'cloud-preview' || data.type !== type || data.id !== id) return
      done()
      if (data.ok) resolve(data as T)
      else reject(new Error(String(data.message ?? 'The preview could not answer.')))
    }
    const timer = setTimeout(() => {
      done()
      reject(new Error(`The preview did not answer "${type}". It is running an older Studio picker; restarting the app loads the new one.`))
    }, timeout)
    window.addEventListener('message', onMessage)
    frame.contentWindow.postMessage({ source: 'cloud-console', type, id, ...extra }, '*')
  })

const pickedOf = (data: Record<string, unknown>): PickedElement => ({
  omId: String(data.omId),
  omIndex: typeof data.omIndex === 'number' ? data.omIndex : 0,
  root: typeof data.root === 'string' ? data.root : null,
  component: String(data.component ?? data.tag ?? ''),
  tag: String(data.tag ?? ''),
  text: typeof data.text === 'string' ? data.text : '',
  count: typeof data.count === 'number' ? data.count : 1,
  i18n: typeof data.i18n === 'string' ? data.i18n : null,
  look: data.look && typeof data.look === 'object' ? (data.look as Look) : null,
  tokens: data.tokens && typeof data.tokens === 'object' ? (data.tokens as PickedElement['tokens']) : {},
})

type Inspect = { mode: InspectMode; styles: StyleRule[]; marks?: Mark[]; onPick?: (picked: PickedElement) => void; onWording?: (key: string) => void }

const useInspect = ({ mode, styles, marks, onPick, onWording }: Inspect) => {
  const frame = useRef<HTMLIFrameElement>(null)
  const handlers = useRef({ onPick, onWording })
  const hadMarks = useRef(false)
  handlers.current = { onPick, onWording }
  const rules = JSON.stringify(styles)
  const markList = marks ? JSON.stringify(marks) : null
  const postMarks = (post: (message: Record<string, unknown>) => void) => post({ type: 'set-selections', selections: JSON.parse(markList ?? '[]').map((k: Mark) => ({ userId: k.id, mine: true, tint: true, omId: k.omId, omIndex: k.omIndex, color: k.color })) })
  useEffect(() => {
    const node = frame.current
    if (!node) return
    const post = (message: Record<string, unknown>) => node.contentWindow?.postMessage({ source: 'cloud-console', ...message }, '*')
    const sync = () => {
      post({ type: 'set-inspect-mode', mode })
      post({ type: 'set-styles', rules: JSON.parse(rules) })
      if (markList) postMarks(post)
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (event.source !== node.contentWindow || data?.source !== 'cloud-preview') return
      if (data.type === 'element-select' && typeof data.omId === 'string') {
        if (!markList) post({ type: 'set-selections', selections: [{ userId: 'me', mine: true, omId: data.omId, omIndex: data.omIndex ?? 0, color: getComputedStyle(node).getPropertyValue('--primary').trim() || '#ba3e0d' }] })
        handlers.current.onPick?.(pickedOf(data))
      } else if (data.type === 'i18n-open' && typeof data.key === 'string') {
        handlers.current.onWording?.(data.key)
      } else if (data.type === 'element-deselect') {
        if (markList) postMarks(post)
        else post({ type: 'set-selections', selections: [] })
      }
    }
    sync()
    if (hadMarks.current && !markList) post({ type: 'set-selections', selections: [] })
    hadMarks.current = !!markList
    if (mode === 'off' && !markList) post({ type: 'set-selections', selections: [] })
    node.addEventListener('load', sync)
    window.addEventListener('message', onMessage)
    return () => {
      node.removeEventListener('load', sync)
      window.removeEventListener('message', onMessage)
    }
  })
  return frame
}

export function LiveAppFrame({ url, device, reloadKey, title, inspect = 'off', styles = [], marks, onPick, onWording }: { url: string; device: Device; reloadKey: number; title: I18nString; inspect?: InspectMode; styles?: StyleRule[]; marks?: Mark[]; onPick?: (picked: PickedElement) => void; onWording?: (key: string) => void }) {
  const size = frameSize(device)
  const { ref, scale } = useFit(size)
  const frame = useInspect({ mode: inspect, styles, marks, onPick, onWording })
  const src = liveAppUrl(url)
  const name = m.design_live__frame({ name: title })
  if (!size) {
    return (
      <div className="relative flex min-h-0 items-stretch justify-center overflow-auto rounded-card bg-card">
        <iframe ref={frame} data-live-app key={reloadKey} title={name} src={src} className="block size-full min-h-[480px] border-0 bg-white" />
      </div>
    )
  }
  return (
    <div ref={ref} className="relative flex min-h-0 justify-center overflow-auto rounded-card bg-surface-3 p-4.5">
      <div style={{ width: size.width * scale, height: size.height * scale }} className="m-auto shrink-0 transition-[width,height] duration-420 ease-[cubic-bezier(.16,1,.3,1)]">
        <iframe
          ref={frame}
          data-live-app
          key={reloadKey}
          title={name}
          src={src}
          style={{ width: size.width, height: size.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          className="block border-0 bg-white rounded-2xl shadow-lift"
        />
      </div>
    </div>
  )
}
