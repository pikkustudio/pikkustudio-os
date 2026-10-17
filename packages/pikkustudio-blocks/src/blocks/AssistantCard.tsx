import { m } from '@/i18n/messages'
import { sep } from '@pikku/react'
import { Moon } from 'lucide-react'
import { Button } from '../ui/button'
import type { Assistant } from './AssistantDrawer'

export function AssistantCard({ x, on, onChat, onPast }: { x: Assistant; on: boolean; onChat: () => void; onPast: () => void }) {
  const sleeping = x.chats === 0
  return (
    <article data-hue={x.hue} className={`flex flex-col gap-4 rounded-next bg-hero p-6 text-hero-ink transition-transform${on ? ' ring-4 ring-ring' : ''}`}>
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
      <small className="mt-auto text-[14px] text-hero-ink-2">{sleeping ? m.assistants_screen__not_used() : m.assistants_screen__chats_month({ count: x.chats })}{x.thinks ? sep(' · ') : null}{x.thinks ? m.assistants_screen__thinks_with({ name: x.thinks }) : null}{sep(' ')}{x.check ? m.assistants_screen__check_suffix({ check: x.check }) : m.assistants_screen__no_check_suffix()}</small>
      <div className="flex gap-3">
        <Button variant="hero" size="compact" onClick={() => onChat()}>
          {m.assistants_screen__chat_with_me()}
        </Button>
        <Button variant="heroGhost" size="compact" onClick={() => onPast()}>
          {m.assistants_screen__past_chats()}
        </Button>
      </div>
    </article>
  )
}
