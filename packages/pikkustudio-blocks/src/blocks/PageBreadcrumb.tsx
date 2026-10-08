import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'

const words = {
  page: { trigger: m.page_breadcrumb__trigger_page, browse: m.page_breadcrumb__browse_page, menu: m.page_breadcrumb__menu_page },
  email: { trigger: m.page_breadcrumb__trigger_email, browse: m.page_breadcrumb__browse_email, menu: m.page_breadcrumb__menu_email },
  artifact: { trigger: m.page_breadcrumb__trigger_artifact, browse: m.page_breadcrumb__browse_artifact, menu: m.page_breadcrumb__menu_artifact },
  app: { trigger: m.page_breadcrumb__trigger_app, browse: m.page_breadcrumb__browse_app, menu: m.page_breadcrumb__menu_app },
}

export type PageGroup = { app: string; label: I18nString; pages: { id: string; name: I18nString; text: I18nString }[] }

export function PageBreadcrumb({ groups, app, page, onPick, kind = 'page', icon, align = 'center' }: { groups: PageGroup[]; app: string; page: string; onPick: (app: string, page: string) => void; kind?: 'page' | 'email' | 'artifact' | 'app'; icon?: I18nNode; align?: 'start' | 'center' }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const group = groups.find((g) => g.app === app)
  const current = group?.pages.find((p) => p.id === page)

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLElement>('[aria-checked=true]')?.focus()
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const move = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
      return
    }
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const rows = Array.from(root.current?.querySelectorAll<HTMLElement>('[role=menuitemradio]') ?? [])
    const at = rows.indexOf(document.activeElement as HTMLElement)
    rows[(at + step + rows.length) % rows.length]?.focus()
  }

  return (
    <div ref={root} className="relative flex min-w-0 max-w-full items-center" onKeyDown={move}>
      <Button ref={trigger} variant="picker" size="picker" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={words[kind].trigger({ name: current?.name ?? '' })} title={words[kind].browse()} onClick={() => setOpen((o) => !o)}>
        <span className="truncate">{current?.name ?? null}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </Button>
      {open && (
        <div role="menu" aria-label={words[kind].menu()} className={`absolute top-full z-50 mt-2 max-h-[70vh] w-96 overflow-y-auto ${align === 'start' ? 'start-0' : 'start-1/2 -translate-x-1/2 rtl:translate-x-1/2'} max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg`}>
          {groups.map((g) => (
            <div key={g.app} role="group" aria-label={g.label}>
              <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">{g.label}</p>
              {g.pages.map((p) => {
                const on = g.app === app && p.id === page
                return (
                  <Button
                    key={p.id}
                    variant="ghost"
                    size="profile"
                    type="button"
                    role="menuitemradio"
                    aria-checked={on}
                    className="w-full rounded-lg hover:bg-accent aria-checked:bg-accent"
                    onClick={() => {
                      onPick(g.app, p.id)
                      setOpen(false)
                      trigger.current?.focus()
                    }}
                  >
                    {icon ?? (
                      <span className={`flex h-9 w-12 shrink-0 flex-col gap-1 rounded-md p-1.5 ${g.app === 'staff' ? 'bg-secondary' : 'bg-accent'} ring-1 ring-border`} aria-hidden="true">
                        <span className="h-1 w-7 rounded-full bg-primary/50" />
                        <span className="h-1 w-5 rounded-full bg-ink-2/30" />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col text-start">
                      <span className="truncate text-px15 font-bold">{p.name}</span>
                      <span className="truncate text-px13 font-normal text-muted-foreground">{p.text}</span>
                    </span>
                    {on && <Check className="size-4 shrink-0 text-accent-foreground" />}
                  </Button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
