import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { Device } from '../types/designTypes'

export const liveAppUrl = (url: string) => {
  const port = new URL(url).port
  return `${window.location.protocol}//${window.location.hostname}:${port}/`
}

export const frameMaxWidth = (device: Device) => (device === 'phone' ? 390 : device === 'tablet' ? 820 : undefined)

export function LiveAppFrame({ url, device, reloadKey, title }: { url: string; device: Device; reloadKey: number; title: I18nString }) {
  return (
    <div className={`relative flex min-h-0 justify-center overflow-auto rounded-card ${device === 'computer' ? 'items-stretch bg-card' : 'items-start bg-surface-3 p-4.5'}`}>
      <div style={{ maxWidth: frameMaxWidth(device) }} className={`w-full transition-[max-width] duration-420 ease-[cubic-bezier(.16,1,.3,1)] ${device === 'computer' ? 'self-stretch' : 'h-full self-start'}`}>
        <iframe data-live-app key={reloadKey} title={m.design_live__frame({ name: title })} src={liveAppUrl(url)} className={`block size-full min-h-[480px] border-0 bg-white ${device === 'computer' ? '' : 'rounded-2xl shadow-lift'}`} />
      </div>
    </div>
  )
}
