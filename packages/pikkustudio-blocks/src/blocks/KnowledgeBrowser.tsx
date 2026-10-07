import { m } from '@/i18n/messages'
import { useState } from 'react'
import { EmptyState } from './EmptyState'
import { BookOpen } from 'lucide-react'
import { AskPikku } from './AskPikku'
import { KnowledgeNote } from './KnowledgeNote'
import { KnowledgeIndexView } from './KnowledgeIndexView'
import { knowledgeGraph } from '../lib/knowledge'
import type { Note } from '../types/knowledge'

export function KnowledgeBrowser({ notes, missing, order, note }: { notes: Note[]; missing: Record<string, string>; order: string[]; note?: string }) {
  const { byId, linkedFrom, issues } = knowledgeGraph(notes, missing)
  const [current, setCurrent] = useState<string | undefined>(note)
  const open = (id: string) => {
    setCurrent(id)
  }
  const shown = current ? byId(current) : undefined

  if (!notes.length)
    return (
      <EmptyState layout="row" icon={BookOpen} title={m.knowledge_browser__nothing_is_written_down()} text={m.knowledge_browser__whenever_you_and_pikku()}>
        <AskPikku size="page" label={m.knowledge_browser__ask_pikku_to_write()} prompt={m.knowledge_browser__please_write_the_first()} />
      </EmptyState>
    )

  return shown ? (
    <KnowledgeNote missing={missing} note={shown} byId={byId} linkedFrom={linkedFrom(shown.id)} onOpen={open} onAll={() => setCurrent(undefined)} />
  ) : (
    <KnowledgeIndexView order={order} notes={notes} issues={issues} onOpen={open} />
  )
}
