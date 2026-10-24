import type { I18nString } from '@pikku/react'
import { BlobMark } from './Blob'

export function PikkuMark({ label, className = 'size-8 shrink-0' }: { label?: I18nString; className?: string }) {
  return <BlobMark title={label} className={`text-brand-mark ${className}`} />
}
