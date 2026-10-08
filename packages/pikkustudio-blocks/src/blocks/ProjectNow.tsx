import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Check, Cloud, CircleAlert, Globe, Laptop } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'
import { RowCard, RowStack } from './RowCard'
import { Section } from './Section'
import { stageLabel, type Stage, type Workspace } from '../lib/projectHome'

const stateWord: Record<Stage['state'], () => I18nString> = { live: m.project_now__live, building: m.project_now__getting_ready, off: m.project_now__not_online }

export function NeedsALook({ stages, onLook }: { stages: Stage[]; onLook: () => void }) {
  if (!stages.length) return null
  return (
    <RowStack>
      {stages.map((s) => (
        <RowCard
          key={s.id}
          flag
          tile={<CircleAlert className="size-5 text-warning-foreground" strokeWidth={2.5} />}
          title={m.project_now__need_look({ count: s.issues.length, stage: stageLabel(s, true) })}
          caption={m.project_now__state_checked({ state: stateWord[s.state](), checked: s.checked })}
          below={
            <ul className="flex flex-col gap-1.5 ps-14.5">
              {s.issues.map((i) => (
                <li key={i.id} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                  <i className="mt-2 size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  {asI18n(i.text)}
                </li>
              ))}
            </ul>
          }
        >
          <Button variant="bordered" size="page" type="button" onClick={onLook}>
            {m.project_now__see_whats_wrong()}
          </Button>
        </RowCard>
      ))}
    </RowStack>
  )
}

export function WhatIsOnline({ stages, calm, online }: { stages: Stage[]; calm: Stage[]; online: boolean }) {
  if (!stages.length)
    return (
      <Section title={m.project_now__what_is_online()}>
        <EmptyState layout="row" icon={Globe} title={m.project_now__nothing_online()} text={m.project_now__nothing_online_text()} />
      </Section>
    )
  if (!calm.length) return null
  const names = calm.map((s, i) => stageLabel(s, i > 0))
  const all = calm.every((s) => s.state === 'live')
  return (
    <Section title={m.project_now__what_is_online()}>
      <RowCard
        on
        tile={<Check className="size-5" strokeWidth={2.5} />}
        title={!online ? m.project_now__last_online() : all ? (calm.length === stages.length ? m.project_now__all_well() : m.project_now__else_well()) : m.project_now__rest_quiet()}
        caption={m.project_now__checked({ count: names.length, names: names.join(' and '), checked: calm[0].checked })}
        below={
          <div className="flex flex-wrap gap-2 ps-14.5">
            {calm.map((s) => (
              <Badge key={s.id} variant={s.state === 'live' ? 'pillOk' : s.state === 'building' ? 'pillInfo' : 'pillMute'}>
                {m.project_now__stage_state({ stage: stageLabel(s), state: stateWord[s.state]().toLowerCase() })}
              </Badge>
            ))}
          </div>
        }
      />
    </Section>
  )
}

const initials = (who: string) => who.split(' ').map((w) => w[0]).slice(0, 2).join('')

export function WorkingNow({ workspaces }: { workspaces: Workspace[] }) {
  if (!workspaces.length) return null
  return (
    <Section title={m.project_now__working_now()}>
      {workspaces.length ? (
        <RowStack>
          {workspaces.map((w) => {
            const initialsText = initials(w.who)
            const initialsOf = asI18n(initialsText)
            return (
            <RowCard
              key={w.id}
              bare
              tile={<span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-[14px] font-bold text-accent-foreground" aria-hidden="true">{w.mine ? m.project_now__you() : initialsOf}</span>}
              title={w.mine ? m.project_now__you() : w.who}
              caption={
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  {w.where === 'cloud' ? <Cloud className="size-3.5" /> : <Laptop className="size-3.5" />}
                  {w.where === 'cloud' ? m.project_now__in_cloud() : m.project_now__on_computer()}
                  {w.change ? <>{sep(' · ')}{asI18n(w.change)}</> : null}
                </span>
              }
              note={w.when}
            >
              <Badge variant={w.state === 'working' ? 'pillInfo' : 'pillMute'}>{w.state === 'working' ? m.project_now__pikku_working() : w.state === 'idle' ? m.project_now__resting() : m.project_now__asleep()}</Badge>
            </RowCard>
            )
          })}
        </RowStack>
      ) : (
        <p className="text-[16px] text-ink-2">{m.project_now__nobody()}</p>
      )}
    </Section>
  )
}
