import { Check, Cloud, CircleAlert, Laptop } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'
import { RowCard, RowStack } from './RowCard'
import { Section } from './Section'
import { stageLabel, type Stage, type Workspace } from '../lib/projectHome'

const stateWord: Record<Stage['state'], string> = { live: 'Live', building: 'Getting ready', off: 'Not online' }

export function NeedsALook({ stages, onLook }: { stages: Stage[]; onLook: () => void }) {
  if (!stages.length) return null
  return (
    <RowStack>
      {stages.map((s) => (
        <RowCard
          key={s.id}
          flag
          tile={<CircleAlert className="size-5 text-warning-foreground" strokeWidth={2.5} />}
          title={`${s.issues.length === 1 ? 'One thing needs' : `${s.issues.length} things need`} a look in ${stageLabel(s).replace(/^The /, 'the ')}`}
          caption={`${stateWord[s.state]}, checked ${s.checked}.`}
          below={
            <ul className="flex flex-col gap-1.5 pl-14.5">
              {s.issues.map((i) => (
                <li key={i.id} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                  <i className="mt-2 size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  {i.text}
                </li>
              ))}
            </ul>
          }
        >
          <Button variant="bordered" size="page" type="button" onClick={onLook}>
            See what is wrong
          </Button>
        </RowCard>
      ))}
    </RowStack>
  )
}

export function WhatIsOnline({ stages, calm, online }: { stages: Stage[]; calm: Stage[]; online: boolean }) {
  if (!stages.length)
    return (
      <Section title="What is online">
        <EmptyState layout="row" title="Nothing is online yet." text="When you put this project on the internet, you will see how it is doing here." />
      </Section>
    )
  if (!calm.length) return null
  const names = calm.map((s, i) => (i === 0 ? stageLabel(s) : stageLabel(s).replace(/^The /, 'the ')))
  const all = calm.every((s) => s.state === 'live')
  return (
    <Section title="What is online">
      <RowCard
        on
        tile={<Check className="size-5" strokeWidth={2.5} />}
        title={!online ? 'This is what it looked like when you were last online.' : all ? (calm.length === stages.length ? 'Everything online is running well.' : 'Everything else is running well.') : 'The rest is quiet.'}
        caption={`${names.join(' and ')} ${names.length > 1 ? 'were' : 'was'} checked ${calm[0].checked}.`}
        below={
          <div className="flex flex-wrap gap-2 pl-14.5">
            {calm.map((s) => (
              <Badge key={s.id} variant={s.state === 'live' ? 'pillOk' : s.state === 'building' ? 'pillInfo' : 'pillMute'}>
                {stageLabel(s)}: {stateWord[s.state].toLowerCase()}
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
    <Section title="Working now">
      {workspaces.length ? (
        <RowStack>
          {workspaces.map((w) => (
            <RowCard
              key={w.id}
              bare
              tile={<span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-[14px] font-bold text-accent-foreground" aria-hidden="true">{w.mine ? 'You' : initials(w.who)}</span>}
              title={w.mine ? 'You' : w.who}
              caption={
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  {w.where === 'cloud' ? <Cloud className="size-3.5" /> : <Laptop className="size-3.5" />}
                  {w.where === 'cloud' ? 'In the cloud' : 'On this computer'}
                  {w.change ? ` · ${w.change}` : ''}
                </span>
              }
              note={w.when}
            >
              <Badge variant={w.state === 'working' ? 'pillInfo' : 'pillMute'}>{w.state === 'working' ? 'Pikku is working' : w.state === 'idle' ? 'Resting' : 'Asleep'}</Badge>
            </RowCard>
          ))}
        </RowStack>
      ) : (
        <p className="text-[16px] text-ink-2">Nobody is working on this right now.</p>
      )}
    </Section>
  )
}
