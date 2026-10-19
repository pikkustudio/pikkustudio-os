import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { ArrowUpRight, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { RowCard, RowStack, Dot } from '../blocks/RowCard'
import { ErrorState } from '../blocks/ErrorState'
import { StatusLine } from '../blocks/StatusLine'
import { PikkuDot } from '../blocks/PikkuDot'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'
import { useDeveloperDetails } from '../lib/developer-details'
import { ago } from '../lib/audit'

type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info'
type Issue = {
  package: string
  severity: Severity
  title: string
  advisoryId: string
  url: string
  vulnerableVersions: string
  cwe: string[]
  cvssScore: number | null
  recommendedVersion: string | null
  dependencyType?: 'prod' | 'dev'
}
type Update = { package: string; current: string; latest: string; level: 'major' | 'minor' | 'patch' | 'unknown'; dependencyType?: 'prod' | 'dev' }
type Report = { schemaVersion: number; tool: string; generatedAt: string; note?: string; issues: Issue[]; updates: Update[] }

const AUDIT = 'console:getSecurityAudit'
const ORDER: Severity[] = ['critical', 'high', 'moderate', 'low', 'info']

const KINDS: [RegExp, () => I18nString][] = [
  [/command injection|code injection|_\.template/i, () => m.security_screen__kind_code()],
  [/prototype pollution|__proto__/i, () => m.security_screen__kind_pollution()],
  [/ssrf|server-side request forgery|no_proxy|absolute url|cloud metadata|proxy bypass/i, () => m.security_screen__kind_reach()],
  [/credential (leak|theft|leakage)|proxy-authorization|forwards secure headers|xsrf token cross-origin/i, () => m.security_screen__kind_leak()],
  [/header injection/i, () => m.security_screen__kind_header()],
  [/cross-site request forgery|csrf/i, () => m.security_screen__kind_trick()],
  [/redos|regular expression|denial of service|\bdos\b|unbounded recursion|maxbodylength|maxcontentlength/i, () => m.security_screen__kind_slow()],
  [/null byte|path traversal|directory traversal/i, () => m.security_screen__kind_files()],
]

const kindOf = (title: string): I18nString => (KINDS.find(([re]) => re.test(title))?.[1] ?? (() => m.security_screen__kind_other()))()

const howBad = (s: Severity): { tone: 'bad' | 'warn' | 'quiet'; word: I18nString; advice: I18nString } =>
  s === 'critical'
    ? { tone: 'bad', word: m.security_screen__sev_critical(), advice: m.security_screen__sev_critical_advice() }
    : s === 'high'
      ? { tone: 'bad', word: m.security_screen__sev_high(), advice: m.security_screen__sev_high_advice() }
      : s === 'moderate'
        ? { tone: 'warn', word: m.security_screen__sev_moderate(), advice: m.security_screen__sev_moderate_advice() }
        : { tone: 'quiet', word: m.security_screen__sev_low(), advice: m.security_screen__sev_low_advice() }

const fixFor = (issue: Issue, report: Report) => issue.recommendedVersion ?? report.updates.find((u) => u.package === issue.package)?.latest ?? null
const currentOf = (pkg: string, report: Report) => report.updates.find((u) => u.package === pkg)?.current

const brief = (issues: Issue[], report: Report) =>
  [
    'Fix these known security weaknesses in the project dependencies:',
    '',
    ...issues.map((i) => {
      const to = fixFor(i, report)
      const id = i.advisoryId ? ` (${i.advisoryId})` : ''
      return `- ${i.package}${to ? ` → ${to}` : ''}: ${i.severity}: ${i.title}${id}`
    }),
    '',
    'Update every package.json that declares each package, regenerate the lockfile, then run the typecheck and the test suite. Where no fixed version exists, work around the weakness. Fix only what the upgrade breaks; do not change behaviour beyond what the new versions require.',
  ].join('\n')

function Problem({ issue, report, dev, projectKey }: { issue: Issue; report: Report; dev: boolean; projectKey: string }) {
  const { open } = useContext(ShellCtx)
  const update = useProjectAction<{ package: string; version: string }>(projectKey, 'console:updateDependency', [AUDIT])
  const ask = useProjectAction<{ title: string; body?: string; route?: string }>(projectKey, 'console:createStudioChange', ['console:listStudioChanges'])
  const bad = howBad(issue.severity)
  const to = fixFor(issue, report)
  const from = currentOf(issue.package, report)
  const what = kindOf(issue.title)
  const spec = [issue.package, from, to ? `→ ${to}` : ''].filter(Boolean).join(' ')
  return (
    <RowCard
      flag={bad.tone === 'bad'}
      tile={<ShieldAlert className="size-5" />}
      title={what}
      caption={bad.advice}
      note={to ? m.security_screen__fix_ready() : m.security_screen__no_fix_yet()}
      below={
        dev || update.isError || ask.isError ? (
          <div className="flex flex-col gap-2">
            {update.isError ? <StatusLine tone="bad" text={m.security_screen__update_failed()} /> : null}
            {ask.isError ? <StatusLine tone="bad" text={m.security_screen__ask_failed()} /> : null}
            {dev ? (
              <div className="rounded-xl bg-secondary p-4 text-px14 text-ink-2">
                <code dir="ltr" className="block font-mono text-px13 break-words text-foreground">
                  {asI18n(spec)}
                </code>
                <span dir="ltr" className="mt-1 block">
                  {asI18n(issue.title)}
                  {issue.advisoryId ? <>{sep(' · ')}{asI18n(issue.advisoryId)}</> : null}
                  {issue.url ? (
                    <>
                      {sep(' · ')}
                      <a href={issue.url} target="_blank" rel="noreferrer" className="font-semibold text-accent-foreground underline-offset-3 hover:underline">
                        {m.security_screen__read_more()}
                      </a>
                    </>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>
        ) : null
      }
    >
      <Dot tone={bad.tone}>{bad.word}</Dot>
      <div className="flex flex-wrap items-center gap-2">
        {to ? (
          <Button type="button" variant="bordered" size="compact" aria-busy={update.isPending} disabled={update.isPending} onClick={() => update.mutate({ package: issue.package, version: to })}>
            <ArrowUpRight className="size-4" />
            {update.isPending ? m.security_screen__updating() : m.security_screen__update_it()}
          </Button>
        ) : null}
        {ask.isSuccess ? (
          <Button type="button" variant="quiet" size="link" onClick={() => open('changes')}>
            {m.security_screen__on_the_list()}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="compact"
            aria-busy={ask.isPending}
            disabled={ask.isPending}
            onClick={() => ask.mutate({ title: m.security_screen__change_title_one({ what }), body: brief([issue], report), route: '/security' })}
          >
            <PikkuDot />
            {m.security_screen__ask_pikku()}
          </Button>
        )}
      </div>
    </RowCard>
  )
}

export function SecurityScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { open } = useContext(ShellCtx)
  const q = useProjectQuery<Report | null>(key, AUDIT, null)
  const run = useProjectAction(key, 'console:runSecurityAudit', [AUDIT])
  const askAll = useProjectAction<{ title: string; body?: string; route?: string }>(key, 'console:createStudioChange', ['console:listStudioChanges'])
  const [dev] = useDeveloperDetails()
  const [showTools, setShowTools] = useState(false)

  const head = <PageHead crumb={projectName} title={m.security_screen__title()} text={m.security_screen__text()} size="lead" developerDetails />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.security_screen__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const report = q.data ?? null
  const failed = !!report?.note
  const sorted = report && !failed ? [...report.issues].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity)) : []
  const live = sorted.filter((i) => i.dependencyType !== 'dev')
  const tools = sorted.filter((i) => i.dependencyType === 'dev')
  const newer = report && !failed ? report.updates.filter((u) => u.dependencyType !== 'dev').length : 0
  const checked = report ? ago(report.generatedAt, Date.now()) : null
  const runCheck = () => run.mutate(undefined)

  const tone = !report || failed ? (failed ? 'petrol' : 'teal') : live.length ? 'teal' : 'sea'
  const title = q.isPending
    ? m.security_screen__hero_loading()
    : run.isPending
      ? m.security_screen__hero_running()
      : !report
        ? m.security_screen__hero_never()
        : failed
          ? m.security_screen__hero_failed()
          : live.length === 0
            ? m.security_screen__hero_clear()
            : live.length === 1
              ? m.security_screen__hero_one()
              : m.security_screen__hero_many({ count: live.length })
  const why = run.isPending
    ? m.security_screen__why_running()
    : !report
      ? m.security_screen__why_never()
      : failed
        ? m.security_screen__why_failed()
        : live.length === 0
          ? m.security_screen__why_clear({ when: checked! })
          : m.security_screen__why_problems({ worst: howBad(live[0].severity).word, when: checked! })

  const checkButton = (
    <Button type="button" variant={live.length ? 'heroGhost' : 'hero'} size={live.length ? 'page' : 'pageLg'} aria-busy={run.isPending} disabled={run.isPending || q.isPending || !key} onClick={runCheck}>
      <ShieldCheck className="size-4.5" />
      {report ? m.security_screen__check_again() : m.security_screen__run_check()}
    </Button>
  )

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.security_screen__title()} hue={tone} page="security" title={title} why={why}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {run.isPending ? (
            <StatusLine onHero text={m.security_screen__checking()} />
          ) : (
            <>
              {live.length ? (
                askAll.isSuccess ? (
                  <Button type="button" variant="hero" size="pageLg" onClick={() => open('changes')}>
                    <PikkuDot />
                    {m.security_screen__on_the_list_all()}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="hero"
                    size="pageLg"
                    aria-busy={askAll.isPending}
                    disabled={askAll.isPending}
                    onClick={() => askAll.mutate({ title: m.security_screen__change_title_all({ count: live.length }), body: brief(live, report!), route: '/security' })}
                  >
                    <PikkuDot />
                    {live.length === 1 ? m.security_screen__ask_pikku() : m.security_screen__ask_pikku_all()}
                  </Button>
                )
              ) : null}
              {checkButton}
            </>
          )}
        </div>
        {run.isError ? <StatusLine onHero tone="bad" text={m.security_screen__run_failed()} /> : null}
        {askAll.isError ? <StatusLine onHero tone="bad" text={m.security_screen__ask_failed()} /> : null}
      </NextCard>

      {q.isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-secondary" />
          ))}
        </div>
      ) : report ? (
        <>
          {failed ? (
            dev ? (
              <p dir="ltr" className="rounded-xl bg-secondary p-4 text-px14 text-ink-2">
                {asI18n(report.note!)}
              </p>
            ) : null
          ) : live.length ? (
            <section className="flex flex-col gap-2" aria-label={m.security_screen__to_fix()}>
              <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{m.security_screen__to_fix()}</h2>
              <RowStack>
                {live.map((issue, i) => (
                  <Problem key={`${issue.package}@${issue.advisoryId || issue.url || i}`} issue={issue} report={report} dev={dev} projectKey={key} />
                ))}
              </RowStack>
            </section>
          ) : (
            <p className="px-1">
              <StatusLine tone="ok" text={m.security_screen__all_clear_line({ when: checked! })} />
            </p>
          )}

          {!failed && (tools.length || newer) ? (
            <div className="flex flex-col gap-2 px-1 text-px15 text-ink-2">
              {tools.length ? (
                <p>
                  {m.security_screen__tools_line({ count: tools.length })}{sep(' ')}
                  <Button type="button" variant="quietMuted" size="link" aria-expanded={showTools} onClick={() => setShowTools((v) => !v)}>
                    {showTools ? m.security_screen__tools_hide() : m.security_screen__tools_show()}
                  </Button>
                </p>
              ) : null}
              {newer ? <p>{m.security_screen__newer_line({ count: newer })}</p> : null}
            </div>
          ) : null}

          {showTools && tools.length ? (
            <RowStack>
              {tools.map((issue, i) => (
                <Problem key={`${issue.package}@${issue.advisoryId || issue.url || i}`} issue={issue} report={report} dev={dev} projectKey={key} />
              ))}
            </RowStack>
          ) : null}

        </>
      ) : null}
    </Page>
  )
}
