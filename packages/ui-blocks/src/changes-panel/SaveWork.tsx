import { asI18n, type I18nString } from '@pikku/react'
import { useContext, useId, useState } from 'react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { STUDIO_LOCAL } from '@/lib/env'
import { ShellCtx } from '../lib/shell'
import { useCanEdit } from '../lib/project-target'
import { StatusLine } from '../blocks/StatusLine'
import { PikkuDot } from '../blocks/PikkuDot'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type KeepStatus = { unsaved: number; commits: { sha: string; subject: string }[]; remote: string | null }
type KeepResult = { ok: true; kept: number } | { ok: false; reason: 'conflict' | 'edited'; files: string[] }
type Sent = { pushed: boolean; remote: string; branches: string[] }
type Outcome = { tone: 'ok' | 'bad'; text: I18nString; ask?: I18nString }

const call = <I, O>(mutation: unknown) => (mutation as { mutateAsync: (input: I) => Promise<O> }).mutateAsync

export const placeOf = (remote: string) => {
  const path = remote.replace(/\.git$/, '').replace(/^git@([^:]+):/, 'https://$1/')
  try {
    const url = new URL(path)
    return url.hostname === 'github.com' ? url.pathname.replace(/^\//, '') : `${url.hostname}${url.pathname}`
  } catch {
    return path
  }
}

const reasonOf = (error: unknown) => (error instanceof Error && error.message ? error.message : '')

export function SaveWork({ projectKey }: { projectKey: string }) {
  const { say } = useContext(ShellCtx)
  const canEdit = useCanEdit()
  const fieldId = useId()
  const status = usePikkuQuery('studio:keepStatus', { key: projectKey }, { enabled: !!projectKey && canEdit, refetchInterval: 8000 } as never) as unknown as { data?: KeepStatus; isError: boolean; refetch: () => Promise<unknown> }
  const keep = call<{ key: string }, KeepResult>(usePikkuMutation('studio:keepChanges'))
  const send = call<{ key: string }, Sent>(usePikkuMutation('studio:pushAll'))
  const link = call<{ key: string; url: string }, Sent>(usePikkuMutation('studio:linkRemote'))
  const [busy, setBusy] = useState<'keep' | 'send' | 'link' | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [address, setAddress] = useState('')

  if (!canEdit || !projectKey) return null
  const data = status.data
  if (!data) return status.isError ? (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
      <StatusLine tone="bad" text={m.save_work__status_failed()} />
      <Button variant="bordered" size="chipSm" type="button" onClick={() => void status.refetch()}>{m.query_state__try_again()}</Button>
    </div>
  ) : null

  const waiting = data.unsaved + data.commits.length
  // Sending to a git remote, and linking one, is this computer's; on the web saving keeps the work in its workspace.
  const place = STUDIO_LOCAL && data.remote ? asI18n(placeOf(data.remote)) : null

  const run = async (what: 'keep' | 'send' | 'link', work: () => Promise<Outcome>) => {
    setBusy(what)
    setOutcome(null)
    try {
      setOutcome(await work())
    } catch (error) {
      const detail = reasonOf(error)
      setOutcome({ tone: 'bad', text: what === 'link' ? m.save_work__link_failed() : what === 'send' ? m.save_work__send_failed() : m.save_work__keep_failed(), ask: m.save_work__ask({ what: what === 'link' ? m.save_work__ask_link() : what === 'send' ? m.save_work__ask_send() : m.save_work__ask_keep(), detail: asI18n(detail || '-') }) })
    } finally {
      setBusy(null)
      void status.refetch()
    }
  }

  const saveNow = () =>
    run('keep', async () => {
      const result = await keep({ key: projectKey })
      if (!result.ok) return { tone: 'bad', text: m.save_work__clash(), ask: m.save_work__ask({ what: m.save_work__ask_keep(), detail: asI18n(result.files.join(', ') || result.reason) }) }
      if (!place) return { tone: 'ok', text: m.save_work__kept_here() }
      const sent = await send({ key: projectKey })
      return sent.pushed ? { tone: 'ok', text: m.save_work__kept_and_sent({ place: place ?? '' }) } : { tone: 'ok', text: m.save_work__kept_here() }
    })
  const sendNow = () =>
    run('send', async () => {
      const sent = await send({ key: projectKey })
      return sent.pushed ? { tone: 'ok', text: m.save_work__sent({ place: place ?? '' }) } : { tone: 'bad', text: m.save_work__send_failed() }
    })
  const connect = () =>
    run('link', async () => {
      const sent = await link({ key: projectKey, url: address.trim() })
      setConnecting(false)
      setAddress('')
      return { tone: 'ok', text: m.save_work__linked({ place: asI18n(placeOf(sent.remote)) }) }
    })

  return (
    <section className="flex flex-col gap-3 border-b border-border px-5 py-4" aria-label={m.save_work__title()} data-testid="save-work">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-[15px]">{waiting ? m.save_work__not_saved() : m.save_work__all_saved()}</b>
          {STUDIO_LOCAL ? <span className="text-[13px] text-muted-foreground">{place ? m.save_work__copy_on({ place }) : m.save_work__only_here()}</span> : null}
        </div>
        {waiting ? (
          <Button variant="default" size="compact" type="button" disabled={!!busy} aria-busy={busy === 'keep'} onClick={() => void saveNow()} data-testid="save-work-keep">
            {busy === 'keep' ? m.save_work__saving() : m.save_work__save()}
          </Button>
        ) : place ? (
          <Button variant="ghost" size="compactTight" type="button" disabled={!!busy} aria-busy={busy === 'send'} onClick={() => void sendNow()} data-testid="save-work-send">
            {busy === 'send' ? m.save_work__sending() : m.save_work__send()}
          </Button>
        ) : null}
      </div>
      {STUDIO_LOCAL && !place && !connecting ? (
        <div>
          <Button variant="bordered" size="chipSm" type="button" disabled={!!busy} onClick={() => setConnecting(true)} data-testid="save-work-connect">
            {m.save_work__connect()}
          </Button>
        </div>
      ) : null}
      {connecting ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (address.trim()) void connect()
          }}
        >
          <label htmlFor={fieldId} className="text-[14px] font-bold">{m.save_work__address_label()}</label>
          <Input id={fieldId} shape="field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={m.save_work__address_example()} autoComplete="off" spellCheck={false} />
          <p className="text-[13px] text-muted-foreground">{m.save_work__address_hint()}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="compact" type="submit" disabled={!address.trim() || !!busy} aria-busy={busy === 'link'}>
              {busy === 'link' ? m.save_work__connecting() : m.save_work__connect_now()}
            </Button>
            <Button variant="ghost" size="compactTight" type="button" disabled={!!busy} onClick={() => setConnecting(false)}>
              {m.save_work__cancel()}
            </Button>
          </div>
        </form>
      ) : null}
      {outcome ? (
        <div className="flex flex-wrap items-center gap-3" role={outcome.tone === 'bad' ? 'alert' : undefined}>
          <StatusLine tone={outcome.tone} text={outcome.text} />
          {outcome.ask ? (
            <Button variant="bordered" size="chipSm" type="button" className="gap-2" onClick={() => say(outcome.ask!)}>
              <PikkuDot />
              {m.save_work__ask_pikku()}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
