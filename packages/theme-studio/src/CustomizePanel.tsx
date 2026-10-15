import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'
import { palettes, type ColorMode } from './palettes'
import { customizeItems, customizeSections, englishLabels, type CustomizeIcon, type CustomizeItem, type CustomizeLabels } from './registry'
import { applyColorMode, notifyCustomize, subscribeCustomize } from './store'

export type CustomizePanelShell = (props: { title: string; sub: string; closeLabel: string; inline: boolean; onClose: () => void; children: ReactNode }) => ReactNode

let openState = false
const openListeners = new Set<() => void>()
function setOpenState(next: boolean) {
  if (openState === next) return
  openState = next
  openListeners.forEach((l) => l())
}
function useOpenState(): boolean {
  return useSyncExternalStore(
    (cb) => {
      openListeners.add(cb)
      return () => openListeners.delete(cb)
    },
    () => openState,
    () => false,
  )
}

const ICONS: Record<CustomizeIcon | 'sliders', ReactNode> = {
  sliders: (
    <>
      <path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2" />
      <circle cx="14" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
}

export function CustomizeIconSvg({ name, className }: { name: CustomizeIcon | 'sliders'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {ICONS[name]}
    </svg>
  )
}

function useItemValue(item: CustomizeItem): string {
  return useSyncExternalStore(
    subscribeCustomize,
    () => item.read(),
    () => item.fallback,
  )
}

function useIsDark(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const sync = () => setDark(el.classList.contains('dark'))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

function arrows(e: KeyboardEvent<HTMLElement>, count: number, index: number, choose: (i: number) => void) {
  const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  e.preventDefault()
  const next = (index + step + count) % count
  choose(next)
  e.currentTarget.closest('[role=radiogroup]')?.querySelectorAll<HTMLElement>('[role=radio]')[next]?.focus()
}

const ring = 'outline-none focus-visible:ring-2 focus-visible:ring-[var(--cz-ring,currentColor)]'
const row = (on: boolean) =>
  `flex items-center gap-3 rounded-full px-3 py-2 text-start text-[14px] font-bold ${ring} ${on ? 'bg-[var(--cz-accent,#eee)] text-[var(--cz-accent-ink,inherit)]' : 'text-[var(--cz-ink,inherit)] hover:bg-[var(--cz-hover,#0000000d)]'}`

function PaletteControl({ item, value, labels, onPick }: { item: CustomizeItem; value: string; labels: CustomizeLabels; onPick: (v: string) => void }) {
  const dark = useIsDark()
  const choices = item.choices(labels)
  const firstNew = palettes.findIndex((p) => p.group === 'new')
  return (
    <div role="radiogroup" aria-label={item.label(labels)} className="flex flex-col gap-1">
      {choices.map((c, i) => {
        const p = palettes[i]
        const s = dark ? p.dark : p.light
        const on = c.id === value
        return (
          <div key={c.id} role="presentation" className="contents">
            {i === firstNew ? (
              <div role="presentation" className="mt-2 border-t border-[var(--cz-line,#ccc)] px-3 pb-0.5 pt-3 text-[13px] font-bold text-[var(--cz-ink-2,inherit)]">
                {labels.palettesNew}
              </div>
            ) : null}
            <button type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onPick(c.id)} onKeyDown={(e) => arrows(e, choices.length, i, (n) => onPick(choices[n].id))} className={row(on)}>
              <span className="flex gap-0.5" aria-hidden="true">
                {[s.bg, s.primary, s.hero].map((col, k) => (
                  <span key={k} className="size-3.5 rounded-full border border-[var(--cz-line,#ccc)]" style={{ background: col }} />
                ))}
              </span>
              {c.label}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function ListControl({ item, value, labels, onPick }: { item: CustomizeItem; value: string; labels: CustomizeLabels; onPick: (v: string) => void }) {
  const choices = item.choices(labels)
  return (
    <div role="radiogroup" aria-label={item.label(labels)} className="flex flex-col gap-1">
      {choices.map((c, i) => {
        const on = c.id === value
        return (
          <button key={c.id} type="button" role="radio" lang={c.id} aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onPick(c.id)} onKeyDown={(e) => arrows(e, choices.length, i, (n) => onPick(choices[n].id))} className={row(on)}>
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function SegmentedControl({ item, value, labels, onPick }: { item: CustomizeItem; value: string; labels: CustomizeLabels; onPick: (v: string) => void }) {
  const choices = item.choices(labels)
  return (
    <div role="radiogroup" aria-label={item.label(labels)} className="flex gap-0.5 self-start rounded-full bg-[var(--cz-hover,#0000000d)] p-0.5">
      {choices.map((c, i) => {
        const on = c.id === value
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onPick(c.id)}
            onKeyDown={(e) => arrows(e, choices.length, i, (n) => onPick(choices[n].id))}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-bold ${ring} ${on ? 'bg-[var(--cz-surface,#fff)] text-[var(--cz-ink,inherit)] shadow-sm' : 'text-[var(--cz-ink-2,inherit)] hover:text-[var(--cz-ink,inherit)]'}`}
          >
            {c.icon ? <CustomizeIconSvg name={c.icon} /> : null}
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function ItemControl({ item, labels }: { item: CustomizeItem; labels: CustomizeLabels }) {
  const value = useItemValue(item)
  const pick = useCallback(
    (next: string) => {
      item.write(next)
      notifyCustomize()
    },
    [item],
  )
  if (item.control === 'palette') return <PaletteControl item={item} value={value} labels={labels} onPick={pick} />
  if (item.control === 'list') return <ListControl item={item} value={value} labels={labels} onPick={pick} />
  return <SegmentedControl item={item} value={value} labels={labels} onPick={pick} />
}

function Sections({ items, labels }: { items: CustomizeItem[]; labels: CustomizeLabels }) {
  return (
    <>
      {customizeSections.map((section) => {
        const own = items.filter((it) => it.section === section.id)
        if (!own.length) return null
        return (
          <div key={section.id}>
            <h3 className="mb-2 text-[14px] font-bold text-[var(--cz-ink-2,inherit)]">{section.label(labels)}</h3>
            <div className="flex flex-col gap-3">
              {own.map((it) => (
                <div key={it.id} className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-[var(--cz-ink-2,inherit)]">{it.label(labels)}</span>
                  <ItemControl item={it} labels={labels} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

const plainShell: CustomizePanelShell = ({ title, sub, closeLabel, inline, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <aside role="dialog" aria-label={title} className={`${inline ? 'h-full w-full' : 'fixed inset-y-0 end-0 z-50 w-[26rem] max-w-full shadow-2xl'} flex flex-col border-s border-[var(--cz-line,#ccc)] bg-[var(--cz-surface,#fff)] text-[var(--cz-ink,inherit)]`}>
      <header className="flex items-center gap-3 border-b border-[var(--cz-line,#ccc)] px-5 py-4">
        <span className="min-w-0 flex-1">
          <h2 className="text-[20px] font-bold leading-tight">{title}</h2>
          <small className="block text-[14px] text-[var(--cz-ink-2,inherit)]">{sub}</small>
        </span>
        <button type="button" aria-label={closeLabel} onClick={onClose} className={`grid size-11 place-items-center rounded-full hover:bg-[var(--cz-hover,#0000000d)] ${ring}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-5 overflow-auto px-5 pb-6 pt-5">{children}</div>
    </aside>
  )
}

function useSystemMode() {
  const mode = useSyncExternalStore(
    subscribeCustomize,
    () => customizeItems[1].read(),
    () => 'system',
  )
  useEffect(() => {
    if (mode !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyColorMode(mode as ColorMode)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [mode])
}

function useCustomize(labels: CustomizeLabels) {
  const open = useOpenState()
  const tab = useRef<HTMLButtonElement>(null)
  useSystemMode()
  const close = useCallback(() => {
    if (!openState) return
    setOpenState(false)
    requestAnimationFrame(() => tab.current?.focus())
  }, [])
  const tabButton = open ? null : (
    <button
      ref={tab}
      type="button"
      aria-label={labels.open}
      title={labels.open}
      aria-haspopup="dialog"
      onClick={() => setOpenState(true)}
      className={`fixed end-0 top-28 z-40 flex items-center rounded-s-xl border border-e-0 border-[var(--cz-line,#ccc)] bg-[var(--cz-surface,#fff)] px-1.5 py-3 text-[var(--cz-ink-2,inherit)] shadow-lg hover:text-[var(--cz-ink,inherit)] ${ring}`}
    >
      <CustomizeIconSvg name="sliders" />
    </button>
  )
  return { open, close, tabButton }
}

type HostProps = {
  enabled?: boolean
  labels?: CustomizeLabels
  extraItems?: CustomizeItem[]
  shell?: CustomizePanelShell
}

export function CustomizeHost({ enabled = true, labels = englishLabels, extraItems = [], shell = plainShell }: HostProps) {
  const { open, close, tabButton } = useCustomize(labels)
  if (!enabled) return null
  const Shell = shell
  return (
    <>
      {tabButton}
      {open ? (
        <Shell title={labels.title} sub={labels.sub} closeLabel={labels.close} inline={false} onClose={close}>
          <Sections items={[...customizeItems, ...extraItems]} labels={labels} />
        </Shell>
      ) : null}
    </>
  )
}

export function CustomizeAside({ enabled = true, labels = englishLabels, extraItems = [], shell = plainShell, children }: HostProps & { children: ReactNode }) {
  const { open, close, tabButton } = useCustomize(labels)
  if (!enabled) return <>{children}</>
  const Shell = shell
  return (
    <div className="flex h-dvh w-full overflow-hidden" style={{ ['--cz-aside-w' as string]: open ? '26rem' : '0px' }}>
      <div data-cz-column="" className="relative min-w-0 flex-1 overflow-auto [contain:layout]">{children}</div>
      {tabButton}
      <div
        inert={!open}
        aria-hidden={!open}
        className={`max-md:fixed max-md:inset-y-0 max-md:end-0 max-md:z-50 max-md:max-w-full md:relative md:w-[var(--cz-aside-w)] md:shrink-0 md:overflow-hidden md:transition-[width] md:duration-300 md:ease-out motion-reduce:transition-none ${open ? '' : 'max-md:hidden'}`}
      >
        <div className="h-full w-[26rem] max-w-full md:max-w-none">
          <Shell title={labels.title} sub={labels.sub} closeLabel={labels.close} inline onClose={close}>
            <Sections items={[...customizeItems, ...extraItems]} labels={labels} />
          </Shell>
        </div>
      </div>
    </div>
  )
}
