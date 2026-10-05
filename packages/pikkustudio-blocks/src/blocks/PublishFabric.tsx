import { m } from '@/i18n/messages'
import { useContext, useEffect, useState } from 'react'
import { Check, CircleAlert, Copy, Globe, Upload } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { NextCard } from './NextCard'
import { PikkuDot } from './PikkuDot'
import { StatusLine } from './StatusLine'

const URL_SCHEME = 'https://'

export type FabricState = 'ready' | 'signin' | 'notin' | 'publishing' | 'live' | 'error'

const sample = () => ({
  steps: [m.publish_fabric__step_1(), m.publish_fabric__step_2(), m.publish_fabric__step_3(), m.publish_fabric__step_4()],
  askAboutFailure: m.publish_fabric__failure_ask(),
})

type Msg = { tone: 'ok' | 'bad' | 'wait'; text: string } | undefined

function Art() {
  return (
    <>
      <circle cx="220" cy="30" r="120" className="fill-w1" />
      <circle cx="60" cy="200" r="100" className="fill-w2" />
      <circle cx="180" cy="130" r="58" className="fill-w3" />
      <circle cx="268" cy="160" r="9" className="fill-coral" />
      <path d="M150 150V70M120 100l30-30 30 30" className="stroke-w6" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </>
  )
}

function Stat({ tone, text }: { tone: 'ok' | 'warn'; text: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-px16 font-bold">
      <span className={`size-3 shrink-0 rounded-full ring-4 ring-hero-ink/20 ${tone === 'ok' ? 'bg-success' : 'bg-warning'}`} />
      {text}
    </span>
  )
}

export function PublishFabric() {
  const { say, setPublish } = useContext(ShellCtx)
  const key = useProjectKey()
  const options = usePikkuQuery('studio:publishOptions', { key }, { enabled: !!key })
  const status = usePikkuQuery('studio:publishStatus', { key }, {
    enabled: !!key,
    refetchInterval: (query: { state: { data?: { state?: string } } }) => (query.state.data?.state === 'running' ? 1500 : false),
  })
  const publishNow = usePikkuMutation('studio:publishToFabric', { onSuccess: () => status.refetch() })
  const signIn = usePikkuMutation('studio:startSignIn')
  const [msg, setMsg] = useState<Msg>()
  const [signedRow, setSignedRow] = useState(false)

  const job = status.data
  const state: FabricState =
    job?.state === 'running' ? 'publishing' : job?.state === 'done' ? 'live' : job?.state === 'failed' ? 'error' : options.data?.fabric === 'sign-in' ? 'signin' : options.data?.fabric === 'not-in-fabric' ? 'notin' : 'ready'
  const step = Math.min(job?.log.length ?? 0, sample().steps.length - 1)
  const url = (job?.url ?? '').replace(/^https?:\/\//, '')

  const publish = () => {
    setMsg(undefined)
    publishNow.mutate({ key })
  }
  const openFabric = (target: string) => window.open(target, '_blank', 'noopener')
  const startSignIn = () =>
    signIn.mutate(undefined as never, {
      onSuccess: (r: { code: string; url: string }) => {
        openFabric(`${r.url}?code=${encodeURIComponent(r.code)}`)
        setMsg({ tone: 'ok', text: m.publish_fabric__fabric_opened_in_a() })
        setSignedRow(true)
      },
    })
  const addToFabric = () => openFabric(options.data?.consoleUrl ?? '')
  const copyAddress = () => {
    void navigator.clipboard?.writeText(`https://${url}`)
    setMsg({ tone: 'ok', text: m.publish_fabric__copied_you_can_paste() })
  }

  useEffect(() => {
    if (state === 'signin' || state === 'error' || state === 'live') {
      setPublish({ state, url, ask: job?.error ? m.publish_fabric__failure_ask_with_error({ error: job.error }) : sample().askAboutFailure, act: (a) => (a === 'publish' ? publish() : startSignIn()) })
    } else setPublish(null)
    return () => setPublish(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, url])

  if (!options.data && !job) return <div className="h-48 animate-pulse rounded-card border border-border bg-secondary" />

  const note = msg ? <StatusLine tone={msg.tone} text={msg.text} onHero /> : null
  const row = 'mt-1 flex flex-wrap items-center gap-3.5'

  if (state === 'signin')
    return (
      <NextCard label={m.publish_fabric__publish_with_fabric()} hue="sea" art={<Art />} title={m.publish_fabric__publish_with_fabric()} why={m.publish_fabric__fabric_puts_your_app()}>
        <Stat tone="warn" text={m.publish_fabric__you_need_to_sign()} />
        <div className={row}>
          <Button variant="hero" size="pageLg" type="button" onClick={startSignIn}>
            
            {m.publish_fabric__sign_in_to_fabric()}
          </Button>
          {note}
        </div>
        <div>
          {signedRow ? (
            <Button variant="heroGhost" size="page" type="button" onClick={() => { setSignedRow(false); setMsg(undefined); void options.refetch() }}>
              
              {m.publish_fabric__i_have_signed_in()}
            </Button>
          ) : null}
        </div>
      </NextCard>
    )

  if (state === 'notin')
    return (
      <NextCard label={m.publish_fabric__publish_with_fabric()} hue="sea" art={<Art />} title={m.publish_fabric__publish_with_fabric()} why={m.publish_fabric__fabric_puts_your_app_2()}>
        <Stat tone="warn" text={m.publish_fabric__this_app_is_not()} />
        <div className={row}>
          <Button variant="hero" size="pageLg" type="button" onClick={addToFabric}>
            
            {m.publish_fabric__add_this_app_in()}
          </Button>
          {note}
        </div>
      </NextCard>
    )

  if (state === 'publishing') {
    const pct = (n: number) => Math.round((n / sample().steps.length) * 100)
    return (
      <NextCard label={m.publish_fabric__publish_with_fabric()} hue="sea" art={<Art />} title={m.publish_fabric__publishing_your_app()} why={m.publish_fabric__fabric_is_putting_your()}>
        <ul className="mt-1 mb-0.5 flex flex-col gap-3 text-[18px] font-semibold" aria-live="polite">
          {sample().steps.map((line, i) => (
            <li key={line} className={`flex items-center gap-3.5 ${i > step ? 'opacity-65' : ''}`}>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full ${i < step ? 'bg-hero-ink text-hero' : i === step ? 'animate-[spin_0.9s_linear_infinite] border-[2.5px] border-hero-ink border-r-transparent' : 'border-2 border-dashed border-hero-ink'}`}
              >
                {i < step ? <Check className="size-3.75" strokeWidth={3} /> : null}
              </span>
              {line}
            </li>
          ))}
        </ul>
        <div className="h-2.5 max-w-115 overflow-hidden rounded-full bg-hero-ink/25" role="progressbar" aria-label={m.publish_fabric__publishing_progress()} aria-valuenow={pct(step)} aria-valuemin={0} aria-valuemax={100}>
          <i className="block h-full rounded-full bg-hero-ink transition-[width] duration-420 ease-[cubic-bezier(.16,1,.3,1)]" style={{ width: `${Math.round(((step + 0.4) / sample().steps.length) * 100)}%` }} />
        </div>
      </NextCard>
    )
  }

  if (state === 'live')
    return (
      <NextCard label={m.publish_fabric__publish_with_fabric()} hue="sea" art={<Art />} title={m.publish_fabric__your_app_is_live()} why={m.publish_fabric__anyone_with_this_web()}>
        <div className="flex w-fit max-w-full items-center gap-2.5 rounded-dev bg-[color-mix(in_srgb,var(--hero-ink)_14%,transparent)] px-4 py-3 text-[18px] font-bold break-words">
          <Globe className="size-5" />
          {URL_SCHEME}{url}
        </div>
        <div className={row}>
          <Button variant="hero" size="pageLg" type="button" onClick={() => openFabric(`https://${url}`)}>
            
            {m.publish_fabric__open_your_live_app()}
          </Button>
          <Button variant="heroGhost" size="page" type="button" onClick={copyAddress}>
            <Copy className="size-4.5" />
            
            {m.publish_fabric__copy_the_address()}
          </Button>
          <Button variant="heroGhost" size="page" type="button" onClick={() => openFabric(options.data?.consoleUrl ?? '')}>
            
            {m.publish_fabric__manage_it_in_fabric()}
          </Button>
        </div>
        {note}
        <div>
          <Button variant="quiet" size="link" type="button" className="text-hero-ink" onClick={publish}>
            
            {m.publish_fabric__publish_again()}
          </Button>
        </div>
      </NextCard>
    )

  if (state === 'error')
    return (
      <NextCard label={m.publish_fabric__publish_with_fabric()} hue="sea" art={<Art />} title={m.publish_fabric__publishing_did_not_finish()} why={m.publish_fabric__your_live_app_if()}>
        <Alert variant="problem" className="mt-0.5">
          <CircleAlert className="size-7 text-destructive-foreground" />
          <div>
            <b className="mb-0.5 block text-px17">{job?.error ?? m.publish_fabric__fabric_could_not_be()}</b>
            <p className="text-px175 text-ink-2">{m.publish_fabric__this_usually_means_the()}</p>
          </div>
          <div className="col-span-full flex flex-wrap gap-2">
            <Button variant="bordered" size="compact" type="button" onClick={publish}>
              
              {m.publish_fabric__try_again()}
            </Button>
            <Button variant="bordered" size="compact" type="button" className="gap-2.25" onClick={() => say(sample().askAboutFailure)}>
              <PikkuDot />
              
              {m.publish_fabric__ask_pikku()}
            </Button>
          </div>
        </Alert>
        {note}
      </NextCard>
    )

  return (
    <NextCard label={m.publish_fabric__publish_with_fabric()} hue="sea" art={<Art />} title={m.publish_fabric__publish_with_fabric()} why={m.publish_fabric__one_step_fabric_puts()}>
      <Stat tone="ok" text={m.publish_fabric__fabric_is_ready()} />
      <div className={row}>
        <Button variant="hero" size="pageLg" type="button" onClick={publish}>
          <Upload className="size-4.5" />
          
          {m.publish_fabric__publish_to_fabric()}
        </Button>
        {note}
      </div>
    </NextCard>
  )
}
