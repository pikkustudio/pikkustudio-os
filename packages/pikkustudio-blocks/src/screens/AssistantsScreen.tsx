import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Button } from '../ui/button'
import { Art } from '../blocks/ExploreHub'
import { AssistantCard } from '../blocks/AssistantCard'
import { AssistantDrawer, type Assistant } from '../blocks/AssistantDrawer'
import { NextCard } from '../blocks/NextCard'
import { PageHead } from '../blocks/PageHead'
import { PikkuSuggests } from '../blocks/PikkuSuggests'
import { Section } from '../blocks/Section'
import { Page } from '../blocks/Page'
import { ShellCtx } from '../lib/shell'
import { useAssistants } from '../lib/assistants'
import { useProjectKey, useProjectName } from '../lib/project'

export function AssistantsScreen() {
  const { say, open } = useContext(ShellCtx)
  const [drawer, setDrawer] = useState<{ id: string; tab: 'chat' | 'history' } | null>(null)
  const projectKey = useProjectKey()
  const { data: list = [] } = useAssistants(projectKey)
  const app = useProjectName()
  const idle = list.find((x) => x.chats === 0)
  const a = list.find((x) => x.id === drawer?.id)
  const total = list.reduce((n, x) => n + x.does.length, 0)

  return (
    <Page gap="snug">
      <PageHead crumb={app} title={m.assistants_screen__title()} text={m.assistants_screen__text()} size="lead" />

      <NextCard
        label={m.assistants_screen__your_assistants()}
        hue="petrol"
        art={<Art />}
        title={m.assistants_screen__n_work({ count: list.length })}
        why={m.assistants_screen__each_one_talks_to_people({ total })}
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="hero" size="page" onClick={() => say(m.assistants_screen__try_say())}>
            {m.assistants_screen__try_one()}
          </Button>
          <Button variant="heroGhost" size="page" onClick={() => say(m.assistants_screen__add_say())}>
            {m.assistants_screen__ask_new()}
          </Button>
        </div>
      </NextCard>

      <Section title={m.assistants_screen__meet_title()} sub={m.assistants_screen__meet_sub()}>
        <div className="grid grid-cols-1 gap-4 @3xl/app:grid-cols-3">
          {list.map((x) => {
            return <AssistantCard key={x.id} x={x} on={x.id === drawer?.id} onChat={() => setDrawer({ id: x.id, tab: 'chat' })} onPast={() => setDrawer({ id: x.id, tab: 'history' })} />
          })}
        </div>
        {idle ? <PikkuSuggests title={m.assistants_screen__suggests()} text={m.assistants_screen__idle_text({ name: idle.name })} yes={m.assistants_screen__try_it_for_me()} /> : null}
      </Section>

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
