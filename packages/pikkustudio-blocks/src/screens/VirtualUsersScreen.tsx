import { m } from '@/i18n/messages'
import { asI18n, sep, type I18nString } from '@pikku/react'
import { useContext, useState } from 'react'
import { Button } from '../ui/button'
import { EmptyState } from '../blocks/EmptyState'
import { Bot } from 'lucide-react'
import { ErrorState } from '../blocks/ErrorState'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { NextCard } from '../blocks/NextCard'
import { PageHead } from '../blocks/PageHead'
import { Section } from '../blocks/Section'
import { Page } from '../blocks/Page'
import { VirtualUserDrawer } from '../blocks/VirtualUserDrawer'
import { ShellCtx } from '../lib/shell'
import { useProjectAction } from '../lib/projectRpc'
import { useProjectKey, useProjectName } from '../lib/project'
import { kindOf, ago, problemsOf, reached, useVirtualUsers, type VirtualUser } from '../lib/virtualUsers'

const hues = ['petrol', 'teal', 'sea'] as const

const lastLine = (u: VirtualUser): I18nString => {
  if (u.visiting) return m.virtual_users_screen__on_visit_now()
  const v = u.visits[0]
  if (!v) return m.virtual_users_screen__not_visited()
  const n = problemsOf(v).length
  const did = v.status === 'failed' ? m.virtual_user_drawer__stopped_early() : v.intents.length ? m.virtual_user_drawer__goals_reached({ reached: reached(v), total: v.intents.length }) : m.virtual_user_drawer__looked_around()
  const problems = n === 0 ? m.virtual_user_drawer__summary_no_problems() : m.virtual_user_drawer__summary_problems({ n })
  return m.virtual_users_screen__last_line({ did, problems, when: ago(v.createdAt) })
}

export function VirtualUsersScreen() {
  const { say } = useContext(ShellCtx)
  const key = useProjectKey()
  const app = useProjectName()
  const { users, meta, runs, ready } = useVirtualUsers(key)
  const [drawer, setDrawer] = useState<{ id: string; tab: 'visits' | 'about' | 'own' } | null>(null)
  const send = useProjectAction<{ persona: string }>(key, 'console:startVirtualUserRun', ['console:getVirtualUserRuns'])
  const sending = send.isPending ? (send.variables?.persona ?? '') : ''
  const found = users.filter((u) => u.visits[0] && problemsOf(u.visits[0]).length > 0)
  const first = found[0] ?? users.find((u) => u.visits.length === 0 && !u.visiting) ?? users[0]
  const open = users.find((u) => u.id === drawer?.id)
  const problems = found.reduce((n, u) => n + problemsOf(u.visits[0]).length, 0)

  return (
    <div className="@container/vu">
    <Page gap="snug">
      <PageHead crumb={app} title={m.virtual_users_screen__title()} text={m.virtual_users_screen__text()} size="lead" />

      <QueryState query={meta} skeleton={<CardsSkeleton count={3} />} empty={() => (users.length === 0 ? (
        <EmptyState icon={Bot} title={m.virtual_users_screen__empty_title()} text={m.virtual_users_screen__empty_text()}>
          <Button variant="default" size="page" onClick={() => say(m.virtual_users_screen__say_describe())}>
            {m.virtual_users_screen__ask_add_some()}
          </Button>
        </EmptyState>
      ) : null)}>
        {() => (
          <>
            <NextCard
              label={m.virtual_users_screen__next_step()}
              hue="petrol"
              page="virtual-users"
              title={
                found.length > 0
                  ? found.length === 1
                    ? m.virtual_users_screen__found_by_name({ problems, name: found[0].name })
                    : m.virtual_users_screen__found_by_many({ problems, count: found.length })
                  : users.some((u) => u.visits.length > 0)
                    ? m.virtual_users_screen__found_none()
                    : m.virtual_users_screen__send({ name: first.name })
              }
              why={found.length > 0 ? m.virtual_users_screen__why_found({ name: found[0].name }) : m.virtual_users_screen__why_clean()}
            >
              <div className="flex flex-wrap gap-3">
                {found.length > 0 ? (
                  <Button variant="hero" size="page" onClick={() => setDrawer({ id: found[0].id, tab: 'visits' })}>
                    {m.virtual_users_screen__read_found({ name: found[0].name })}
                  </Button>
                ) : (
                  <Button variant="hero" size="page" disabled={!ready || first.visiting || sending === first.id} onClick={() => send.mutate({ persona: first.id })}>
                    {m.virtual_users_screen__send_first({ name: first.name })}
                  </Button>
                )}
              </div>
            </NextCard>

            {!ready || (send.isError && /runVirtualUser/.test(String((send.error as Error)?.message))) ? (
              <section role="alert" className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card p-7">
                <b className="font-heading text-[22px]">{m.virtual_users_screen__off_title({ app })}</b>
                <p className="max-w-ch56 text-[16px] text-ink-2">{m.virtual_users_screen__off_text({ app })}</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default" size="page" onClick={() => { send.reset(); say(m.virtual_users_screen__say_turn_on({ app })) }}>
                    {m.virtual_users_screen__ask_turn_on()}
                  </Button>
                  <Button variant="bordered" size="page" onClick={() => send.reset()}>
                    {m.shell_layout__not_now()}
                  </Button>
                </div>
              </section>
            ) : send.isError ? (<ErrorState error={send.error} what={m.virtual_users_screen__sending_a_virtual_user_on()} onRetry={() => send.reset()} />) : null}
            {runs.isError ? <ErrorState error={runs.error} what={m.virtual_users_screen__reading_past_visits()} onRetry={() => runs.refetch()} retrying={runs.isFetching} /> : null}

            <Section title={m.virtual_users_screen__who_can_visit()} sub={m.virtual_users_screen__each_one_pretends_to_be()}>
              <div className="grid grid-cols-1 gap-4 @min-[820px]/vu:grid-cols-3">
                {users.map((u, i) => {
                  const [kind, kindText] = kindOf(u.disposition)
                  const initial = u.name.charAt(0)
                  return (
                    <article key={u.id} data-hue={hues[i % hues.length]} className="flex flex-col gap-4 rounded-next bg-hero p-6 text-hero-ink">
                      <div className="flex items-center gap-3">
                        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white font-heading text-[28px] font-bold text-hero-btn-ink" aria-hidden="true">
                          {asI18n(initial)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-heading text-[24px] leading-[1.15] font-bold tracking-[-0.015em]">{u.name}</h3>
                          <small className="text-[14px] text-hero-ink-2">{u.job ? <>{u.job}{sep(' · ')}</> : null}{kind}</small>
                        </div>
                      </div>
                      <p className="rounded-[20px] rounded-ss-md bg-white px-4 py-3 text-[16px] leading-[1.4] text-hero-btn-ink">{u.description ?? kindText}</p>
                      <small className="mt-auto text-[14px] text-hero-ink-2" role={u.visiting ? 'status' : undefined}>
                        {lastLine(u)}
                        {u.schedule?.enabled ? <>{sep(' · ')}{m.virtual_users_screen__visits_on_own()}</> : null}
                      </small>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="hero" size="compact" disabled={!ready || u.visiting || sending === u.id} onClick={() => send.mutate({ persona: u.id })}>
                          {u.visiting ? m.virtual_users_screen__visiting() : m.virtual_users_screen__send_on_visit()}
                        </Button>
                        <Button variant="heroGhost" size="compact" onClick={() => setDrawer({ id: u.id, tab: 'about' })}>
                          {m.virtual_users_screen__about()}
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </Section>
          </>
        )}
      </QueryState>

      {open && drawer && <VirtualUserDrawer key={`${open.id}-${drawer.tab}`} u={open} projectKey={key} start={drawer.tab} onClose={() => setDrawer(null)} />}
    </Page>
    </div>
  )
}
