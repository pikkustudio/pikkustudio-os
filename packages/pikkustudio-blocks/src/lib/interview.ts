import type { KnowledgeBundle } from './knowledge'

export type Intake = { path: 'interview' | 'design' | null; done: boolean; idea: string | null; surfaces: string[]; devices: string[] }

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
