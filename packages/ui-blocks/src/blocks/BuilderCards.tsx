import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CircleAlert, Flag, type LucideIcon } from 'lucide-react'
import { m } from '@/i18n/messages'
import { PAGES } from '../lib/nav-registry'
import { Button } from '../ui/button'

const TONE = {
  needs: { box: 'border-[1.5px] border-warning', ic: 'bg-warning text-on-warning', label: 'text-warning-foreground' },
  fixed: { box: 'border border-border', ic: 'bg-success-soft text-success-foreground', label: 'text-success-foreground' },}

function ChatCard({ tone, icon: Icon, label, title, text, testId, children }: { tone: keyof typeof TONE; icon: LucideIcon; label: I18nString; title: I18nString; text?: I18nString; testId: string; children?: I18nNode }) {
  const t = TONE[tone]
  return (
    <article className={`flex flex-col gap-2 rounded-card bg-card p-4.5 shadow-card ${t.box}`} data-testid={testId}>
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9.5 shrink-0 place-items-center rounded-lg ${t.ic}`}>
          <Icon className="size-5.25" aria-hidden="true" />
        </span>
        <span className={`text-[14px] font-bold ${t.label}`}>{label}</span>
      </div>
      <h3 className="font-sans text-[17px] leading-[1.3] font-bold tracking-normal text-balance">{title}</h3>
      {text ? <p className="text-[15px] leading-[1.5] text-pretty text-ink-2">{text}</p> : null}
      {children ? <div className="mt-1.5 flex flex-wrap gap-2">{children}</div> : null}
    </article>
  )
}

export const canOpenScreen = (screen: string) => Object.hasOwn(PAGES, screen)

export function OpenScreenCard({ screen, title }: { screen: string; title?: string }) {
  const navigate = useNavigate()
  if (!canOpenScreen(screen)) return null
  return (
    <div className="ps-12" data-testid="open-screen-card">
      <Button variant="bordered" size="chip" type="button" className="max-w-full bg-card" onClick={() => navigate({ to: `/${screen}` as never, search: ((prev: object) => prev) as never })}>
        <span className="min-w-0 truncate">{title ? asI18n(title) : m.builder_cards__open_it()}</span>
        <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </Button>
    </div>
  )
}

export function MilestoneCard({ title }: { title: string }) {
  return <ChatCard tone="fixed" icon={Flag} label={m.builder_cards__finished()} title={asI18n(title)} text={m.builder_cards__finished_text()} testId="milestone-card" />
}

export function ChecksCard({ output, busy, onFix }: { output: string; busy: boolean; onFix: () => void }) {
  return (
    <ChatCard tone="needs" icon={CircleAlert} label={m.shell_layout__needs_you()} title={m.builder_cards__checks_title()} text={m.builder_cards__checks_text()} testId="checks-card">
      <Button variant="default" size="compact" type="button" disabled={busy} onClick={onFix}>
        {m.builder_cards__checks_fix()}
      </Button>
      <details className="w-full text-ink-2">
        <summary className="cursor-pointer text-[13px]">{m.shell_layout__error_details()}</summary>
        <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg bg-secondary p-2.5 text-[12px] leading-snug whitespace-pre-wrap">{asI18n(output)}</pre>
      </details>
    </ChatCard>
  )
}
