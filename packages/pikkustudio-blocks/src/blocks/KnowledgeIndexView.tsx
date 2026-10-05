import { m } from '@/i18n/messages'
import { useState } from 'react'
import { ChevronRight, CircleAlert, FileText, Layers, Search } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { AskPikku } from './AskPikku'
import type { Note } from '../types/knowledge'
import { SECTION_START_HERE } from '../lib/tokens'


export function KnowledgeIndexView({ order, notes, issues, onOpen }: { order: string[]; notes: Note[]; issues: Array<{ id: string; text: string }>; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [sec, setSec] = useState('all')
  const term = q.trim().toLowerCase()
  const found = notes.filter((n) => (sec === 'all' || n.sec === sec) && `${n.t} ${n.sum} ${n.body.join(' ')}`.toLowerCase().includes(term))
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Select value={sec} onValueChange={setSec}>
          <SelectTrigger shape="pill" className="h-12 w-56 shrink-0 border-[1.5px] bg-field" aria-label={m.knowledge_index_view__folder()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{m.knowledge_index_view__all_notes()}</SelectItem>
            {order.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3.5 size-5.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" shape="pill" className="h-12 border-[1.5px] border-input bg-field pl-10.5 text-px16 shadow-none md:text-px16" placeholder={m.knowledge_index_view__search_the_notes()} aria-label={m.knowledge_index_view__search_the_notes()} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {term ? (
        <>
          <p className="px-2 text-px14 text-muted-foreground">{found.length ? `${found.length} found` : m.knowledge_index_view__no_notes_match_try()}</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {found.map((n) => (
              <li key={n.id}>
                <Button variant="ghost" size="profile" type="button" className="h-auto w-full items-start justify-start gap-3 rounded-xl py-3 hover:bg-card hover:shadow-card" onClick={() => onOpen(n.id)}>
                  {n.plan ? <Layers strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted-foreground" /> : <FileText strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
                  <span className="flex min-w-0 flex-1 flex-col text-start">
                    <span className="text-[16px] font-bold">{n.t}</span>
                    <span className="text-px14 font-normal text-ink-2">{n.sum}</span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-px13 font-normal text-muted-foreground">{n.sec === SECTION_START_HERE ? m.knowledge_index_view__start() : n.sec}</span>
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {issues.length && sec === 'all' ? (
            <Alert variant="info">
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-info text-white">
                  <CircleAlert className="size-5.5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <b className="text-[16px] leading-[1.3]">{m.knowledge_index_view__notes_need_a_look({ count: issues.length })}</b>
                  <span className="text-px14 text-ink-2">{m.knowledge_index_view__nobody_links_to_these()}</span>
                </div>
                <AskPikku label={m.knowledge_index_view__ask_pikku_to_fix()} prompt={`Your notes have ${issues.length} problems: ${issues.map((i) => i.text).join(' ')} Can you fix them?`} />
              </div>
              <ul className="m-0 flex list-none flex-col overflow-hidden rounded-xl bg-card p-0">
                {issues.map((i) => (
                  <li key={i.id + i.text} className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-px14 first:border-t-0">
                    <span className="min-w-0 flex-1">{i.text}</span>
                    <Button variant="quiet" size="link" className="px-1.5" type="button" onClick={() => onOpen(i.id)}>
                      
                      {m.knowledge_index_view__open()}
                      <ChevronRight className="size-4" strokeWidth={2.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {order.filter((o) => sec === 'all' || o === sec).map((o) => {
            const list = notes.filter((n) => n.sec === o)
            return list.length ? (
              <section key={o} className="flex flex-col gap-2">
                <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{o}</h2>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {list.map((n) => (
                    <li key={n.id}>
                      <button type="button" onClick={() => onOpen(n.id)} className="flex w-full cursor-pointer items-center gap-3.5 rounded-card border border-border bg-card px-3.5 py-2.5 text-start shadow-card transition-colors hover:border-muted-foreground">
                        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">{n.plan ? <Layers className="size-5" /> : <FileText className="size-5" />}</span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <b className="truncate text-[16px] leading-[1.3]">{n.t}</b>
                          <span className="truncate text-px14 text-ink-2">{n.sum}</span>
                        </span>
                        {n.plan ? <span className="hidden text-px14 text-muted-foreground sm:block">{m.knowledge_index_view__done_of_total({ done: n.plan.done, total: n.plan.total })}</span> : null}
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          })}
        </>
      )}
    </div>
  )
}
