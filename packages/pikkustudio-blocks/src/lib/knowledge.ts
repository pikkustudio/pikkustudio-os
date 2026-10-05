import type { Note } from '../types/knowledge'

export function knowledgeGraph(notes: Note[], missing: Record<string, string>) {
  const byId = (id: string) => notes.find((n) => n.id === id)
  const linkedFrom = (id: string) => notes.filter((n) => n.links.includes(id))
  const issues: Array<{ id: string; text: string }> = []
  for (const n of notes) for (const l of n.links) if (!byId(l)) issues.push({ id: n.id, text: `“${n.t}” links to “${missing[l]}”, which has not been written yet.` })
  for (const n of notes) if (n.id !== 'start' && !linkedFrom(n.id).length) issues.push({ id: n.id, text: `“${n.t}” is not linked from any other note, so nobody will find it by browsing.` })
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
      return {
        id: idOf(n),
        sec: n.section || START,
        t: n.title,
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
    .map((n) => ({ path: n.path, title: n.title }))

export const NEW_QUESTIONS = [
  { label: 'Ask me what visitors can do', ask: 'Interview me about what a visitor can do in this app. Ask one question at a time, and write each answer into knowledge.' },
  { label: 'What is still missing?', ask: 'Look at the knowledge base and ask me the one question whose answer would add the most to what this app can do. Then write my answer into knowledge.' },
  { label: 'Who is this for?', ask: 'Ask me who this app is for and what they need from it, one question at a time, and write the answers into knowledge.' },
]

export const answerPrompt = (q: { path: string; title: string }) =>
  `Let us answer this open question from the knowledge base: "${q.title}" (${q.path}). Ask me what you need to know, one question at a time. When I have answered, write the answer into that note, mark it answered, and add any new features it implies.`
