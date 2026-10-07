import { ArrowRight, Cloud, Eye, Laptop } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { RowCard, RowStack } from './RowCard'
import { Section } from './Section'
import type { Plan, ProjectHome, Way } from '../lib/projectHome'

export type Words = { title: string; why: string; note?: string; action: string; off?: string }

export function wordsFor(way: 'local' | 'cloud', plan: Plan): Words {
  if (way === 'local') {
    return plan.mineLocal
      ? { title: m.project_ways__local_mine_title(), why: m.project_ways__local_mine_why({ when: plan.mineLocal.when }), action: m.project_ways__local_carry_on() }
      : { title: m.project_ways__local_title(), why: m.project_ways__local_why(), note: m.project_ways__local_note(), action: m.project_ways__local_action(), off: m.project_ways__local_offline() }
  }
  if (plan.mineCloud) {
    const asleep = plan.mineCloud.state === 'asleep'
    return { title: m.project_ways__cloud_mine_title(), why: asleep ? m.project_ways__cloud_asleep() : m.project_ways__cloud_awake(), action: asleep ? m.project_ways__cloud_wake() : m.project_ways__cloud_carry_on(), off: m.project_ways__cloud_note() }
  }
  if (plan.theirCloud) return { title: m.project_ways__cloud_join_title({ name: plan.theirCloud.who.split(' ')[0] }), why: m.project_ways__cloud_join_why(), action: m.project_ways__cloud_join(), off: m.project_ways__cloud_note() }
  return { title: m.project_ways__cloud_title(), why: m.project_ways__cloud_why(), note: m.project_ways__cloud_note(), action: m.project_ways__cloud_action(), off: m.project_ways__cloud_note() }
}

const icons = { local: Laptop, cloud: Cloud } as const

export function WayCards({ plan, home, onAct, ways }: { plan: Plan; home: ProjectHome; onAct: (way: Way) => void; ways?: ('local' | 'cloud')[] }) {
  const choices = ways ?? plan.others.filter((w): w is 'local' | 'cloud' => w !== 'look')
  if (!choices.length) return null
  return (
    <RowStack>
      {choices.map((way) => {
        const w = wordsFor(way, plan)
        const Icon = icons[way]
        const off = !home.online && (way === 'cloud' || (way === 'local' && !plan.mineLocal))
        return (
          <RowCard key={way} tile={<Icon className="size-5" />} title={w.title} caption={w.why} note={off ? w.off : w.note}>
            <Button variant="bordered" size="page" type="button" disabled={off} onClick={() => onAct(way)}>
              {w.action}
              <ArrowRight className="size-4.5" />
            </Button>
          </RowCard>
        )
      })}
    </RowStack>
  )
}

export function ProjectWays({ plan, home, onAct, ways, title, sub, look = true }: { plan: Plan; home: ProjectHome; onAct: (way: Way) => void; ways?: ('local' | 'cloud')[]; title?: string; sub?: string; look?: boolean }) {
  if (!plan.others.length && !ways) return null
  const canLook = look && plan.others.includes('look')
  return (
    <Section title={title ?? m.project_ways__title()} sub={sub ?? m.project_ways__sub()}>
      <WayCards plan={plan} home={home} onAct={onAct} ways={ways} />
      {canLook ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-px15 text-muted-foreground">{m.project_ways__look_why()}</p>
          <Button variant="ghost" size="page" type="button" onClick={() => onAct('look')}>
            <Eye className="size-4.5" />
            {m.project_ways__look_action()}
          </Button>
        </div>
      ) : null}
    </Section>
  )
}
