import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'

export function ErrorReportDrawer({ onTurnOn, onClose }: { onTurnOn: () => void; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <aside aria-label="Error reports" className="fixed inset-y-0 right-0 z-50 flex w-102 max-w-full flex-col border-l border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120">
      <header data-hue="petrol" className="flex items-center gap-3 bg-hero px-5 py-4 text-hero-ink">
        <h2 className="min-w-0 flex-1 font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">Tell Pikku about errors like this?</h2>
        <button type="button" aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15">
          <X className="size-5.5" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-5 text-[16px] text-ink-2">
        <p>When something breaks on Pikku's side, we can send a short note to the Pikku team so they fix it.</p>
        <section>
          <h3 className="mb-1 font-heading text-[18px] font-bold text-foreground">What is sent</h3>
          <p>Only the kind of error, a reference number and the time. It looks like it came from a generic app.</p>
        </section>
        <section>
          <h3 className="mb-1 font-heading text-[18px] font-bold text-foreground">What is never sent</h3>
          <p>Your project's name, its content, its files, or any of your people.</p>
        </section>
        <p>You can change your mind later.</p>
      </div>
      <footer className="flex flex-wrap gap-3 border-t border-border px-5 py-4">
        <Button variant="default" size="page" type="button" onClick={() => (onTurnOn(), onClose())}>
          Turn on error reports
        </Button>
        <Button variant="ghost" size="page" type="button" onClick={onClose}>
          Not now
        </Button>
      </footer>
    </aside>
  )
}
