import type { I18nString } from '@pikku/react'
import { Info } from 'lucide-react'

export function InfoNote({ text }: { text: I18nString }) {
  return (
    <div className="flex items-start gap-2.5 text-px15 text-ink-2">
      <Info className="mt-0.5 size-5 shrink-0 text-info-foreground" />
      <span>{text}</span>
    </div>
  )
}
