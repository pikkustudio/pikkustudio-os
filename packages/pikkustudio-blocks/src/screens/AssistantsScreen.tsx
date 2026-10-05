import { useContext, useState } from 'react'
import { Moon } from 'lucide-react'
import { Button } from '../ui/button'
import { Art } from '../blocks/ExploreHub'
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
      <PageHead crumb={app} title="Assistants" text="The AI helpers inside your app. They talk with your visitors for you, and each one can only do the things listed here." size="lead" />

      <NextCard
        label="Your assistants"
        hue="petrol"
        art={<Art />}
        title={`${list.length} assistants work in your app`}
        why={`Each one talks to people in plain language and can take actions for them, like checking a class or booking a seat. Between them they can do ${total} things.`}
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="hero" size="page" onClick={() => say('Try the Booking helper the way a visitor would')}>
            Try one out
          </Button>
          <Button variant="heroGhost" size="page" onClick={() => say('Add a new assistant to my app')}>
            Ask Pikku for a new one
          </Button>
        </div>
      </NextCard>

      <Section title="Meet the team" sub="Chat with one the way a visitor would, or read back what it said to real people.">
        <div className="grid grid-cols-1 gap-4 @3xl/app:grid-cols-3">
          {list.map((x) => {
            const sleeping = x.chats === 0
            const on = x.id === drawer?.id
            return (
              <article key={x.id} data-hue={x.hue} className={`flex flex-col gap-4 rounded-next bg-hero p-6 text-hero-ink transition-transform${on ? ' ring-4 ring-ring' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white text-hero-btn-ink" aria-hidden="true">
                    {sleeping ? <Moon className="size-8" /> : <x.icon className="size-8" />}
                  </span>
                  <h3 className="font-heading text-[24px] leading-[1.15] font-bold tracking-[-0.015em]">{x.name}</h3>
                </div>
                <p className="relative rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-[16px] leading-[1.4] text-hero-btn-ink">{x.hello}</p>
                <p className="text-[15px] text-hero-ink-2">
                  {x.does.length === 0 ? 'Answers questions, takes no actions.' : `I can ${x.does.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join(', ')}.`}
                  {x.handsOff.length > 0 && ` If it is not mine, I pass people to the ${x.handsOff.join(', ')}.`}
                </p>
                <small className="mt-auto text-[14px] text-hero-ink-2">{sleeping ? 'Not used yet' : `${x.chats} chats this month`}{x.check ? ` · ${x.check}` : ' · no quality check'}</small>
                <div className="flex gap-3">
                  <Button variant="hero" size="compact" onClick={() => setDrawer({ id: x.id, tab: 'chat' })}>
                    Chat with me
                  </Button>
                  <Button variant="heroGhost" size="compact" onClick={() => setDrawer({ id: x.id, tab: 'history' })}>
                    Past chats
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
        {idle ? <PikkuSuggests title="Pikku suggests" text={`Nobody has talked to the ${idle.name} yet. I can send it a pretend visitor so you can see what it says.`} yes="Try it for me" /> : null}
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
