import { m } from '@/i18n/messages'
import { Globe, Monitor, Plug, Smartphone, Tablet, Terminal } from 'lucide-react'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'

export const appKinds = () => [
  { id: 'web', short: m.app_kind_list__website(), title: m.app_kind_list__website_or_web_app(), text: m.app_kind_list__people_open_it_in(), Icon: Globe },
  { id: 'ios', short: m.app_kind_list__i_phone(), title: m.app_kind_list__i_phone_and_i_pad_app(), text: m.app_kind_list__a_real_app_in(), Icon: Tablet },
  { id: 'android', short: m.app_kind_list__android(), title: m.app_kind_list__android_app(), text: m.app_kind_list__a_real_app_in_2(), Icon: Smartphone },
  { id: 'desktop', short: m.app_kind_list__computer(), title: m.app_kind_list__computer_app(), text: m.app_kind_list__a_program_people_install(), Icon: Monitor },
  { id: 'mcp', short: m.app_kind_list__assistant_tool(), title: m.app_kind_list__ai_assistant_tool_mcp(), text: m.app_kind_list__lets_ai_assistants_like(), Icon: Plug },
  { id: 'cli', short: m.app_kind_list__command_line(), title: m.app_kind_list__command_line_tool(), text: m.app_kind_list__a_program_you_run(), Icon: Terminal },
]

export function AppKindList({ on, onFlip, status }: { on: string[]; onFlip: (id: string) => void; status?: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {appKinds().map(({ id, title, text, Icon }) => (
        <li key={id} className="flex items-center gap-3.5 rounded-card border border-border bg-card px-3.5 py-2.5 shadow-card">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
            <Icon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-[16px] leading-[1.3]">{title}</b>
            <span className="truncate text-px14 text-ink-2">{text}</span>
          </span>
          {status && on.includes(id) ? <Badge variant={id === 'web' ? 'pillOk' : 'pillMute'}>{id === 'web' ? m.app_kind_list__made_today() : m.app_kind_list__not_started()}</Badge> : null}
          <Switch checked={on.includes(id)} onCheckedChange={() => onFlip(id)} aria-label={title} />
        </li>
      ))}
    </ul>
  )
}
