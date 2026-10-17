import { asI18n, sep, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { ChevronDown, CircleAlert, ListChecks, Route } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { RowCard, RowStack, Dot } from '../blocks/RowCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { StatusLine } from '../blocks/StatusLine'
import { PikkuDot } from '../blocks/PikkuDot'
import { CheckRunDrawer } from '../blocks/CheckRunDrawer'
import { useProjectKey, useProjectName } from '../lib/project'
import { useCanEdit } from '../lib/project-target'
import { ShellCtx } from '../lib/shell'
import { isLocalOnly } from '../lib/code'
import { ago } from '../lib/virtualUsers'
import { isProblem, titleOf, useChecks, type Coverage, type Finding, type RunSummary } from '../lib/checks'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <path d="M118 150c22-40 46-40 58-14s40 26 60-18" fill="none" className="stroke-w6" strokeWidth="8" strokeLinecap="round" strokeDasharray="2 16" />
      <circle cx="118" cy="150" r="11" className="fill-w6" />
      <circle cx="236" cy="118" r="11" className="fill-w6" />
    </>
  )
}

const Group = ({ title, sub, children }: { title: I18nString; sub?: I18nNode; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {sub ? <p className="px-1 text-px15 text-ink-2 text-pretty">{sub}</p> : null}
    {children}
  </section>
)

const Skeleton = () => (
  <div role="status" aria-busy="true" className="flex flex-col gap-2">
    {[0, 1].map((i) => (
      <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-secondary" />
    ))}
  </div>
)

const coverageLine = (c: Coverage | undefined): I18nString | undefined => {
  if (!c) return undefined
  const pages = c.routes.visited.length
  const { covered, required } = c.mutations
  if (required > 0 && pages > 0) return m.checks_screen__coverage_both({ covered, required, pages })
  if (required > 0) return m.checks_screen__coverage_changes({ covered, required })
  if (pages > 0) return m.checks_screen__coverage_pages({ pages })
  return undefined
}

const runLine = (r: RunSummary): I18nString => {
  if (r.status === 'running') return m.checks_screen__run_going({ done: r.passed + r.failed })
  const total = r.passed + r.failed
  return r.failed ? m.checks_screen__run_some_wrong({ failed: r.failed, total }) : m.checks_screen__run_all_fine({ total })
}

function FindingRow({ f, technical }: { f: Finding; technical: boolean }) {
  const { say } = useContext(ShellCtx)
  const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : ''
  return (
    <RowCard
      flag={f.severity === 'error'}
      tile={<CircleAlert className="size-5" />}
      title={asI18n(f.message)}
      caption={f.hint ? asI18n(f.hint) : f.severity === 'error' ? m.checks_screen__finding_error() : m.checks_screen__finding_warn()}
      note={technical && (where || f.code) ? <>{where ? asI18n(where) : null}{where && f.code ? sep(' · ') : null}{f.code ? asI18n(f.code) : null}</> : undefined}
    >
      <Button variant="ghost" size="compact" type="button" onClick={() => say(m.checks_screen__ask_finding({ message: asI18n(f.message), where: asI18n(where) }))}>
        <PikkuDot />
        {m.checks_screen__ask_fix()}
      </Button>
    </RowCard>
  )
}

export function ChecksScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const canEdit = useCanEdit()
  const { verify, runs, latest, coverage, runVerify } = useChecks(key)
  const [drawer, setDrawer] = useState<{ runId: string; focus?: string } | null>(null)
  const [showFine, setShowFine] = useState(false)
  const [technical, setTechnical] = useState(false)

  const verifyOff = verify.isError && isLocalOnly(verify.error)
  const checking = runVerify.isPending || !!verify.data?.running
  const findings = (verify.data?.result?.findings ?? []).filter(isProblem)
  const lastRun = latest.data
  const failing = lastRun?.results.filter((r) => r.status === 'failed') ?? []
  const fine = lastRun?.results.filter((r) => r.status === 'passed') ?? []
  const problems = findings.length + failing.length
  const nothingYet = !verify.data?.result && !(runs.data?.length ?? 0)
  const loading = (verify.isPending && !verifyOff) || runs.isPending

  const askAll = () => say(m.checks_screen__ask_all())
  const check = () => runVerify.mutate({})

  const title = checking
    ? m.checks_screen__hero_checking()
    : loading
      ? m.checks_screen__hero_loading()
      : nothingYet
        ? m.checks_screen__hero_none()
        : problems === 0
          ? m.checks_screen__hero_clean()
          : problems === 1
            ? m.checks_screen__hero_one()
            : m.checks_screen__hero_many({ count: problems })
  const why = checking
    ? m.checks_screen__why_checking()
    : nothingYet
      ? m.checks_screen__why_none()
      : problems === 0
        ? m.checks_screen__why_clean()
        : findings.length && failing.length
          ? m.checks_screen__why_both({ code: m.checks_screen__code_count({ n: findings.length }), walks: m.checks_screen__walk_count({ n: failing.length }) })
          : findings.length
            ? m.checks_screen__why_code({ code: m.checks_screen__code_count({ n: findings.length }) })
            : m.checks_screen__why_walks({ walks: m.checks_screen__walk_count({ n: failing.length }) })

  return (
    <div className={`@container/vu transition-[padding] duration-200 ${drawer ? 'pe-[24rem] @min-[1700px]/app:pe-110' : ''}`}>
      <Page gap="snug">
        <PageHead crumb={projectName} title={m.checks_screen__title()} text={m.checks_screen__text()} size="lead" />

        <NextCard label={m.checks_screen__title()} hue={problems > 0 ? 'teal' : 'sea'} art={<Art />} title={title} why={why}>
          <div className="flex flex-wrap gap-3">
            {problems > 0 && !checking ? (
              <Button variant="hero" size="pageLg" type="button" onClick={askAll}>
                <PikkuDot />
                {m.checks_screen__hero_fix()}
              </Button>
            ) : null}
            {!verifyOff && canEdit ? (
              <Button variant={problems > 0 && !checking ? 'heroGhost' : 'hero'} size={problems > 0 && !checking ? 'page' : 'pageLg'} type="button" disabled={checking} aria-busy={checking} onClick={check}>
                {checking ? m.checks_screen__checking() : nothingYet ? m.checks_screen__check() : m.checks_screen__check_again()}
              </Button>
            ) : null}
          </div>
        </NextCard>

        {runVerify.isError ? <ErrorState error={runVerify.error} what={m.checks_screen__checking_what()} onRetry={() => runVerify.reset()} /> : null}

        {!verifyOff ? (
          <Group title={m.checks_screen__code_group()}>
            {verify.isPending ? (
              <Skeleton />
            ) : verify.isError ? (
              <ErrorState error={verify.error} what={m.checks_screen__code_group()} onRetry={() => void verify.refetch()} retrying={verify.isFetching} />
            ) : checking ? (
              <StatusLine tone="wait" text={m.checks_screen__checking_line()} />
            ) : !verify.data?.result ? (
              <p className="px-1 text-px15 text-ink-2">{m.checks_screen__code_never()}</p>
            ) : findings.length === 0 ? (
              <StatusLine tone="ok" text={m.checks_screen__code_clean({ when: ago(verify.data.result.startedAt) })} />
            ) : (
              <>
                <RowStack>
                  {findings.map((f) => (
                    <FindingRow key={f.id} f={f} technical={technical} />
                  ))}
                </RowStack>
                <button type="button" aria-expanded={technical} onClick={() => setTechnical((v) => !v)} className="inline-flex items-center gap-1.5 self-start px-1 text-px15 font-semibold text-muted-foreground hover:text-foreground">
                  <ChevronDown className={`size-4 transition-transform ${technical ? 'rotate-180' : ''}`} />
                  {technical ? m.accounts_access__hide_developer() : m.accounts_access__show_developer()}
                </button>
              </>
            )}
          </Group>
        ) : null}

        <Group title={m.checks_screen__walks_group()} sub={coverageLine(coverage.data)}>
          {runs.isPending || (runs.data?.length && latest.isPending) ? (
            <Skeleton />
          ) : runs.isError ? (
            <ErrorState error={runs.error} what={m.checks_screen__walks_group()} onRetry={() => void runs.refetch()} retrying={runs.isFetching} />
          ) : latest.isError ? (
            <ErrorState error={latest.error} what={m.checks_screen__walks_group()} onRetry={() => void latest.refetch()} retrying={latest.isFetching} />
          ) : !lastRun ? (
            <EmptyState layout="row" icon={Route} title={m.checks_screen__walks_empty()} text={m.checks_screen__walks_empty_text()}>
              <Button type="button" size="page" onClick={() => say(m.checks_screen__ask_write())}>
                <PikkuDot />
                {m.checks_screen__walks_empty_ask()}
              </Button>
            </EmptyState>
          ) : (
            <>
              {lastRun.status === 'running' ? <StatusLine tone="wait" text={m.checks_screen__walks_running()} /> : null}
              {failing.length ? (
                <RowStack>
                  {failing.map((r) => (
                    <RowCard
                      key={r.name}
                      flag
                      tile={<Route className="size-5" />}
                      title={asI18n(titleOf(r))}
                      caption={r.failure?.sentence ? m.checks_screen__stopped_at({ step: asI18n(r.failure.sentence) }) : m.checks_screen__stopped()}
                      note={m.checks_screen__ran_when({ when: ago(lastRun.startedAt) })}
                    >
                      <Button variant="bordered" size="compact" type="button" onClick={() => setDrawer({ runId: lastRun.runId, focus: r.name })}>
                        {m.checks_screen__see_what_happened()}
                      </Button>
                    </RowCard>
                  ))}
                </RowStack>
              ) : null}
              {fine.length ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
                  <StatusLine tone="ok" text={m.checks_screen__walks_fine({ count: fine.length, when: ago(lastRun.startedAt) })} />
                  <Button variant="quiet" size="link" type="button" aria-expanded={showFine} onClick={() => setShowFine((v) => !v)}>
                    {showFine ? m.checks_screen__hide_them() : m.checks_screen__show_them()}
                  </Button>
                </div>
              ) : null}
              {showFine && fine.length ? (
                <RowStack>
                  {fine.map((r) => (
                    <RowCard key={r.name} on tile={<ListChecks className="size-5" />} title={asI18n(titleOf(r))} caption={r.description ? asI18n(r.description) : undefined}>
                      <Button variant="ghost" size="compact" type="button" onClick={() => setDrawer({ runId: lastRun.runId, focus: r.name })}>
                        {m.checks_screen__open()}
                      </Button>
                    </RowCard>
                  ))}
                </RowStack>
              ) : null}
              {lastRun.skipped.length ? <p className="px-1 text-px14 text-ink-2">{m.checks_screen__not_run({ count: lastRun.skipped.length })}</p> : null}
            </>
          )}
        </Group>

        {runs.data && runs.data.length > 0 ? (
          <Group title={m.checks_screen__runs_group()}>
            <RowStack>
              {runs.data.map((r) => (
                <RowCard key={r.runId} tile={<ListChecks className="size-5" />} title={ago(r.startedAt)} caption={runLine(r)}>
                  <Dot tone={r.status === 'running' ? 'quiet' : r.failed ? 'bad' : 'ok'}>{r.status === 'running' ? m.checks_screen__going_now() : r.failed ? m.checks_screen__went_wrong() : m.checks_screen__went_fine()}</Dot>
                  <Button variant="bordered" size="compact" type="button" onClick={() => setDrawer({ runId: r.runId })}>
                    {m.checks_screen__open()}
                  </Button>
                </RowCard>
              ))}
            </RowStack>
          </Group>
        ) : null}

        {drawer ? <CheckRunDrawer key={`${drawer.runId}-${drawer.focus ?? ''}`} projectKey={key} runId={drawer.runId} focus={drawer.focus} onClose={() => setDrawer(null)} /> : null}
      </Page>
    </div>
  )
}
