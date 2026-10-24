import { ArrowRight } from 'lucide-react'
import { asI18n } from '@pikku/react'
import { Button } from '../ui/button'
import { m } from '@/i18n/messages'
import { Hero } from '../blocks/Hero'
import { InlineAlert } from '../blocks/InlineAlert'
import { Spinner } from '../blocks/Spinner'

export type ConnectStatus = 'working' | 'failed'

const frame = 'mx-auto flex max-w-[1160px] flex-col gap-6 p-6 @min-[1700px]/app:max-w-[1380px]'

export function ConnectSignInScreen({ status, onRetry, onOpenStudio }: { status: ConnectStatus; onRetry: () => void; onOpenStudio: () => void }) {
  const working = status === 'working'
  return (
    <div className={frame}>
      <Hero hue="teal" page="sign-in" title={m.connect__sign_in_title()} why={m.connect__sign_in_why()} actions={working ? <Spinner /> : undefined} />
      {working ? null : (
        <InlineAlert
          title={m.connect__sign_in_failed_title()}
          body={m.connect__sign_in_failed_body()}
          action={
            <>
              <Button variant="bordered" size="compact" onClick={onRetry} data-testid="connect__retry">
                {m.connect__retry()}
              </Button>
              <Button variant="bordered" size="compact" onClick={onOpenStudio} data-testid="connect__open_studio">
                {m.connect__open_studio()}
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

export type ConnectConsentProps = {
  client: string | null
  broken: boolean
  failed: boolean
  busy: boolean
  onAllow: () => void
  onDeny: () => void
  onOpenStudio: () => void
}

export function ConnectConsentScreen({ client, broken, failed, busy, onAllow, onDeny, onOpenStudio }: ConnectConsentProps) {
  const name = client ? asI18n(client) : m.connect__unknown_client()
  return (
    <div className={frame}>
      <Hero
        hue="teal"
        page="sign-in"
        title={m.connect__title({ client: name })}
        why={m.connect__why()}
        actions={
          broken ? undefined : (
            <>
              <Button variant="hero" size="pageLg" aria-busy={busy} disabled={busy} onClick={onAllow} data-testid="connect__allow">
                {busy ? <Spinner /> : null}
                {busy ? m.connect__working() : m.connect__allow()}
                {busy ? null : <ArrowRight className="rtl:-scale-x-100 size-5.5" />}
              </Button>
              <Button variant="bordered" size="pageLg" disabled={busy} onClick={onDeny} data-testid="connect__deny">
                {m.connect__deny()}
              </Button>
            </>
          )
        }
      />
      {broken ? (
        <InlineAlert
          title={m.connect__broken_title()}
          body={m.connect__broken_body()}
          action={
            <Button variant="bordered" size="compact" onClick={onOpenStudio} data-testid="connect__open_studio">
              {m.connect__open_studio()}
            </Button>
          }
        />
      ) : null}
      {failed ? (
        <InlineAlert
          title={m.connect__failed_title()}
          body={m.connect__failed_body()}
          action={
            <Button variant="bordered" size="compact" onClick={onAllow} data-testid="connect__retry">
              {m.connect__retry()}
            </Button>
          }
        />
      ) : null}
    </div>
  )
}
