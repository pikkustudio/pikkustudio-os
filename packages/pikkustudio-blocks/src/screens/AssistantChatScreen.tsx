import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Bot } from 'lucide-react'
import { Button } from '../ui/button'
import { Art } from '../blocks/ExploreHub'
import { AssistantCard } from '../blocks/AssistantCard'
import { AssistantDrawer } from '../blocks/AssistantDrawer'
import { EmptyState } from '../blocks/EmptyState'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { QueryState } from '../blocks/QueryState'
import { Section } from '../blocks/Section'
import { useAssistants } from '../lib/assistants'
import { ShellCtx } from '../lib/shell'
import { useProjectKey, useProjectName } from '../lib/project'

export function AssistantChatScreen() {
  const { say, open } = useContext(ShellCtx)
  const projectKey = useProjectKey()
  const app = useProjectName()
  const query = useAssistants(projectKey)
  const [drawer, setDrawer] = useState<{ id: string; tab: 'chat' | 'history' } | null>(null)

  return (
    <Page gap="snug">
      <PageHead crumb={app} title={m.assistant_chat__title()} text={m.assistant_chat__text()} size="lead" />
      <QueryState
        query={query}
        skeleton={<div className="h-48 animate-pulse rounded-next bg-secondary" />}
        empty={(list) =>
          list.length ? null : (
            <EmptyState icon={Bot} title={m.assistant_chat__none_title()} text={m.assistant_chat__none_text()}>
              <Button type="button" size="page" onClick={() => say(m.assistant_chat__none_say())}>
                {m.assistant_chat__none_action()}
              </Button>
            </EmptyState>
          )
        }
      >
        {(list) => {
          const a = list.find((x) => x.id === drawer?.id)
          return (
            <>
              <NextCard
                label={m.assistants_screen__your_assistants()}
                hue="petrol"
                art={<Art />}
                title={m.assistants_screen__n_work({ count: list.length })}
                why={m.assistants_screen__each_one_talks_to_people({ total: list.reduce((n, x) => n + x.does.length, 0) })}
              >
                <div>
                  <Button variant="hero" size="page" onClick={() => setDrawer({ id: list[0].id, tab: 'chat' })}>
                    {m.assistants_screen__try_one()}
                  </Button>
                </div>
              </NextCard>
              <Section title={m.assistants_screen__meet_title()} sub={m.assistants_screen__meet_sub()}>
                <div className="grid grid-cols-1 gap-4 @3xl/app:grid-cols-3">
                  {list.map((x) => (
                    <AssistantCard key={x.id} x={x} on={x.id === drawer?.id} onChat={() => setDrawer({ id: x.id, tab: 'chat' })} onPast={() => setDrawer({ id: x.id, tab: 'history' })} />
                  ))}
                </div>
              </Section>
              {a && drawer ? (
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
              ) : null}
            </>
          )
        }}
      </QueryState>
    </Page>
  )
}
