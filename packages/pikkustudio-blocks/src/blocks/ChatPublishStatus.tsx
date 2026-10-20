import type { I18nString } from '@pikku/react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useContext, useState } from 'react'
import { RotateCcw, RefreshCw } from 'lucide-react'
import { m } from '@/i18n/messages'
import { useReleases, type Release } from '../lib/releases'
import { useCanEdit } from '../lib/project-target'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { versionLabel } from '../lib/releaseLabels'

const DOT: Partial<Record<Release['status'], string>> = { live: 'bg-success', working: 'bg-info animate-pulse', waiting: 'bg-warning', failed: 'bg-destructive' }

const wordsOf = (latest: Release): I18nString =>
  latest.status === 'live' ? m.chat_publish__live() : latest.status === 'working' ? m.chat_publish__working() : latest.status === 'waiting' ? m.chat_publish__waiting() : latest.status === 'failed' ? m.chat_publish__failed() : m.chat_publish__not_live()

// studio:publishState says how the latest publish of the copy shown stands; null where nothing is published (or no
// host publishes), and then nothing shows. While it is not live, the strip says so and offers what the releases allow.
export function ChatPublishStatus({ projectKey }: { projectKey: string }) {
  const publish = usePikkuQuery('studio:publishState', { key: projectKey }, { staleTime: 30_000 } as never) as { data?: { publishState: { state: string } | null } }
  const state = publish.data?.publishState?.state
  return state && state !== 'live' ? <PublishStrip /> : null
}

function PublishStrip() {
  const view = useReleases()
  const canEdit = useCanEdit()
  const { say } = useContext(ShellCtx)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState<'again' | 'back' | null>(null)
  const [failed, setFailed] = useState(false)
  const latest = view.releases[0]
  if (view.state !== 'ready' || !latest || !view.actions || latest.status === 'live') return null
  const actions = view.actions
  const goBack = actions.goBack
  const previous = view.releases.find((r) => r.id !== latest.id && (r.status === 'was-live' || r.status === 'live'))
  const editable = canEdit && !view.readOnly
  const act = async (what: 'again' | 'back', work: () => Promise<void>) => {
    setBusy(what)
    setFailed(false)
    try {
      await work()
      setConfirming(false)
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="flex flex-col gap-2 border-t border-border px-5 py-2.5 text-[13px]" data-testid="chat-publish-status">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`size-2 shrink-0 rounded-full ${DOT[latest.status] ?? 'bg-muted-foreground'}`} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-ink-2" role="status">
          {wordsOf(latest)} {versionLabel(latest)}
        </span>
        {editable && latest.status === 'failed' ? (
          <Button variant="ghost" size="chipSm" type="button" disabled={!!busy} aria-busy={busy === 'again'} onClick={() => void act('again', () => actions.tryAgain(latest.id))} data-testid="chat-publish-again">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {busy === 'again' ? m.chat_publish__working() : m.chat_publish__again()}
          </Button>
        ) : null}
        {editable && goBack && previous && !confirming ? (
          <Button variant="ghost" size="chipSm" type="button" disabled={!!busy} onClick={() => setConfirming(true)} data-testid="chat-publish-back">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {m.chat_publish__back()}
          </Button>
        ) : null}
      </div>
      {confirming && goBack && previous ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary px-3 py-2" role="group">
          <span className="min-w-0 flex-1 text-ink-2">{m.chat_publish__back_confirm({ version: versionLabel(previous) })}</span>
          <Button variant="destructive" size="chipSm" type="button" disabled={!!busy} aria-busy={busy === 'back'} onClick={() => void act('back', () => goBack(previous.id))} data-testid="chat-publish-back-confirm">
            {m.chat_publish__back_yes()}
          </Button>
          <Button variant="ghost" size="chipSm" type="button" disabled={!!busy} onClick={() => setConfirming(false)}>
            {m.chat_publish__keep()}
          </Button>
        </div>
      ) : null}
      {failed ? (
        <div className="flex flex-wrap items-center gap-2" role="alert">
          <span className="min-w-0 flex-1 text-ink-2">{m.chat_publish__action_failed()}</span>
          <Button variant="bordered" size="chipSm" type="button" onClick={() => say(m.chat_publish__ask({ version: versionLabel(latest) }))}>
            {m.chat_publish__ask_pikku()}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
