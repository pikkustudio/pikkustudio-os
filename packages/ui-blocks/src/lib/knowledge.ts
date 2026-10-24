import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { Note } from '../types/knowledge'

export function knowledgeGraph(notes: Note[], missing: Record<string, string>) {
  const byId = (id: string) => notes.find((n) => n.id === id)
  const linkedFrom = (id: string) => notes.filter((n) => n.links.includes(id))
  const issues: Array<{ id: string; text: I18nString }> = []
  for (const n of notes) for (const l of n.links) if (!byId(l)) issues.push({ id: n.id, text: m.knowledge__issue_missing({ title: n.t, target: missing[l] ?? '' }) })
  for (const n of notes) if (n.id !== 'start' && !linkedFrom(n.id).length) issues.push({ id: n.id, text: m.knowledge__issue_unlinked({ title: n.t }) })
  return { byId, linkedFrom, issues, linkCount: notes.reduce((c, n) => c + n.links.length, 0) }
}

type BundleNote = {
  path: string
  section: string
  type?: string
  title: string
  description?: string
  status?: string
  statusAt?: string
  reserved?: 'index' | 'log'
  body: string
  outbound: string[]
  dangling: string[]
}
export type KnowledgeBundle = { notes: BundleNote[]; sections: { name: string }[] }

const START = 'Start here'
const idOf = (n: Pick<BundleNote, 'path' | 'reserved'>) => (n.reserved === 'index' ? 'start' : n.path)
const nice = (p: string) => {
  const name = p.split('/').pop()!.replace(/\.md$/, '').replace(/[-_]/g, ' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function notesFromBundle(bundle: KnowledgeBundle) {
  const ids = new Map(bundle.notes.map((n) => [n.path, idOf(n)]))
  const missing: Record<string, string> = {}
  const notes: Note[] = bundle.notes
    .filter((n) => n.reserved !== 'log')
    .map((n) => {
      for (const d of n.dangling) missing[d] = nice(d)
      const title = asI18n(n.title)
      return {
        id: idOf(n),
        sec: n.section || START,
        t: title,
        sum: n.description ?? '',
        body: n.body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean),
        links: [...n.outbound.map((p) => ids.get(p) ?? p), ...n.dangling],
        det: { kind: n.type ?? 'Note', status: n.status ?? '', updated: n.statusAt ?? '' },
      }
    })
  const order = [START, ...bundle.sections.map((s) => s.name).filter((s) => s && s !== START)]
  return { notes, missing, order }
}

const CLOSED = /^(answered|closed|done|resolved)$/i

export const openQuestions = (bundle: KnowledgeBundle | null) =>
  (bundle?.notes ?? [])
    .filter((n) => !n.reserved && n.section === 'questions' && !CLOSED.test(n.status ?? ''))
    .map((n) => {
      const title = asI18n(n.title)
      return { path: n.path, title }
    })

export const newQuestions = (): Array<{ label: I18nString; ask: I18nString }> => [
  { label: m.knowledge__q_visitors_label(), ask: m.knowledge__q_visitors_ask() },
  { label: m.knowledge__q_missing_label(), ask: m.knowledge__q_missing_ask() },
  { label: m.knowledge__q_for_label(), ask: m.knowledge__q_for_ask() },
]

export const answerPrompt = (q: { path: string; title: I18nString }): I18nString => m.knowledge__answer_prompt({ title: q.title, path: q.path })
