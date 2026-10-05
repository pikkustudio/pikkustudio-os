import { m } from '@/i18n/messages'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Cloud, Download, Hammer, Laptop } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { keep } from '../lib/links'
import { AskPikku } from './AskPikku'
import { appKinds } from './AppKindList'

export type AppItem = { id: string; kind: string; name: string; summary: string; sketch: 'home' | 'classes' | 'book'; state: 'made' | 'building' | 'new'; when: string; where?: 'local' | 'remote' }

const HELP_FLAG = '--help'

const states = () => ({
  made: { text: m.app_card__ready(), icon: Check, variant: 'pillOk' },
  building: { text: m.app_card__being_made(), icon: Hammer, variant: 'pillInfo' },
  new: { text: m.app_card__not_started(), icon: Hammer, variant: 'pillMute' },
} as const)

export function AppCard({ item }: { item: AppItem }) {
  const kind = appKinds().find((k) => k.id === item.kind) ?? appKinds()[0]
  const st = states()[item.state]
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card" aria-label={item.name}>
      <div className="grid aspect-[2/1] place-items-center overflow-hidden border-b border-border bg-secondary">
        {item.kind === 'cli' ? (
          <div className="size-full bg-[#0E1F24] p-4 font-mono text-[13px] leading-6 text-[#D5E2E6]">
            <div><span className="text-[#6FD3D8]">$</span> {`${item.name.toLowerCase().replace(/\s+/g, '-')} ${HELP_FLAG}`}</div>
          </div>
        ) : (
          <span className="grid size-20 place-items-center rounded-2xl bg-card text-ink-2 shadow-card">
            <kind.Icon className="size-9" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-4.5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="pillMute" className="gap-1.5">
            <kind.Icon /> {kind.short}
          </Badge>
          {item.where ? (
            <Badge variant="pillInfo" className="gap-1.5">
              {item.where === 'remote' ? <Cloud /> : <Laptop />}
              {item.where === 'remote' ? m.app_card__remote() : m.app_card__local()}
            </Badge>
          ) : null}
          <Badge variant={st.variant}>
            <st.icon strokeWidth={2.5} />
            {st.text}
          </Badge>
        </div>
        <b className="text-[19px] leading-[1.25]">{item.name}</b>
        <span className="text-ink-2 text-pretty">{item.summary}</span>
        <span className="text-[14px] text-muted-foreground">{m.app_card__last_worked_on({ when: item.when })}</span>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <Button asChild variant="default" size="compact">
            <Link {...keep} to="/build">
              
              {m.app_card__open_in_build()}
              <ArrowRight className="size-4.5" />
            </Link>
          </Button>
          <AskPikku label={m.app_card__change_it()} prompt={`About "${item.name}": `} />
          <Button variant="ghost" size="compact" type="button" disabled={item.state === 'new'} title={item.state === 'new' ? m.app_card__nothing_to_get_yet() : m.app_card__get_the_files()}>
            <Download className="size-4.5" />
            
            {m.app_card__get_the_files()}
          </Button>
        </div>
      </div>
    </article>
  )
}
