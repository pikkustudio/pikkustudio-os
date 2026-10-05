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
