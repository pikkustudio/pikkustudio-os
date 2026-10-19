import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Link } from '../blocks/Link'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { NextCard } from '../blocks/NextCard'
import { PageHead } from '../blocks/PageHead'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { Workflow as WorkflowIcon } from 'lucide-react'
import { useWorkflows } from '../lib/workflows'
import { Section } from '../blocks/Section'
import { Page } from '../blocks/Page'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'
import { asI18n } from '@pikku/react'
import { EmptyState } from '../blocks/EmptyState'
import { useProjectKey, useProjectName } from '../lib/project'


export function WorkflowsScreen() {
  const { say } = useContext(ShellCtx)
  const projectName = useProjectName()
  const { data: workflows = [], isPending } = useWorkflows(useProjectKey())
  const [off, setOff] = useState<Record<string, boolean>>({})
  const wrong = workflows.filter((r) => !off[r.id] && r.history[0] && !r.history[0].ok)
  const lead = wrong[0]

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.workflows_screen__title()} text={m.workflows_screen__text()} size="lead" />

      {workflows.length > 0 ? (
      <NextCard
        label={m.workflows_screen__title()}
        hue="petrol"
        page="workflows"
        title={lead ? (m.workflows_screen__wrong_count({ count: wrong.length })) : m.workflows_screen__n_well({ count: workflows.filter((r) => !off[r.id]).length })}
        why={lead ? m.workflows_screen__why_stopped({ name: lead.name, step: lead.history[0].wrongAt ?? lead.history[0].note, when: lead.history[0].when }) : m.workflows_screen__why_fine()}
      >
        <div className="flex flex-wrap gap-3">
          {lead ? (
            <Button variant="hero" size="page" asChild>
              <Link {...keep} to={'/workflows/$id' as never} params={{ id: lead.id } as never}>
                {m.workflows_screen__look_at_it()}
              </Link>
            </Button>
          ) : null}
          <Button variant="heroGhost" size="page" onClick={() => say(m.workflows_screen__add_say())}>
            {m.assistants_screen__ask_new()}
          </Button>
        </div>
      </NextCard>
      ) : null}

      {!isPending && workflows.length === 0 ? (
        <EmptyState layout="row" icon={WorkflowIcon} title={m.workflows_screen__empty()} text={m.workflows_screen__empty_text()}>
          <Button type="button" size="page" onClick={() => say(m.workflows_screen__add_say())}>
            {m.assistants_screen__ask_new()}
          </Button>
        </EmptyState>
      ) : (
      <Section title={m.workflows_screen__your_workflows()} sub={m.workflows_screen__your_workflows_sub()}>
        <RowStack>
          {workflows.map((r) => {
            const last = r.history[0]
            return (
              <RowCard key={r.id} flag={!off[r.id] && !!last && !last.ok} on={!off[r.id]} tile={<WorkflowIcon className="size-5" />} title={asI18n(r.name)} caption={asI18n(r.what)} note={r.runs}>
                {!off[r.id] ? !last ? <Dot tone="quiet">{m.workflows_screen__not_run()}</Dot> : <Dot tone={last.ok ? 'ok' : 'bad'}>{last.ok ? m.workflows_screen__ran_fine({ when: last.when }) : m.workflows_screen__went_wrong({ when: last.when })}</Dot> : <Dot tone="quiet">{m.workflows_screen__switched_off()}</Dot>}
                <Switch checked={!off[r.id]} onCheckedChange={(v) => setOff((o) => ({ ...o, [r.id]: !v }))} aria-label={m.workflows_screen__is_on({ name: r.name })} />
                <Button variant="bordered" size="compact" asChild>
                  <Link {...keep} to={'/workflows/$id' as never} params={{ id: r.id } as never}>
                    {m.project_actions__open()}
                  </Link>
                </Button>
              </RowCard>
            )
          })}
        </RowStack>
      </Section>
      )}
    </Page>
  )
}
