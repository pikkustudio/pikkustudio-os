import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useProjectSlug } from './project'

export const MOVABLE = ['virtual-users', 'translations', 'artifacts', 'content', 'apps'] as const
export type Movable = (typeof MOVABLE)[number]

const key = (slug: string) => `studio:pins:${slug}`
const EVENT = 'studio:pins'

const read = (slug: string): Movable[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key(slug)) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is Movable => (MOVABLE as readonly string[]).includes(x)) : []
  } catch {
    return []
  }
}

export function usePins() {
  const slug = useProjectSlug()
  const [pins, setPins] = useState<Movable[]>([])
  useEffect(() => {
    const sync = () => setPins(read(slug))
    sync()
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [slug])
  const toggle = (id: Movable) => {
    const next = read(slug).includes(id) ? read(slug).filter((x) => x !== id) : [...read(slug), id]
    try {
      localStorage.setItem(key(slug), JSON.stringify(next))
    } catch {}
    window.dispatchEvent(new Event(EVENT))
  }
  return { pins, toggle }
}

export const FIXED = ['overview', 'design', 'changes-directions', 'emails', 'knowledge', 'publish'] as const

export const useCurrentFixed = (): boolean =>
  useLocation({ select: (l) => (FIXED as readonly string[]).some((id) => l.pathname.endsWith(`/${id}`)) })

export const useCurrentMovable = (): Movable | null =>
  useLocation({ select: (l) => (MOVABLE as readonly string[]).find((id) => l.pathname.endsWith(`/${id}`)) as Movable | undefined ?? null })
