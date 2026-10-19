import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { NextCard } from './NextCard'
import { StatusLine } from './StatusLine'
import { Link } from './Link'
import { Button, buttonVariants } from '../ui/button'
import { keep } from '../lib/links'
import { useProjectTarget } from '../lib/project-target'

export type StageState = 'live' | 'publishing' | 'not-published' | 'missing'

/** Why a published copy has no numbers to show: it is not there, it is on its way out, or it was never published. */
export function StageStateCard({ state, label }: { state: Exclude<StageState, 'live'>; label: I18nString }) {
  const target = useProjectTarget()
  const back = target.openWorkspace ? (
    <Button variant="heroGhost" size="page" onClick={target.openWorkspace}>
      {m.metrics_live__back()}
    </Button>
  ) : null
  const card = (title: I18nString, why: I18nString, actions: I18nNode) => (
    <NextCard label={label} hue="teal" page="metrics" title={title} why={why}>
      {actions ? <div className="flex flex-wrap gap-3" data-testid={`stage-${state}`}>{actions}</div> : <span className="hidden" data-testid={`stage-${state}`} />}
    </NextCard>
  )
  if (state === 'missing') return card(m.metrics_live__missing_title(), m.metrics_live__missing_text(), back)
  if (state === 'publishing') return card(m.metrics_live__publishing_title(), m.metrics_live__publishing_text(), <StatusLine tone="wait" text={m.metrics_live__publishing_title()} />)
  return card(
    m.metrics_live__never_title(),
    m.metrics_live__never_text(),
    <>
      <Link {...keep} to={'/publish' as never} className={buttonVariants({ variant: 'hero', size: 'page' })}>
        {m.metrics_live__go_publish()}
      </Link>
      {back}
    </>,
  )
}
