import { asI18n, sep } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useEffect, useState } from 'react'
import { ArrowLeft, Check, CircleAlert, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Dot } from './RowCard'
import { ErrorState } from './ErrorState'
import { PikkuDot } from './PikkuDot'
import { ShellCtx } from '../lib/shell'
import { useCanEdit } from '../lib/project-target'
import { ago } from '../lib/virtualUsers'
import { titleOf, useArtifact, useRun, type Artifact, type RunRecord, type ScenarioResult } from '../lib/checks'
import { useDeveloperDetails } from '../lib/developer-details'

function Picture({ projectKey, runId, a }: { projectKey: string; runId: string; a: Artifact }) {
  const src = useArtifact(projectKey, runId, a.path)
  const caption = a.name ? asI18n(a.name) : a.kind === 'failure' ? m.checks_screen__shot_failure() : a.kind === 'video' ? m.checks_screen__shot_video() : m.checks_screen__shot()
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="overflow-hidden rounded-card border border-border bg-secondary">
        {src.url ? (
          a.kind === 'video' ? (
            <video src={src.url} controls className="block w-full" />
          ) : (
            <a href={src.url} target="_blank" rel="noreferrer">
              <img src={src.url} alt={caption} className="block w-full" />
            </a>
          )
        ) : (
          <div className="grid aspect-[16/10] place-items-center px-4 text-center text-px14 text-ink-2" role={src.loading ? 'status' : undefined}>
            {src.loading ? m.checks_screen__shot_loading() : m.checks_screen__shot_missing()}
          </div>
        )}
      </div>
      <figcaption className="text-px14 text-ink-2">
        {caption}
        {a.virtualUser ? <>{sep(' · ')}{asI18n(a.virtualUser)}</> : null}
      </figcaption>
    </figure>
  )
}

function Walkthrough({ projectKey, runId, r, onBack }: { projectKey: string; runId: string; r: ScenarioResult; onBack: () => void }) {
  const { say } = useContext(ShellCtx)
  const [technical] = useDeveloperDetails()
  const failed = r.status === 'failed'
  const pictures = r.artifacts ?? []
  const name = asI18n(titleOf(r))
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-5">
      <Button variant="bordered" size="compact" className="self-start" onClick={onBack}>
        <ArrowLeft className="rtl:-scale-x-100 size-4" aria-hidden="true" />
        {m.checks_screen__all_walkthroughs()}
      </Button>
      <div>
        <h3 className="font-heading text-[22px] leading-[1.2] font-bold">{name}</h3>
        {r.description ? <p className="mt-1 text-[16px] text-ink-2">{asI18n(r.description)}</p> : null}
        <p className="mt-2">
          <Dot tone={failed ? 'bad' : r.status === 'running' ? 'quiet' : 'ok'}>{failed ? m.checks_screen__went_wrong() : r.status === 'running' ? m.checks_screen__going_now() : m.checks_screen__went_fine()}</Dot>
        </p>
      </div>
      {failed && r.failure ? (
        <section className="flex flex-col gap-3 rounded-card border border-destructive/40 bg-card p-4">
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <span className="text-[16px]">
              <b className="block">{r.failure.sentence ? m.checks_screen__stopped_at({ step: asI18n(r.failure.sentence) }) : m.checks_screen__stopped()}</b>
              <span className="block text-[15px] text-ink-2">{asI18n(r.failure.message)}</span>
            </span>
          </div>
          <Button variant="default" size="compact" className="self-start" onClick={() => say(m.checks_screen__ask_walkthrough({ name, step: asI18n(r.failure?.sentence ?? ''), message: asI18n(r.failure?.message ?? '') }))}>
            <PikkuDot />
            {m.checks_screen__ask_fix()}
          </Button>
          {technical && r.failure.stack && !r.failure.expected ? <pre className="max-h-64 overflow-auto rounded-xl bg-secondary p-3 font-mono text-[12.5px] whitespace-pre-wrap text-ink-2">{asI18n(r.failure.stack)}</pre> : null}
        </section>
      ) : null}
      {r.steps?.length ? (
        <section>
          <h4 className="mb-2 font-heading text-[18px] font-bold">{m.checks_screen__steps()}</h4>
          <ol className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {r.steps.map((s, i) => {
              const ok = s.status === 'passed' || s.status === 'completed'
              const bad = s.status === 'failed'
              return (
                <li key={i} className="flex items-start gap-3 px-4 py-3 text-[16px]">
                  {ok ? <Check className="mt-0.5 size-4.5 shrink-0 text-success-foreground" aria-label={m.checks_screen__step_done()} /> : bad ? <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-destructive" aria-label={m.checks_screen__step_failed()} /> : <i className="mt-2 size-2.5 shrink-0 rounded-full bg-muted-foreground" aria-label={m.checks_screen__step_not_run()} />}
                  <span className={ok || bad ? '' : 'text-ink-2'}>{asI18n(s.sentenceWithRole ?? s.sentence)}</span>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}
      {pictures.length ? (
        <section className="flex flex-col gap-3">
          <h4 className="font-heading text-[18px] font-bold">{m.checks_screen__pictures()}</h4>
          {pictures.map((a) => (
            <Picture key={a.path} projectKey={projectKey} runId={runId} a={a} />
          ))}
        </section>
      ) : null}
    </div>
  )
}

const outcome = (run: RunRecord) => {
  const failed = run.results.filter((r) => r.status === 'failed').length
  if (run.status === 'running') return m.checks_screen__run_going({ done: run.results.filter((r) => r.status !== 'running').length })
  return failed ? m.checks_screen__run_some_wrong({ failed, total: run.results.length }) : m.checks_screen__run_all_fine({ total: run.results.length })
}

export function CheckRunDrawer({ projectKey, runId, focus, onClose }: { projectKey: string; runId: string; focus?: string; onClose: () => void }) {
  const { run, remove } = useRun(projectKey, runId)
  const canEdit = useCanEdit()
  const [open, setOpen] = useState<string | undefined>(focus)
  const [confirming, setConfirming] = useState(false)
  const data = run.data
  const picked = data?.results.find((r) => r.name === open)
  const sorted = data ? [...data.results].sort((a, b) => Number(b.status === 'failed') - Number(a.status === 'failed')) : []

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const forget = () => remove.mutate({ runId }, { onSuccess: onClose })

  return (
    <aside aria-label={m.checks_screen__drawer_aria()} className="fixed inset-y-0 end-0 z-50 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120">
      <header data-hue={data?.results.some((r) => r.status === 'failed') ? 'teal' : 'sea'} className="flex items-center gap-3 bg-hero px-5 pt-4 pb-4 text-hero-ink">
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{data ? m.checks_screen__run_title({ when: ago(data.startedAt) }) : m.checks_screen__run_loading()}</h2>
          {data ? <small className="block text-[14px] text-hero-ink-2">{outcome(data)}</small> : null}
        </span>
        <button type="button" aria-label={m.common__close()} onClick={onClose} className="grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15">
          <X className="size-5.5" />
        </button>
      </header>

      {run.isError ? (
        <div className="p-5">
          <ErrorState error={run.error} what={m.checks_screen__reading_run()} onRetry={() => void run.refetch()} retrying={run.isFetching} />
        </div>
      ) : run.isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-2 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-secondary" />
          ))}
        </div>
      ) : !data ? (
        <p className="p-5 text-[16px] text-ink-2">{m.checks_screen__run_gone()}</p>
      ) : picked ? (
        <Walkthrough projectKey={projectKey} runId={runId} r={picked} onBack={() => setOpen(undefined)} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5">
          {data.hookFailures.length ? (
            <div role="alert" className="rounded-card border border-destructive/40 bg-card p-4 text-[15px] text-ink-2">
              <b className="block text-foreground">{m.checks_screen__setup_failed()}</b>
              {asI18n(data.hookFailures.join('\n'))}
            </div>
          ) : null}
          {sorted.map((r) => (
            <button key={r.name} type="button" onClick={() => setOpen(r.name)} className="flex flex-col gap-1 rounded-card border border-border bg-card px-4 py-3 text-start transition-colors hover:bg-secondary">
              <b className="text-[16px]">{asI18n(titleOf(r))}</b>
              <Dot tone={r.status === 'failed' ? 'bad' : r.status === 'running' ? 'quiet' : 'ok'}>{r.status === 'failed' ? m.checks_screen__went_wrong() : r.status === 'running' ? m.checks_screen__going_now() : m.checks_screen__went_fine()}</Dot>
            </button>
          ))}
          {data.skipped.length ? <p className="text-[14px] text-ink-2">{m.checks_screen__not_run({ count: data.skipped.length })}</p> : null}
          {canEdit ? (
            <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
              {confirming ? (
                <>
                  <p className="text-[15px] text-ink-2">{m.checks_screen__forget_confirm()}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="destructive" size="compact" disabled={remove.isPending} aria-busy={remove.isPending} onClick={forget}>
                      {m.checks_screen__forget_yes()}
                    </Button>
                    <Button variant="bordered" size="compact" onClick={() => setConfirming(false)}>
                      {m.assistant_drawer__keep_it()}
                    </Button>
                  </div>
                </>
              ) : (
                <Button variant="ghost" size="compact" className="self-start" disabled={data.status === 'running'} onClick={() => setConfirming(true)}>
                  {m.checks_screen__forget()}
                </Button>
              )}
              {remove.isError ? (
                <p role="alert" className="text-px15 text-destructive-foreground">
                  {m.checks_screen__forget_failed()}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </aside>
  )
}
