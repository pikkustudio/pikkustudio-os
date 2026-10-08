import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect } from 'react'
import { X } from 'lucide-react'

/** The end-hand panel for any form or detail. Plain white, like Pikku's; closes on Escape. */
export function SidePanel({ title, sub, onClose, children }: { title: I18nString; sub?: I18nString; onClose: () => void; children: I18nNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <aside role="dialog" aria-label={title} className="fixed inset-y-0 end-0 z-50 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.35)] @min-[1700px]/app:w-120">
      <div className="flex items-start gap-0.5 pt-4 pe-3 pb-2.5 ps-6">
        <span className="min-w-0 flex-1">
          <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{title}</h2>
          {sub ? <p className="mt-1 text-[15px] text-ink-2">{sub}</p> : null}
        </span>
        <button type="button" aria-label={m.side_panel__close_panel()} onClick={onClose} className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-secondary">
          <X className="size-5.5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-6 pt-3 pb-7">{children}</div>
    </aside>
  )
}
