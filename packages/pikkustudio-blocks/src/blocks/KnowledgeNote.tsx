import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { AlertCircle, ArrowLeft, ChevronRight, FileText } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { AskPikku } from './AskPikku'
import { ChatMarkdown } from './ChatMarkdown'
import type { Note } from '../types/knowledge'

function NoteLinks({ title, empty, children }: { title: I18nString; empty: I18nString; children: I18nNode[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[16px] font-bold">{title}</h3>
      {children.length ? <ul className="flex flex-wrap gap-2 pe-0.5">{children}</ul> : <p className="text-ink-2">{empty}</p>}
    </div>
  )
}

function NoteLink({ note, onOpen }: { note: Note; onOpen: (id: string) => void }) {
  return (
    <li>
      <Button variant="bordered" size="chip" className="gap-2 bg-card px-3.5 text-px145" type="button" onClick={() => onOpen(note.id)}>
        <FileText strokeWidth={1.75} className="size-4" />
        {note.t}
      </Button>
    </li>
  )
}

export function KnowledgeNote({ missing, note, byId, linkedFrom, onOpen, onAll }: { missing: Record<string, string>; note: Note; byId: (id: string) => Note | undefined; linkedFrom: Note[]; onOpen: (id: string) => void; onAll: () => void }) {
  const pct = note.plan ? Math.round((note.plan.done / note.plan.total) * 100) : 0
  return (
    <Card variant="list" className="gap-4 px-8.5 py-7.5" role="article" aria-label={note.t}>
      <div>
        <Button variant="ghost" size="compact" className="-ms-3.5 px-3.5" type="button" onClick={onAll}>
          <ArrowLeft strokeWidth={1.75} className="rtl:-scale-x-100 size-4.5" />
          
          {m.knowledge_note__all_notes()}
        </Button>
      </div>
      <div className="text-[14px] font-semibold text-muted-foreground">{asI18n(note.sec)}</div>
      <h2 className="text-[32px] leading-[1.15] font-bold tracking-[-0.012em]">{note.t}</h2>
      <div className="max-w-[63ch] text-[17px] leading-[1.6]">
        <ChatMarkdown>{note.body.join('\n\n')}</ChatMarkdown>
      </div>
      {note.plan ? (
        <div className="flex flex-wrap items-center gap-4.5 rounded-2xl bg-secondary px-4.5 py-4">
          <b className="text-[16px]">{m.knowledge_note__step_of_plan({ step: note.plan.step })}</b>
          <div className="h-2.5 w-50 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={note.plan.done} aria-valuemin={0} aria-valuemax={note.plan.total}>
            <i className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span>
            {m.knowledge_note__built_of_total({ done: note.plan.done, total: note.plan.total })}
          </span>
          <Button variant="quiet" size="link" type="button">
            
            {m.knowledge_note__see_the_build_plan()}
            <ChevronRight className="rtl:-scale-x-100 size-4" strokeWidth={2.5} />
          </Button>
        </div>
      ) : null}
      <NoteLinks title={m.knowledge_note__this_note_points_to()} empty={m.knowledge_note__nothing_it_stands_on()}>
        {note.links.map((l) => {
          const t = byId(l)
          const missingName: string = missing[l]
          return t ? (
            <NoteLink key={l} note={t} onOpen={onOpen} />
          ) : (
            <li key={l}>
              <Button variant="bordered" size="chip" asChild className="cursor-default gap-2 border-dashed bg-card px-3.5 text-px145 text-warning-foreground hover:border-input hover:bg-card">
                <span title={m.knowledge_note__nobody_has_written_this()}>
                  <AlertCircle strokeWidth={1.75} className="size-4" />
                  {asI18n(missingName)}
                  <Badge variant="warn">{m.knowledge_note__not_written_yet()}</Badge>
                </span>
              </Button>
            </li>
          )
        })}
      </NoteLinks>
      <NoteLinks title={m.knowledge_note__these_notes_point_here()} empty={m.knowledge_note__no_other_note_points()}>
        {linkedFrom.map((b) => (
          <NoteLink key={b.id} note={b} onOpen={onOpen} />
        ))}
      </NoteLinks>
      <div className="flex flex-wrap items-center gap-3.5 border-t border-border pt-3.5">
        <span className="text-[14px] text-muted-foreground">{m.knowledge_note__notes_are_read_only()}</span>
        <AskPikku label={m.knowledge_note__ask_pikku_to_change()} prompt={m.knowledge_note__i_read_the_note_i({ t: note.t })} />
      </div>
    </Card>
  )
}
