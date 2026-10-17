import type { I18nNode, I18nString } from '@pikku/react'
import { useContext, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, Plug, ToggleRight } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { QueryState } from '../blocks/QueryState'
import { RowStack } from '../blocks/RowCard'
import { PikkuDot } from '../blocks/PikkuDot'
import { StatusLine } from '../blocks/StatusLine'
import { SwitchesHero } from '../blocks/SwitchesHero'
import { SwitchRow } from '../blocks/SwitchRow'
import { SwitchPanel } from '../blocks/SwitchPanel'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'
import { useProjectKey, useProjectName } from '../lib/project'
import { useCanEdit } from '../lib/project-target'
import { ShellCtx } from '../lib/shell'
import { accountsProblem } from '../lib/accounts'
import { needsLook, SWITCH_RPCS, type SwitchList } from '../lib/switches'
import { useDeveloperDetails } from '../lib/developer-details'

const Group = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

export function SwitchesScreen() {
  const { say } = useContext(ShellCtx)
  const key = useProjectKey()
  const projectName = useProjectName()
  const canEdit = useCanEdit()
  const client = useQueryClient()
  const [open, setOpen] = useState<string | null>(null)
  const [technical] = useDeveloperDetails()
  const list = useProjectQuery<SwitchList>(key, 'admin:flagList', undefined, { handlesErrors: true })
  const refresh = () => {
    for (const n of SWITCH_RPCS) void client.invalidateQueries({ queryKey: ['project', key, n] })
  }
  const toggle = useProjectAction<{ name: string; enabled: boolean }>(key, 'admin:flagSetEnabled', ['admin:flagList'])
  const sync = useProjectAction<null, { synced: number }>(key, 'admin:flagSync', ['admin:flagList'])
  const prune = useProjectAction<null, { pruned: string[] }>(key, 'admin:flagPrune', SWITCH_RPCS)
  const problem = list.isError ? accountsProblem(list.error) : null
  const flags = list.data?.flags ?? []
  const canChange = canEdit && !!list.data?.writable
  const look = flags.filter(needsLook)
  const rest = flags.filter((f) => !needsLook(f))
  const selected = open ? flags.find((f) => f.name === open) : undefined

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.switches_screen__title()} text={m.switches_screen__text()} size="lead" developerDetails />
      <SwitchesHero
        total={list.data ? flags.length : undefined}
        on={flags.filter((f) => f.enabled).length}
        attention={look.length}
        writable={canChange}
        onLook={() => look[0] && setOpen(look[0].name)}
        onAsk={() => say(m.switches_screen__add_say())}
      />

      {problem === 'not-running' ? (
        <EmptyState icon={Plug} title={m.switches_screen__not_running_title()} text={m.switches_screen__not_running_text()} />
      ) : problem === 'no-addon' ? (
        <EmptyState icon={ToggleRight} title={m.switches_screen__no_addon_title()} text={m.switches_screen__no_addon_text()}>
          <Button type="button" size="page" onClick={() => say(m.switches_screen__add_it_say())}>
            <PikkuDot />
            {m.switches_screen__add_it()}
          </Button>
        </EmptyState>
      ) : problem === 'forbidden' ? (
        <EmptyState icon={LockKeyhole} title={m.switches_screen__cannot_see()} text={m.switches_screen__cannot_see_text()} />
      ) : (
        <QueryState
          query={list}
          skeleton={<div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />}
          empty={(d) => (d.flags.length ? null : <EmptyState layout="row" icon={ToggleRight} title={m.switches_screen__none_title()} text={m.switches_screen__none_text()} />)}
        >
          {() => (
            <div className="flex min-w-0 flex-col gap-6.5">
              {look.length ? (
                <Group title={m.switches_screen__needs_look()}>
                  <RowStack>
                    {look.map((f) => (
                      <SwitchRow key={f.name} item={f} canChange={canChange} busy={toggle.isPending && toggle.variables?.name === f.name} onToggle={(enabled) => toggle.mutate({ name: f.name, enabled })} onOpen={() => setOpen(f.name)} />
                    ))}
                  </RowStack>
                </Group>
              ) : null}
              {rest.length ? (
                <Group title={m.switches_screen__all()}>
                  <RowStack>
                    {rest.map((f) => (
                      <SwitchRow key={f.name} item={f} canChange={canChange} busy={toggle.isPending && toggle.variables?.name === f.name} onToggle={(enabled) => toggle.mutate({ name: f.name, enabled })} onOpen={() => setOpen(f.name)} />
                    ))}
                  </RowStack>
                </Group>
              ) : null}
              {toggle.isError ? (
                <p role="alert" className="text-px15 text-destructive-foreground">
                  {m.switches_screen__toggle_failed()}
                </p>
              ) : null}
            </div>
          )}
        </QueryState>
      )}

      {list.data && technical ? (
        <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4">
          {!list.data.writable ? <p className="text-px14 text-ink-2">{m.switches_screen__read_only_tech()}</p> : null}
          <div className="flex flex-col items-start gap-2">
            <p className="text-px14 text-ink-2">{m.switches_screen__sync_explain()}</p>
            <Button type="button" variant="bordered" size="compact" disabled={!canChange || sync.isPending} aria-busy={sync.isPending} onClick={() => sync.mutate(null)}>
              {m.switches_screen__sync()}
            </Button>
            {sync.isError ? <StatusLine tone="bad" text={m.switches_screen__sync_failed()} /> : sync.data ? <StatusLine tone="ok" text={m.switches_screen__synced({ count: sync.data.synced })} /> : null}
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-px14 text-ink-2">{m.switches_screen__prune_explain()}</p>
            <Button type="button" variant="bordered" size="compact" disabled={!canChange || prune.isPending} aria-busy={prune.isPending} onClick={() => prune.mutate(null)}>
              {m.switches_screen__prune()}
            </Button>
            {prune.isError ? <StatusLine tone="bad" text={m.switches_screen__prune_failed()} /> : prune.data ? <StatusLine tone="ok" text={m.switches_screen__pruned({ count: prune.data.pruned.length })} /> : null}
          </div>
        </div>
      ) : null}

      {selected ? <SwitchPanel key={selected.name} projectKey={key} item={selected} canChange={canChange} onChanged={refresh} onClose={() => setOpen(null)} /> : null}
    </Page>
  )
}
