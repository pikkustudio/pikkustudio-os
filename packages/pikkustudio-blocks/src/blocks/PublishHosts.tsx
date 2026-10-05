import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { DevDetails } from './DevDetails'
import { PikkuDot } from './PikkuDot'
import { Section } from './Section'
import { StatusLine } from './StatusLine'

const sample = () => ({
  hosts: [
    { title: m.publish_hosts__on_my_own_computer(), text: m.publish_hosts__your_app_runs_as(), what: m.publish_hosts__on_my_own_computer_2() },
    { title: m.publish_hosts__cloudflare_2(), text: m.publish_hosts__a_fast_host_with(), what: m.publish_hosts__on_cloudflare() },
    { title: m.publish_hosts__amazon_aws(), text: m.publish_hosts__your_app_only_runs(), what: m.publish_hosts__on_amazon_web_services() },
    { title: m.publish_hosts__microsoft_azure(), text: m.publish_hosts__microsoft_s_cloud_a_good(), what: m.publish_hosts__on_microsoft_azure() },
  ],
  steps: [m.publish_hosts__add_what_your_app(), m.publish_hosts__ask_you_for_any(), m.publish_hosts__check_the_app_still(), m.publish_hosts__tell_you_how_to()],
})

const prompt = (what: string) =>
  `Please get my app ready to run ${what}. Add whatever it needs for that. Before you use any account or password, ask me for it, and tell me about anything I have to do myself.`

function Host({ title, text, what, picked, onPick }: ReturnType<typeof sample>['hosts'][number] & { picked: boolean; onPick: () => void }) {
  const { say } = useContext(ShellCtx)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  return (
    <li className={`flex flex-col gap-3 rounded-card border bg-card px-3.5 py-2.5 shadow-card ${picked ? 'border-primary' : 'border-border'}`}>
      <button type="button" role="radio" aria-checked={picked} onClick={onPick} className="group/radio flex w-full cursor-pointer items-center gap-3.5 text-start">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-input group-aria-checked/radio:border-primary">
          <span className="size-3 rounded-full bg-primary opacity-0 group-aria-checked/radio:opacity-100" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-[16px] leading-[1.3]">{title}</b>
          <span className="truncate text-px14 text-ink-2">{text}</span>
        </span>
      </button>
      {picked ? (
        <div className="flex flex-col gap-3 pb-1 pl-9.5">
          {open ? (
            <div className="flex flex-col gap-2.5 rounded-dev bg-secondary px-4 py-3.5 text-px15 text-foreground">
              <b>{m.publish_hosts__what_you_give_to()}</b>
              <blockquote className="text-px15 font-semibold">“{prompt(what)}”</blockquote>
              <b>{m.publish_hosts__what_pikku_will_do()}</b>
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-ink-2">
                {sample().steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="bordered" size="compact" type="button" className="gap-2.25" onClick={() => say(prompt(what))}>
              <PikkuDot />
              
              {m.publish_hosts__ask_pikku_to_do()}
            </Button>
            <Button variant="bordered" size="compact" type="button" onClick={() => setCopied(true)}>
              <Copy className="size-4.5" />
              
              {m.publish_hosts__copy_the_steps()}
            </Button>
            <Button variant="bordered" size="compact" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? m.publish_hosts__hide_the_steps() : m.publish_hosts__show_the_steps()}
            </Button>
          </div>
          {copied ? <StatusLine tone="ok" text={m.publish_hosts__copied_you_can_paste()} /> : null}
        </div>
      ) : null}
    </li>
  )
}

export function PublishHosts() {
  const [picked, setPicked] = useState<string>()
  return (
    <Section title={m.publish_hosts__or_put_it_somewhere()} sub={m.publish_hosts__prefer_a_different_home()}>
      <ul role="radiogroup" aria-label={m.publish_hosts__where_to_run_your()} className="m-0 flex list-none flex-col gap-2 p-0">
        {sample().hosts.map((h) => (
          <Host key={h.title} {...h} picked={picked === h.title} onPick={() => setPicked(h.title)} />
        ))}
      </ul>
    </Section>
  )
}

export function PublishDeveloperNotes() {
  return (
    <DevDetails>
      <p>
        <b>{m.publish_hosts__publish_to_fabric()}</b>  {m.publish_hosts__uploads_the_built_app()}
      </p>
      <p>
        {m.publish_hosts__other_places_text()} <code className="rounded-sm bg-secondary px-1.5 py-px font-mono text-[13px]">{m.publish_hosts__standalone()}</code> {m.publish_hosts__node_server_text()}, <code className="rounded-sm bg-secondary px-1.5 py-px font-mono text-[13px]">{m.publish_hosts__cloudflare()}</code> {m.publish_hosts__workers_text()}, <code className="rounded-sm bg-secondary px-1.5 py-px font-mono text-[13px]">{m.publish_hosts__serverless()}</code> {m.publish_hosts__functions_text()} {m.publish_hosts__and_note()} <code className="rounded-sm bg-secondary px-1.5 py-px font-mono text-[13px]">{m.publish_hosts__azure()}</code> {m.publish_hosts__azure_functions_text()}. {m.publish_hosts__each_is_a_prompt_text()}
      </p>
    </DevDetails>
  )
}
