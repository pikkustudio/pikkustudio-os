import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function SidePanel({
  icon: Icon,
  title,
  sub,
  label,
  locked,
  inline,
  onClose,
  children,
}: {
  icon: LucideIcon
  title: I18nString
  sub?: I18nString
  label: I18nString
  locked?: boolean
  inline?: boolean
  onClose: () => void
  children: I18nNode
}) {
  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, locked])
  return (
    <aside
      role="dialog"
      aria-label={label}
      data-side-panel={inline ? undefined : ''}
      className={inline ? 'flex h-full w-full flex-col border-s border-border bg-card' : 'fixed inset-y-0 end-0 z-50 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120'}
    >
      <header data-hue="petrol" className="flex items-center gap-3 bg-hero px-5 py-4 text-hero-ink">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-hero-btn-ink" aria-hidden="true">
          <Icon className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{title}</h2>
          {sub ? <small className="block text-[14px] text-hero-ink-2">{sub}</small> : null}
        </span>
        {locked ? null : (
          <button type="button" aria-label={m.side_panel__close()} onClick={onClose} className="grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15">
            <X className="size-5.5" />
          </button>
        )}
      </header>
      <div className="flex flex-1 flex-col gap-4.5 overflow-auto px-5 pt-5 pb-6">{children}</div>
    </aside>
  )
}
