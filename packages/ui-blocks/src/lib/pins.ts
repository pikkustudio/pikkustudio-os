import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useProjectSlug } from './project'
import { registry, isLocalOnly, type NavPin } from './nav-registry'

// Any registered top-level project page can be pinned to the rail (not one with a param or splat, nor one the rail
// already lists). Core's `pins` say which are pinned by default and give a label and icon; a page without one
// uses its own title and a generic icon. A pin is stored by its page's id, the path without its slash.
export type Movable = string
export const pinId = (pin: NavPin): Movable => pin.path.slice(1)
const GENERIC_ICON = 'file-text'
/** The pages a project can pin, in the rail's order: core's pins first, then the other registered pages. */
export const PINNABLE: readonly NavPin[] = (() => {
  const byPath = new Map<string, NavPin>()
  for (const s of registry.screens) {
    if (s.scope !== 'project' || s.nav || s.layout === 'bare' || s.path.includes(':') || s.path.includes('*') || isLocalOnly(s.path)) continue
    if (s.path.split('/').filter(Boolean).length !== 1 || byPath.has(s.path)) continue
    byPath.set(s.path, registry.pins.find((pin) => pin.path === s.path) ?? { path: s.path, label: s.title, icon: GENERIC_ICON, on: false })
  }
  const core = registry.pins.filter((pin) => byPath.has(pin.path))
  return [...core, ...[...byPath.values()].filter((pin) => !core.some((c) => c.path === pin.path))]
})()
export const MOVABLE: readonly Movable[] = PINNABLE.map(pinId)
const DEFAULT_ON: readonly Movable[] = PINNABLE.filter((pin) => pin.on).map(pinId)

const key = (slug: string) => `studio:pins:${slug}`
const offKey = (slug: string) => `studio:pins-off:${slug}`
const EVENT = 'studio:pins'

const list = (k: string): Movable[] => {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is Movable => MOVABLE.includes(x)) : []
  } catch {
    return []
  }
}

const read = (slug: string): Movable[] => {
  const off = list(offKey(slug))
  return MOVABLE.filter((id) => (list(key(slug)).includes(id) || DEFAULT_ON.includes(id)) && !off.includes(id))
}

const save = (k: string, v: Movable[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

export function usePins() {
  const slug = useProjectSlug()
  const [pins, setPins] = useState<Movable[]>(() => read(slug))
  useEffect(() => {
    const sync = () => setPins(read(slug))
    sync()
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [slug])
  const toggle = (id: Movable) => {
    const on = read(slug).includes(id)
    const stored = list(key(slug)).filter((x) => x !== id)
    const off = list(offKey(slug)).filter((x) => x !== id)
    if (on) {
      if (DEFAULT_ON.includes(id)) off.push(id)
    } else if (!DEFAULT_ON.includes(id)) stored.push(id)
    save(key(slug), stored)
    save(offKey(slug), off)
    window.dispatchEvent(new Event(EVENT))
  }
  return { pins, toggle }
}

export const useCurrentMovable = (): Movable | null =>
  useLocation({ select: (l) => MOVABLE.find((id) => l.pathname.endsWith(`/${id}`)) ?? null })
