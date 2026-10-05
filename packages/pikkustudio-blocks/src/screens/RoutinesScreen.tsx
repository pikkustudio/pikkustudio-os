import { useContext, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { PageHead } from '../blocks/PageHead'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { Workflow } from 'lucide-react'
import { useRoutines } from '../lib/routines'
import { useProjectKey } from '../lib/project'
import { Section } from '../blocks/Section'
import { Page } from '../blocks/Page'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'


const sample = {
  app: 'Sunrise Bakery Classes',
}

export function RoutinesScreen() {
  const { say } = useContext(ShellCtx)
  const { data: routines = [] } = useRoutines(useProjectKey())
  const [off, setOff] = useState<Record<string, boolean>>({})
  const wrong = routines.filter((r) => !off[r.id] && r.history[0] && !r.history[0].ok)
  const lead = wrong[0]

  return (
    <Page gap="snug">
      <PageHead crumb={sample.app} title="Routines" text="Jobs your app does on its own, on a timer or when something happens. Open one to see every step, and every time it ran." size="lead" />

      <NextCard
        label="Routines"
        hue="petrol"
        art={<Art />}
        title={lead ? `${wrong.length === 1 ? 'A routine' : `${wrong.length} routines`} went wrong today` : `${routines.filter((r) => !off[r.id]).length} routines are running well`}
        why={lead ? `"${lead.name}" ${lead.history[0].note.replace('Went wrong at ', 'stopped at the step ')} (${lead.history[0].when.replace('Today, ', '')}). Pikku already has an idea why.` : 'Everything ran as it should the last time. Pikku tells you if that changes.'}
      >
        <div className="flex flex-wrap gap-3">
          {lead ? (
            <Button variant="hero" size="page" asChild>
              <Link {...keep} to={'/routines/$id' as never} params={{ id: lead.id } as never}>
                Look at it
              </Link>
            </Button>
          ) : null}
          <Button variant="heroGhost" size="page" onClick={() => say('Add a new routine to my app')}>
            Ask Pikku for a new one
          </Button>
        </div>
      </NextCard>

      <Section title="Your routines" sub="Each one starts the same way every time. Switch one off and it simply waits.">
        <RowStack>
          {routines.map((r) => {
            const last = r.history[0]
            return (
              <RowCard key={r.id} flag={!off[r.id] && !!last && !last.ok} on={!off[r.id]} tile={<Workflow className="size-5" />} title={r.name} caption={r.what} note={r.runs}>
                {!off[r.id] ? !last ? <Dot tone="quiet">Has not run yet</Dot> : <Dot tone={last.ok ? 'ok' : 'bad'}>{last.ok ? `Ran fine · ${last.when}` : `Went wrong · ${last.when}`}</Dot> : <Dot tone="quiet">Switched off</Dot>}
                <Switch checked={!off[r.id]} onCheckedChange={(v) => setOff((o) => ({ ...o, [r.id]: !v }))} aria-label={`${r.name} is on`} />
                <Button variant="bordered" size="compact" asChild>
                  <Link {...keep} to={'/routines/$id' as never} params={{ id: r.id } as never}>
                    Open
                  </Link>
                </Button>
              </RowCard>
            )
          })}
        </RowStack>
      </Section>
    </Page>
  )
}
