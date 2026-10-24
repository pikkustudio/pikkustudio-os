import { m } from '@/i18n/messages'
import { useNavigate } from '@tanstack/react-router'
import { EmptyState } from './EmptyState'
import { BookOpen } from 'lucide-react'
import { AskPikku } from './AskPikku'
import { KnowledgeNote } from './KnowledgeNote'
import { KnowledgeIndexView } from './KnowledgeIndexView'
import { knowledgeGraph } from '../lib/knowledge'
import { keepSearch } from '../lib/project-url'
import { noteTo } from './KnowledgeNote'
import type { Note } from '../types/knowledge'

export function KnowledgeBrowser({ notes, missing, order, note }: { notes: Note[]; missing: Record<string, string>; order: string[]; note?: string }) {
  const { byId, linkedFrom, issues } = knowledgeGraph(notes, missing)
  const navigate = useNavigate()
  const open = (id: string) => navigate({ to: noteTo(id) as never, search: keepSearch as never })
  const shown = note ? byId(note) : undefined

  if (!notes.length)
    return (
      <EmptyState layout="row" icon={BookOpen} title={m.knowledge_browser__nothing_is_written_down()} text={m.knowledge_browser__whenever_you_and_pikku()}>
        <AskPikku size="page" label={m.knowledge_browser__ask_pikku_to_write()} prompt={m.knowledge_browser__please_write_the_first()} />
      </EmptyState>
    )

  return shown ? (
    <KnowledgeNote missing={missing} note={shown} byId={byId} linkedFrom={linkedFrom(shown.id)} />
  ) : (
    <KnowledgeIndexView order={order} notes={notes} issues={issues} onOpen={open} />
  )
}
