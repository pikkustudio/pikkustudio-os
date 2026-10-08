import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Link } from '../blocks/Link'
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
import { asI18n, asI18nStub } from '@pikku/react'


const sample = {
  app: asI18nStub('Sunrise Bakery Classes'),
}

export function RoutinesScreen() {
  const { say } = useContext(ShellCtx)
  const { data: routines = [] } = useRoutines(useProjectKey())
  const [off, setOff] = useState<Record<string, boolean>>({})
  const wrong = routines.filter((r) => !off[r.id] && r.history[0] && !r.history[0].ok)
  const lead = wrong[0]

  return (
    <Page gap="snug">
      <PageHead crumb={sample.app} title={m.routines_screen__title()} text={m.routines_screen__text()} size="lead" />

      <NextCard
        label={m.routines_screen__title()}
        hue="petrol"
        art={<Art />}
        title={lead ? (m.routines_screen__wrong_count({ count: wrong.length })) : m.routines_screen__n_well({ count: routines.filter((r) => !off[r.id]).length })}
        why={lead ? m.routines_screen__why_stopped({ name: lead.name, step: lead.history[0].wrongAt ?? lead.history[0].note, when: lead.history[0].when }) : m.routines_screen__why_fine()}
      >
        <div className="flex flex-wrap gap-3">
          {lead ? (
            <Button variant="hero" size="page" asChild>
              <Link {...keep} to={'/routines/$id' as never} params={{ id: lead.id } as never}>
                {m.routines_screen__look_at_it()}
              </Link>
            </Button>
          ) : null}
          <Button variant="heroGhost" size="page" onClick={() => say(m.routines_screen__add_say())}>
            {m.assistants_screen__ask_new()}
          </Button>
        </div>
      </NextCard>

      <Section title={m.routines_screen__your_routines()} sub={m.routines_screen__your_routines_sub()}>
        <RowStack>
          {routines.map((r) => {
            const last = r.history[0]
            return (
              <RowCard key={r.id} flag={!off[r.id] && !!last && !last.ok} on={!off[r.id]} tile={<Workflow className="size-5" />} title={asI18n(r.name)} caption={asI18n(r.what)} note={r.runs}>
                {!off[r.id] ? !last ? <Dot tone="quiet">{m.routines_screen__not_run()}</Dot> : <Dot tone={last.ok ? 'ok' : 'bad'}>{last.ok ? m.routines_screen__ran_fine({ when: last.when }) : m.routines_screen__went_wrong({ when: last.when })}</Dot> : <Dot tone="quiet">{m.routines_screen__switched_off()}</Dot>}
                <Switch checked={!off[r.id]} onCheckedChange={(v) => setOff((o) => ({ ...o, [r.id]: !v }))} aria-label={m.routines_screen__is_on({ name: r.name })} />
                <Button variant="bordered" size="compact" asChild>
                  <Link {...keep} to={'/routines/$id' as never} params={{ id: r.id } as never}>
                    {m.project_actions__open()}
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
