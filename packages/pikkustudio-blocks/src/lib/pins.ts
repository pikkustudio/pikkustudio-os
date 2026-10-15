import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useProjectSlug } from './project'

export const MOVABLE = ['virtual-users', 'translations', 'artifacts', 'content', 'front-doors', 'audit', 'emails', 'knowledge', 'publish'] as const
export type Movable = (typeof MOVABLE)[number]

const DEFAULT_ON: readonly Movable[] = ['emails', 'knowledge', 'publish']

const key = (slug: string) => `studio:pins:${slug}`
const offKey = (slug: string) => `studio:pins-off:${slug}`
const EVENT = 'studio:pins'

const list = (k: string): Movable[] => {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is Movable => (MOVABLE as readonly string[]).includes(x)) : []
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
  useLocation({ select: (l) => (MOVABLE as readonly string[]).find((id) => l.pathname.endsWith(`/${id}`)) as Movable | undefined ?? null })
