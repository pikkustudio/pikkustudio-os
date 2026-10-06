import { useContext, useState } from 'react'
import { Button } from '../ui/button'
import { Art } from '../blocks/ExploreHub'
import { EmptyState } from '../blocks/EmptyState'
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
import { KIND, ago, problemsOf, reached, useVirtualUsers, type VirtualUser } from '../lib/virtualUsers'

const hues = ['petrol', 'teal', 'sea'] as const

const lastLine = (u: VirtualUser) => {
  if (u.visiting) return 'On a visit now…'
  const v = u.visits[0]
  if (!v) return 'Has not visited yet'
  const n = problemsOf(v).length
  const did = v.status === 'failed' ? 'Stopped early' : v.intents.length ? `${reached(v)} of ${v.intents.length} goals reached` : 'Looked around'
  return `${did} · ${n === 0 ? 'no problems' : n === 1 ? '1 problem' : `${n} problems`} · ${ago(v.createdAt)}`
}

export function VirtualUsersScreen() {
  const { say } = useContext(ShellCtx)
  const key = useProjectKey()
  const app = useProjectName()
  const { users, meta, runs } = useVirtualUsers(key)
  const [drawer, setDrawer] = useState<{ id: string; tab: 'visits' | 'about' | 'own' } | null>(null)
  const send = useProjectAction<{ persona: string }>(key, 'console:startVirtualUserRun', ['console:getVirtualUserRuns'])
  const sending = send.isPending ? (send.variables?.persona ?? '') : ''
  const found = users.filter((u) => u.visits[0] && problemsOf(u.visits[0]).length > 0)
  const first = found[0] ?? users.find((u) => u.visits.length === 0 && !u.visiting) ?? users[0]
  const open = users.find((u) => u.id === drawer?.id)
  const problems = found.reduce((n, u) => n + problemsOf(u.visits[0]).length, 0)

  return (
    <div className={`@container/vu transition-[padding] duration-200 ${drawer ? 'pr-[24rem] @min-[1700px]/app:pr-110' : ''}`}>
    <Page gap="snug">
      <PageHead crumb={app} title="Virtual users" text="AI stand-ins for the people who use your app. Send one on a visit and they tell you where they got stuck." size="lead" />

      <QueryState query={meta} skeleton={<CardsSkeleton count={3} />} empty={() => (users.length === 0 ? (
        <EmptyState title="Let AI stand-ins try your app before your users do" text="A virtual user pretends to be one kind of person who uses your app: a busy admin, a first-timer, a customer in a hurry. They try to get something done on your preview site and tell you in plain words where they got stuck. They cannot break anything real.">
          <Button variant="default" size="page" onClick={() => say('Describe the kinds of people who use my app, so they can visit it as virtual users')}>
            Ask Pikku to add some
          </Button>
        </EmptyState>
      ) : null)}>
        {() => (
          <>
            <NextCard
              label="Next step"
              hue="petrol"
              art={<Art />}
              title={found.length > 0 ? `${problems} ${problems === 1 ? 'problem' : 'problems'} found by ${found.length === 1 ? found[0].name : `${found.length} virtual users`}` : users.some((u) => u.visits.length > 0) ? 'Their last visits found no problems' : `Send ${first.name} to try your app`}
              why={found.length > 0 ? `Open ${found[0].name}'s visit to read what went wrong, then ask Pikku to fix it.` : 'A clean visit is good news for today, not a guarantee. Each visit goes a little differently, so send them again after you change something.'}
            >
              <div className="flex flex-wrap gap-3">
                {found.length > 0 ? (
                  <Button variant="hero" size="page" onClick={() => setDrawer({ id: found[0].id, tab: 'visits' })}>
                    Read what {found[0].name} found
                  </Button>
                ) : (
                  <Button variant="hero" size="page" disabled={first.visiting || sending === first.id} onClick={() => send.mutate({ persona: first.id })}>
                    Send {first.name} on a visit
                  </Button>
                )}
              </div>
            </NextCard>

            {send.isError ? <ErrorState error={send.error} what="Sending a virtual user on a visit" onRetry={() => send.reset()} /> : null}
            {runs.isError ? <ErrorState error={runs.error} what="Reading past visits" onRetry={() => runs.refetch()} retrying={runs.isFetching} /> : null}

            <Section title="Who can visit" sub="Each one pretends to be a different kind of person. Visits go to your preview site only.">
              <div className="grid grid-cols-1 gap-4 @min-[820px]/vu:grid-cols-3">
                {users.map((u, i) => {
                  const [kind, kindText] = KIND[u.disposition]
                  return (
                    <article key={u.id} data-hue={hues[i % hues.length]} className="flex flex-col gap-4 rounded-next bg-hero p-6 text-hero-ink">
                      <div className="flex items-center gap-3">
                        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white font-heading text-[28px] font-bold text-hero-btn-ink" aria-hidden="true">
                          {u.name.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-heading text-[24px] leading-[1.15] font-bold tracking-[-0.015em]">{u.name}</h3>
                          <small className="text-[14px] text-hero-ink-2">{[u.job, kind].filter(Boolean).join(' · ')}</small>
                        </div>
                      </div>
                      <p className="rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-[16px] leading-[1.4] text-hero-btn-ink">{u.description ?? kindText}</p>
                      <small className="mt-auto text-[14px] text-hero-ink-2" role={u.visiting ? 'status' : undefined}>
                        {lastLine(u)}
                        {u.schedule?.enabled ? ' · visits on their own' : ''}
                      </small>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="hero" size="compact" disabled={u.visiting || sending === u.id} onClick={() => send.mutate({ persona: u.id })}>
                          {u.visiting ? 'Visiting…' : 'Send on a visit'}
                        </Button>
                        <Button variant="heroGhost" size="compact" onClick={() => setDrawer({ id: u.id, tab: 'about' })}>
                          About
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
