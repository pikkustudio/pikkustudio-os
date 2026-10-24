import { sep, type I18nString } from '@pikku/react'
import { Fragment } from 'react'
import { Check, CircleAlert, Clock, Loader, Minus } from 'lucide-react'
import { labelOf, type State } from './data'

const TONE: Record<State, string> = {
  needs: 'bg-warning text-on-warning',
  working: 'bg-info-soft text-info-foreground',
  waiting: 'bg-secondary text-ink-2',
  done: 'bg-success-soft text-success-foreground',
  aside: 'bg-secondary text-muted-foreground',
}

const ICON = { needs: CircleAlert, working: Loader, waiting: Clock, done: Check, aside: Minus }

export function Pill({ s, small }: { s: State; small?: boolean }) {
  const I = ICON[s]
  return (
    <span className={`inline-flex shrink-0 items-center self-start gap-1.5 rounded-full font-bold ${small ? 'px-2.5 py-0.5 text-[13px]' : 'px-3 py-1 text-[14px]'} ${TONE[s]}`}>
      <I className={`size-3.5 ${s === 'working' ? 'animate-spin [animation-duration:3s]' : ''}`} />
      {labelOf(s)}
    </span>
  )
}

/** Small facts on one line, with a quiet dot between them. */
export function Meta({ items }: { items: (I18nString | undefined)[] }) {
  const shown = items.filter((x): x is I18nString => !!x)
  return (
    <>
      {shown.map((x, i) => (
        <Fragment key={i}>
          {i > 0 ? sep(' · ') : null}
          {x}
        </Fragment>
      ))}
    </>
  )
}
