import { ArrowRight, Cloud, Eye, Laptop } from 'lucide-react'
import { Button } from '../ui/button'
import { RowCard, RowStack } from './RowCard'
import { Section } from './Section'
import type { Plan, ProjectHome, Way } from '../lib/projectHome'

type Words = { title: string; why: string; cost?: string; action: string; off?: string }

function wordsFor(way: Way, p: ProjectHome, plan: Plan): Words {
  if (way === 'local') {
    return plan.mineLocal
      ? { title: 'Your copy on this computer', why: `Paused, as you left it ${plan.mineLocal.when}. It works without the internet.`, action: 'Carry on here' }
      : { title: 'Work on your computer', why: 'Everything runs on this machine, so it keeps working without the internet and your files stay with you.', cost: 'The first time, the project is copied over. That takes a few minutes.', action: 'Work on my computer', off: 'Needs the internet the first time.' }
  }
  if (way === 'cloud') {
    if (plan.mineCloud) return { title: 'Your cloud workspace', why: plan.mineCloud.state === 'asleep' ? 'Asleep, and ready to wake in about half a minute.' : 'Awake, and your team can see it.', action: plan.mineCloud.state === 'asleep' ? 'Wake it up' : 'Carry on there', off: 'Needs the internet.' }
    if (plan.theirCloud) return { title: `Join ${plan.theirCloud.who.split(' ')[0]} in the cloud`, why: 'Same workspace, nothing to set up. You will see what they see as it happens.', action: 'Join them', off: 'Needs the internet.' }
    return { title: 'Work in the cloud', why: 'Nothing to set up. It wakes when you open it and sleeps when you stop, and your team can see it and join in.', cost: 'Needs the internet.', action: 'Work in the cloud', off: 'Needs the internet.' }
  }
  return { title: 'Just take a look', why: 'See what is online and how it is doing, without opening anything to work on. Looking cannot break anything.', action: 'Take a look' }
}

const icons: Record<Way, typeof Laptop> = { local: Laptop, cloud: Cloud, look: Eye }

export function ProjectWays({ plan, home, onAct }: { plan: Plan; home: ProjectHome; onAct: (way: Way) => void }) {
  if (!plan.others.length) return null
  return (
    <Section title="Or work another way">
      <RowStack>
        {plan.others.map((way) => {
          const w = wordsFor(way, home, plan)
          const Icon = icons[way]
          const off = !home.online && (way === 'cloud' || (way === 'local' && !plan.mineLocal))
          return (
            <RowCard key={way} tile={<Icon className="size-5" />} title={w.title} caption={w.why} note={off ? w.off : w.cost}>
              <Button variant="bordered" size="page" type="button" disabled={off} onClick={() => onAct(way)}>
                {w.action}
                <ArrowRight className="size-4.5" />
              </Button>
            </RowCard>
          )
        })}
      </RowStack>
    </Section>
  )
}
