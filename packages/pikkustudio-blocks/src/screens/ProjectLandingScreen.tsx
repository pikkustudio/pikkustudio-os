import { ArrowRight, Check, CircleAlert } from 'lucide-react'
import { Button } from '../ui/button'
import { Hero } from '../blocks/Hero'
import { Page } from '../blocks/Page'
import { ProjectThumbShapes } from '../blocks/ProjectThumb'
import { NeedsALook, WhatIsOnline, WorkingNow } from '../blocks/ProjectNow'
import { ProjectWays } from '../blocks/ProjectWays'
import { planFor, type ProjectHome, type Way } from '../lib/projectHome'

const Dot = ({ tone }: { tone: 'ok' | 'warn' | 'quiet' }) =>
  tone === 'ok' ? <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" /> : tone === 'warn' ? <CircleAlert className="size-5 shrink-0" strokeWidth={2.5} aria-hidden="true" /> : <span className="mx-1 size-3 shrink-0 rounded-full bg-hero-ink-2 ring-4 ring-hero-ink/20" aria-hidden="true" />

export function ProjectLandingScreen({ home, onAct }: { home: ProjectHome; onAct: (way: Way) => void }) {
  const plan = planFor(home)
  const others = home.workspaces.filter((w) => !w.mine)
  const liveSite = home.stages.find((s) => s.kind === 'live')
  const people = others.length && !plan.theirCloud ? `${others[0].who.split(' ')[0]}${others.length > 1 ? ` and ${others.length - 1} more are` : ' is'} in the ${others[0].where === 'cloud' ? 'cloud' : 'project'} too` : null

  return (
    <Page>
      <div>
        <div className="mb-1 text-[14px] font-semibold text-muted-foreground">{home.name}</div>
      </div>
      <Hero
        hue={plan.hue}
        art={plan.art}
        thumb={<ProjectThumbShapes look={home.look} />}
        title={plan.title}
        why={plan.why}
        hint={plan.hint}
        actions={
          <Button variant="hero" size="pageLg" type="button" disabled={plan.disabled} onClick={() => onAct(plan.way)}>
            {plan.action}
            <ArrowRight className="size-5.5" />
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-px16 font-bold">
          {!home.online ? (
            <span className="inline-flex items-center gap-2.5"><Dot tone="quiet" />Not connected to the internet</span>
          ) : liveSite ? (
            <span className="inline-flex items-center gap-2.5"><Dot tone={liveSite.issues.length ? 'warn' : 'ok'} />{liveSite.issues.length ? 'The live site needs a look' : liveSite.state === 'live' ? 'The live site is running well' : 'The live site is getting ready'}</span>
          ) : (
            <span className="inline-flex items-center gap-2.5"><Dot tone="quiet" />Nothing is online yet</span>
          )}
          {plan.problems.some((s) => s.kind !== 'live') ? <span className="inline-flex items-center gap-2.5"><Dot tone="warn" />{plan.problems.reduce((n, s) => n + s.issues.length, 0)} things need a look</span> : null}
          {people ? <span className="inline-flex items-center gap-2.5"><Dot tone="quiet" />{people}</span> : null}
        </div>
      </Hero>
      <NeedsALook stages={plan.problems} onLook={() => onAct('look')} />
      <ProjectWays plan={plan} home={home} onAct={onAct} />
      <WorkingNow workspaces={home.workspaces} />
      <WhatIsOnline stages={home.stages} calm={plan.calm} online={home.online} />
    </Page>
  )
}
