import { useEffect, useRef, useState } from 'react'
import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { Device } from '../types/designTypes'

export const liveAppUrl = (url: string) => {
  const port = new URL(url).port
  return `${window.location.protocol}//${window.location.hostname}:${port}/`
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

export function LiveAppFrame({ url, device, reloadKey, title }: { url: string; device: Device; reloadKey: number; title: I18nString }) {
  const size = frameSize(device)
  const { ref, scale } = useFit(size)
  const src = liveAppUrl(url)
  const name = m.design_live__frame({ name: title })
  if (!size) {
    return (
      <div className="relative flex min-h-0 items-stretch justify-center overflow-auto rounded-card bg-card">
        <iframe data-live-app key={reloadKey} title={name} src={src} className="block size-full min-h-[480px] border-0 bg-white" />
      </div>
    )
  }
  return (
    <div ref={ref} className="relative flex min-h-0 justify-center overflow-auto rounded-card bg-surface-3 p-4.5">
      <div style={{ width: size.width * scale, height: size.height * scale }} className="m-auto shrink-0 transition-[width,height] duration-420 ease-[cubic-bezier(.16,1,.3,1)]">
        <iframe
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
