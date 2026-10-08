import type { I18nString } from '@pikku/react'
import { ArrowRight } from 'lucide-react'
import type { ComponentType } from 'react'
import { Button } from '../ui/button'
import { m, asI18n } from '@/i18n/messages'
import { ChipRow } from '../blocks/ChipRow'
import { Hero } from '../blocks/Hero'
import { InlineAlert } from '../blocks/InlineAlert'
import { Notice } from '../blocks/Notice'
import { ProjectChip } from '../blocks/ProjectChip'
import { Spinner } from '../blocks/Spinner'
import { WayIn } from '../blocks/WayIn'
import { WaySection } from '../blocks/WaySection'

export interface SignInOption {
  id: string
  Icon: ComponentType<{ className?: string }>
  title: I18nString
  body: I18nString
  action: I18nString
  run: () => Promise<unknown>
}

export type SignInStatus = 'idle' | 'pending' | 'error' | 'success'

export interface SignInScreenProps {
  options: readonly [SignInOption, ...SignInOption[]]
  status: SignInStatus
  returning: boolean
  recent: readonly { key: string; name: string }[]
  onChoose: (option: SignInOption) => void
}

export function SignInScreen({ options, status, returning, recent, onChoose }: SignInScreenProps) {
  const [primary, ...others] = options
  const busy = status === 'pending'
  const failed = status === 'error'
  const chips = returning && !busy ? recent.slice(0, 4) : []

  const title = busy ? m.signin__busy_title() : returning ? m.signin__back_title() : m.signin__local_title()
  const why = busy ? m.signin__busy_why() : returning ? m.signin__back_why() : m.signin__local_why()
  const hint = busy ? undefined : returning ? m.signin__hint_back() : m.signin__hint()

  return (
    <>
      <Hero
        hue="teal"
        art="arch"
        title={title}
        why={why}
        hint={hint}
        actions={
          <Button variant="hero" size="pageLg" aria-busy={busy} disabled={busy} onClick={() => onChoose(primary)}>
            {busy ? <Spinner /> : null}
            {busy ? m.signin__opening() : primary.action}
            {busy ? null : <ArrowRight className="rtl:-scale-x-100 size-5.5" />}
          </Button>
        }
      >
        {chips.length > 0 ? (
          <ChipRow>
            {chips.map((p, i) => (
              <ProjectChip key={p.key} name={asI18n(p.name)} tone={i} />
            ))}
          </ChipRow>
        ) : null}
      </Hero>
      {failed ? (
        <InlineAlert
          title={m.signin__failed_title()}
          body={m.signin__failed_body()}
          action={
            <Button variant="bordered" size="compact" onClick={() => onChoose(primary)}>
              {m.signin__retry()}
            </Button>
          }
        />
      ) : null}
      {others.length > 0 ? (
        <WaySection title={m.signin__others_title()}>
          {others.map((o) => (
            <WayIn
              key={o.id}
              icon={<o.Icon />}
              title={o.title}
              body={o.body}
              action={
                <Button variant="bordered" size="page" disabled={busy} onClick={() => onChoose(o)}>
                  {o.action}
                </Button>
              }
            />
          ))}
        </WaySection>
      ) : null}
      <Notice>{m.signin__legal()}</Notice>
    </>
  )
}
