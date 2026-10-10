import type { KnowledgeBundle } from './knowledge'

export type Interview = { name: string; idea: string; surfaces: string[]; devices: string[]; uploadId?: string; started?: boolean }

const slot = (key: string) => `studio.interview.${key}`

export const recallInterview = (key: string): Interview | null => {
  try {
    const raw = localStorage.getItem(slot(key))
    return raw ? (JSON.parse(raw) as Interview) : null
  } catch {
    return null
  }
}

export const rememberInterview = (key: string, value: Interview) => {
  try {
    localStorage.setItem(slot(key), JSON.stringify(value))
  } catch {
    return
  }
}

export const forgetInterview = (key: string) => {
  try {
    localStorage.removeItem(slot(key))
  } catch {
    return
  }
}

const LIMIT = 8000

export const ideaWithInterview = (idea: string, bundle: KnowledgeBundle | null | undefined) => {
  const notes = (bundle?.notes ?? [])
    .filter((n) => n.reserved !== 'log' && (n.body.trim() || n.description))
    .map((n) => `## ${n.title}\n${[n.description, n.body.trim()].filter(Boolean).join('\n')}`)
    .join('\n\n')
    .slice(0, LIMIT)
  if (!notes) return idea
  return `${idea}\n\nThe owner was interviewed about their business and this product before these designs. What follows are the notes taken. They may be incomplete or imprecise, so treat them as hints that shape each direction, and let the idea above decide anything they leave open.\n\n${notes}`
}
