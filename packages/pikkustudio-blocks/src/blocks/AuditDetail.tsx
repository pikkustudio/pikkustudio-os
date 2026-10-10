import { useContext, useState } from 'react'
import { m } from '@/i18n/messages'
import { asI18n, type I18nNode } from '@pikku/react'
import { ChevronDown, ClipboardCheck } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { Dot } from './RowCard'
import { SidePanel } from './SidePanel'
import { PikkuDot } from './PikkuDot'
import { ago, exactTime, extras, outcomeOf, whatHappened, whoDid, type AuditEntry, type AuditUser } from '../lib/audit'

function Fact({ label, children }: { label: ReturnType<typeof m.audit_screen__detail_who>; children: I18nNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-px14 font-bold text-muted-foreground">{label}</dt>
      <dd className="m-0 text-[16px] text-foreground">{children}</dd>
    </div>
  )
}

export function AuditDetail({ entry, users, now, onClose }: { entry: AuditEntry; users: Record<string, AuditUser> | undefined; now: number; onClose: () => void }) {
  const { say } = useContext(ShellCtx)
  const [technical, setTechnical] = useState(false)
  const outcome = outcomeOf(entry)
  const more = extras(entry.metadata)
  const line = m.audit_screen__line({ who: whoDid(entry, users), did: whatHappened(entry.type) })
  return (
    <SidePanel icon={ClipboardCheck} label={m.audit_screen__detail_title()} title={m.audit_screen__detail_title()} sub={line} onClose={onClose}>
      <dl className="m-0 flex flex-col gap-4">
        <Fact label={m.audit_screen__detail_who()}>{whoDid(entry, users)}</Fact>
        <Fact label={m.audit_screen__detail_when()}>
          {exactTime(entry.occurredAt)}
          <small className="block text-px14 text-ink-2">{ago(entry.occurredAt, now)}</small>
        </Fact>
        {outcome ? (
          <Fact label={m.audit_screen__detail_result()}>
            <Dot tone={outcome.tone}>{outcome.text}</Dot>
          </Fact>
        ) : null}
        {more.map((x, i) => (
          <Fact key={i} label={x.label}>
            {x.value}
          </Fact>
        ))}
      </dl>
      <Button type="button" variant="default" size="page" className="self-start" onClick={() => say(m.audit_screen__ask_line_say({ line, when: exactTime(entry.occurredAt) }))}>
        <PikkuDot />
        {m.audit_screen__ask_about_line()}
      </Button>
      <button type="button" aria-expanded={technical} onClick={() => setTechnical((v) => !v)} className="inline-flex items-center gap-1.5 self-start text-px15 font-semibold text-muted-foreground hover:text-foreground">
        <ChevronDown className={`size-4 transition-transform ${technical ? 'rotate-180' : ''}`} />
        {technical ? m.audit_screen__hide_technical() : m.audit_screen__show_technical()}
      </button>
      {technical ? (
        <div className="rounded-xl bg-secondary p-4">
          <p className="text-px14 text-ink-2">{m.audit_screen__detail_called()}</p>
          <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(entry.type)}</code>
        </div>
      ) : null}
    </SidePanel>
  )
}
