import { MousePointer2, X } from 'lucide-react'
import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { Attachment } from '../lib/shell'

export function AttachedChips({ attached, onRemove }: { attached: Attachment[]; onRemove: (label: I18nString) => void }) {
  if (!attached.length) return null
  return (
    <ul className="flex max-h-36 flex-col gap-1.5 overflow-y-auto bg-card px-5 pt-3">
      {attached.map((a) => (
        <li key={a.label} title={a.where} className="relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border border-border bg-secondary py-1.5 ps-4 pe-1.5">
          <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: a.color }} aria-hidden="true" />
          <MousePointer2 className="size-4 shrink-0" style={{ color: a.color }} aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] leading-[1.35] font-medium text-foreground">{a.text}</span>
            <span dir="ltr" className="truncate text-start font-mono text-[12px] leading-[1.35] text-muted-foreground">{a.meta}</span>
          </span>
          <button
            type="button"
            aria-label={m.shell_layout__remove_from_chat()}
            title={m.shell_layout__remove_from_chat()}
            onClick={() => onRemove(a.label)}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-140 hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}
