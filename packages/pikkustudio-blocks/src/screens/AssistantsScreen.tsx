import { m } from '@/i18n/messages'
import { sep } from '@pikku/react'
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
                <p className="relative rounded-[20px] rounded-ss-md bg-white px-4 py-3 text-[16px] leading-[1.4] text-hero-btn-ink">{x.hello}</p>
                <p className="text-[15px] text-hero-ink-2">
                  {x.does.length === 0 ? m.assistants_screen__no_actions() : m.assistants_screen__i_can({ list: x.does.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join(', ') })}
                  {x.handsOff.length > 0 ? sep(' ') : null}
                  {x.handsOff.length > 0 ? m.assistants_screen__hands_off({ list: x.handsOff.join(', ') }) : null}
                </p>
                <small className="mt-auto text-[14px] text-hero-ink-2">{sleeping ? m.assistants_screen__not_used() : m.assistants_screen__chats_month({ count: x.chats })}{sep(' ')}{x.check ? m.assistants_screen__check_suffix({ check: x.check }) : m.assistants_screen__no_check_suffix()}</small>
                <div className="flex gap-3">
                  <Button variant="hero" size="compact" onClick={() => setDrawer({ id: x.id, tab: 'chat' })}>
                    {m.assistants_screen__chat_with_me()}
                  </Button>
                  <Button variant="heroGhost" size="compact" onClick={() => setDrawer({ id: x.id, tab: 'history' })}>
                    {m.assistants_screen__past_chats()}
                  </Button>
                </div>
              </article>
            )
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
