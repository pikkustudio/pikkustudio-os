import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { DEFAULT_PALETTE, PALETTE_KEY, SCHEME_KEY, palettes, type ColorMode } from '../lib/palettes'

function readPalette(): string {
  try {
    const saved = localStorage.getItem(PALETTE_KEY)
    if (saved && palettes.some((p) => p.id === saved)) return saved
  } catch {}
  return DEFAULT_PALETTE
}

function readMode(): ColorMode {
  try {
    const saved = localStorage.getItem(SCHEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'system'
}

function applyMode(mode: ColorMode) {
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

const MODES: { id: ColorMode; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'Auto', Icon: Monitor },
]

function Dots({ bg, primary, hero }: { bg: string; primary: string; hero: string }) {
  return (
    <span className="flex flex-col gap-0.5" aria-hidden="true">
      {[bg, primary, hero].map((c, i) => (
        <span key={i} className="size-2.5 rounded-full border border-foreground/20" style={{ background: c }} />
      ))}
    </span>
  )
}

export function ThemeDock() {
  const [palette, setPalette] = useState(DEFAULT_PALETTE)
  const [mode, setMode] = useState<ColorMode>('system')
  const [dark, setDark] = useState(false)
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const tab = useRef<HTMLButtonElement>(null)
  const open = hover || pinned

  useEffect(() => {
    setPalette(readPalette())
    setMode(readMode())
    const el = document.documentElement
    const sync = () => setDark(el.classList.contains('dark'))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyMode('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [mode])

  useEffect(() => {
    if (!pinned) return
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setPinned(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [pinned])

  const pick = useCallback((id: string) => {
    setPalette(id)
    document.documentElement.setAttribute('data-palette', id)
    try {
      localStorage.setItem(PALETTE_KEY, id)
    } catch {}
  }, [])

  const pickMode = useCallback((next: ColorMode) => {
    setMode(next)
    try {
      if (next === 'system') localStorage.removeItem(SCHEME_KEY)
      else localStorage.setItem(SCHEME_KEY, next)
    } catch {}
    applyMode(next)
  }, [])

  const arrows = (e: KeyboardEvent<HTMLElement>, count: number, index: number, choose: (i: number) => void) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + count) % count
    choose(next)
    const items = e.currentTarget.closest('[role=radiogroup]')?.querySelectorAll<HTMLElement>('[role=radio]')
    items?.[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    setPinned(false)
    setHover(false)
    tab.current?.focus()
  }

  const current = palettes.find((p) => p.id === palette) ?? palettes[0]
  const sw = dark ? current.dark : current.light

  return (
    <div
      ref={root}
      role="region"
      aria-label="Theme preview"
      data-theme-dock
      className="fixed right-0 top-1/2 z-[1000] hidden -translate-y-1/2 items-center sm:flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false)
      }}
      onKeyDown={onKeyDown}
    >
      {open ? (
        <div className="mr-2 flex w-56 flex-col gap-3 rounded-card border border-border bg-card p-3 text-card-foreground shadow-deep">
          <div role="radiogroup" aria-label="Palette" className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto overscroll-contain">
            {palettes.map((p, i) => {
              const s = dark ? p.dark : p.light
              const on = p.id === palette
              const firstNew = p.group === 'new' && palettes[i - 1]?.group !== 'new'
              return (
                <Fragment key={p.id}>
                  {firstNew ? (
                    <div role="presentation" className="mt-2 border-t border-border px-3 pb-0.5 pt-2 text-px13 font-bold text-ink-2">
                      New
                    </div>
                  ) : null}
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(p.id)}
                  onKeyDown={(e) => arrows(e, palettes.length, i, (n) => pick(palettes[n].id))}
                  className={`flex items-center gap-3 rounded-full px-3 py-1.5 text-left text-px14 font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-secondary'}`}
                >
                  <span className="flex gap-0.5" aria-hidden="true">
                    {[s.bg, s.primary, s.hero].map((c, k) => (
                      <span key={k} className="size-3.5 rounded-full border border-foreground/20" style={{ background: c }} />
                    ))}
                  </span>
                  {p.label}
                </button>
                </Fragment>
              )
            })}
          </div>
          <div role="radiogroup" aria-label="Colour mode" className="flex gap-1 rounded-full bg-secondary p-1">
            {MODES.map(({ id, label, Icon }, i) => {
              const on = id === mode
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={label}
                  title={label}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pickMode(id)}
                  onKeyDown={(e) => arrows(e, MODES.length, i, (n) => pickMode(MODES[n].id))}
                  className={`flex flex-1 items-center justify-center rounded-full py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? 'bg-card text-foreground shadow-card' : 'text-ink-2 hover:text-foreground'}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <button
        ref={tab}
        type="button"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Open palette list`}
        onClick={() => setPinned((v) => !v)}
        className="flex items-center rounded-l-xl border border-r-0 border-border bg-card px-2 py-3 shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Dots bg={sw.bg} primary={sw.primary} hero={sw.hero} />
      </button>
    </div>
  )
}
