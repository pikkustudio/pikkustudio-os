import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { UserRound } from 'lucide-react'
import { m } from '@/i18n/messages'
import { localeDir, supportedLocales, type Locale } from '@/i18n/config'
import { overwriteGetLocale } from '../paraglide/runtime.js'
import { SidePanel } from '@pikkustudio/blocks/blocks/SidePanel'
import { ImpersonatePanel } from '@pikkustudio/blocks/blocks/ImpersonatePanel'
import { directTransport } from '@pikkustudio/blocks/lib/persona-transport'
import css from './panel.css?inline'

const HOST_ID = 'pikkustudio-injected-panel'
const OPEN_KEY = 'pikkustudio-injected-panel-open'

const pickLocale = (): Locale => {
  const candidates = [document.documentElement.lang, navigator.language].map((l) => (l || '').split('-')[0])
  return (candidates.find((l) => (supportedLocales as readonly string[]).includes(l)) as Locale | undefined) ?? 'en'
}

const readOpen = () => {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

const writeOpen = (open: boolean) => {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    return
  }
}

const transport = directTransport()

function Panel() {
  const [open, setOpen] = useState(readOpen)
  useEffect(() => writeOpen(open), [open])
  if (!open) {
    return (
      <button
        type="button"
        data-testid="injected-panel-tab"
        aria-label={m.injected_panel__open()}
        title={m.injected_panel__open()}
        onClick={() => setOpen(true)}
        className="fixed end-0 top-1/3 z-50 flex cursor-pointer items-center gap-2 rounded-s-full border border-e-0 border-border bg-card py-2.5 ps-3.5 pe-3 text-px15 font-semibold text-foreground shadow-[0_8px_24px_-8px_rgba(8,40,52,0.45)] hover:bg-secondary"
      >
        <UserRound className="size-4.5 text-accent-foreground" />
        <span>{m.injected_panel__tab()}</span>
      </button>
    )
  }
  return (
    <SidePanel icon={UserRound} title={m.impersonate__title()} sub={m.impersonate__text()} label={m.impersonate__title()} onClose={() => setOpen(false)}>
      <ImpersonatePanel transport={transport} onSwitched={() => location.reload()} />
    </SidePanel>
  )
}

const mount = () => {
  if (window.self !== window.top || document.getElementById(HOST_ID)) return
  const locale = pickLocale()
  overwriteGetLocale(() => locale)
  const host = document.createElement('div')
  host.id = HOST_ID
  host.setAttribute('data-palette', 'studio')
  host.setAttribute('dir', localeDir(locale))
  host.setAttribute('lang', locale)
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block'
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
    .replace(/:root(\.dark)?\[data-palette=(['"]?)(\w+)\2\]/g, (all, dark, _q, name) => (dark ? '.never-match' : `:host([data-palette=${name}])`))
    .replace(/:root/g, ':host')
  const root = document.createElement('div')
  root.className = 'font-sans text-foreground'
  root.style.cssText = 'pointer-events:none'
  root.addEventListener('pointerdown', (e) => e.stopPropagation())
  const reenable = document.createElement('style')
  reenable.textContent = '#app > * { pointer-events: auto }'
  root.id = 'app'
  shadow.append(style, reenable, root)
  document.body.appendChild(host)
  createRoot(root).render(
    <StrictMode>
      <Panel />
    </StrictMode>,
  )
}

if (document.body) mount()
else document.addEventListener('DOMContentLoaded', mount, { once: true })
