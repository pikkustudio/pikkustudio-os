import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { AssistantCard } from '../blocks/AssistantCard'
import { AssistantDrawer } from '../blocks/AssistantDrawer'
import { detailsOf, faultOf } from '../blocks/ErrorState'
import { NextCard } from '../blocks/NextCard'
import { PageHead } from '../blocks/PageHead'
import { PikkuDot } from '../blocks/PikkuDot'
import { PikkuSuggests } from '../blocks/PikkuSuggests'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { Section } from '../blocks/Section'
import { Page } from '../blocks/Page'
import { ShellCtx } from '../lib/shell'
import { useAssistants } from '../lib/assistants'
import { useProjectKey, useProjectName } from '../lib/project'

export function AssistantsScreen() {
  const { say, open } = useContext(ShellCtx)
  const [drawer, setDrawer] = useState<{ id: string; tab: 'chat' | 'history' } | null>(null)
  const [search, setSearch] = useState('')
  const projectKey = useProjectKey()
  const query = useAssistants(projectKey)
  const list = query.data ?? []
  const app = useProjectName()
  const idle = list.find((x) => x.chats === 0)
  const a = list.find((x) => x.id === drawer?.id)
  const total = list.reduce((n, x) => n + x.does.length, 0)
  const term = search.trim().toLowerCase()
  const shown = term ? list.filter((x) => [x.id, x.name, x.hello, x.thinks ?? '', ...x.does, ...x.handsOff].some((v) => v.toLowerCase().includes(term))) : list
  const askNew = () => say(m.assistants_screen__add_say())

  return (
    <Page gap="snug">
      <PageHead crumb={app} title={m.assistants_screen__title()} text={m.assistants_screen__text()} size="lead" />

      {list.length > 0 ? (
        <NextCard
          label={m.assistants_screen__your_assistants()}
          hue="petrol"
          page="assistants"
          title={m.assistants_screen__n_work({ count: list.length })}
          why={m.assistants_screen__each_one_talks_to_people({ total })}
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="page" onClick={() => setDrawer({ id: (idle ?? list[0]).id, tab: 'chat' })}>
              {m.assistants_screen__try_one()}
            </Button>
            <Button variant="heroGhost" size="page" onClick={askNew}>
              {m.assistants_screen__ask_new()}
            </Button>
          </div>
        </NextCard>
      ) : query.isPending ? (
        <NextCard label={m.assistants_screen__your_assistants()} hue="teal" page="assistants" title={m.assistants_screen__hero_loading()} why={m.assistants_screen__text()} />
      ) : query.isError ? (
        <NextCard label={m.assistants_screen__your_assistants()} hue="petrol" page="assistants" title={m.assistants_screen__hero_error()} why={m.assistants_screen__hero_error_text()}>
          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="page" onClick={() => say(m.error_state__fix_ask_what({ what: m.assistants_screen__title(), details: detailsOf(faultOf(query.error), m.assistants_screen__title()) }))}>
              <PikkuDot />
              {m.assistants_screen__fix_it()}
            </Button>
          </div>
        </NextCard>
      ) : (
        <NextCard label={m.assistants_screen__your_assistants()} hue="teal" page="assistants" title={m.assistants_screen__empty()} why={m.assistants_screen__empty_text()}>
          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="page" onClick={askNew}>
              <PikkuDot />
              {m.assistants_screen__ask_new()}
            </Button>
          </div>
        </NextCard>
      )}

      <QueryState
        query={query}
        skeleton={<CardsSkeleton count={3} />}
        empty={(d) =>
          d.length === 0 ? <></> : null
        }
      >
        {() => (
          <Section title={m.assistants_screen__meet_title()} sub={m.assistants_screen__meet_sub()}>
            {list.length > 3 ? (
              <label className="relative max-w-xl">
                <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={m.assistants_screen__search()} aria-label={m.assistants_screen__search()} className="h-11.5 rounded-full ps-11" />
              </label>
            ) : null}
            {shown.length === 0 ? (
              <p className="px-1 text-px15 text-ink-2">{m.assistants_screen__no_matches({ query: search.trim() })}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 @3xl/app:grid-cols-3">
                {shown.map((x) => (
                  <AssistantCard key={x.id} x={x} on={x.id === drawer?.id} onChat={() => setDrawer({ id: x.id, tab: 'chat' })} onPast={() => setDrawer({ id: x.id, tab: 'history' })} />
                ))}
              </div>
            )}
            {idle && !term ? <PikkuSuggests title={m.assistants_screen__suggests()} text={m.assistants_screen__idle_text({ name: idle.name })} yes={m.assistants_screen__try_it_for_me()} /> : null}
          </Section>
        )}
      </QueryState>

      {a && drawer && (
        <AssistantDrawer
          key={`${a.id}-${drawer.tab}`}
          a={a}
          projectKey={projectKey}
          start={drawer.tab}
          onClose={() => setDrawer(null)}
          onPikku={() => {
            setDrawer(null)
            open('chat')
          }}
          onFix={(t) => {
            setDrawer(null)
            say(t)
          }}
        />
      )}
    </Page>
  )
}
