import { m } from '@/i18n/messages'
import { type I18nNode, type I18nString, asI18n } from '@pikku/react'
import type { Ref } from 'react'
import { Button } from '../ui/button'
import { Blob, type BlobPoseName } from './Blob'

export type OpeningStep = { label: string; state: 'done' | 'now' | 'wait' | (string & {}); ai?: boolean }

export const openingH1 = 'max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance'
export const openingLead = 'mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty'

export function OpeningStage({ children, sectionRef, label = m.machine_opening__our_recommendation(), pose = 'blob' }: { children: I18nNode; sectionRef?: Ref<HTMLElement>; label?: I18nString; pose?: BlobPoseName }) {
  return (
    <section
      ref={sectionRef}
      data-hue="sea"
      className="relative grid min-h-95 grid-cols-1 overflow-hidden rounded-[30px] bg-hero text-hero-ink lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
      aria-label={label}
    >
      <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">{children}</div>
      <div className="relative hidden min-h-55 place-items-center group-data-open/shell:min-h-0 lg:grid" aria-hidden="true">
        <Blob pose={pose} className="size-[min(78%,22rem)]" />
      </div>
    </section>
  )
}

export function MachineOpening({ title, lead, steps, onCancel, cancelLabel = m.machine_opening__cancel(), icon }: { title: I18nString; lead: I18nString; steps: OpeningStep[]; onCancel?: () => void; cancelLabel?: I18nString; icon?: I18nNode }) {
  return (
    <>
      <div>
        <h1 className={openingH1}>
          {icon}
          {title}
        </h1>
        <p className={openingLead}>{lead}</p>
      </div>
      <div>
        <ul className="flex list-none flex-col gap-3.5 text-[19px] font-semibold" role="status">
          {steps.map((s) => (
            <li key={s.label} className={`flex items-center gap-3.5 ${s.state === 'wait' ? 'opacity-60' : ''}`}>
              <span
                aria-hidden="true"
                className={`size-3.5 shrink-0 rounded-full bg-hero-ink ${s.state === 'now' ? 'animate-pulse' : s.state === 'wait' ? 'opacity-35' : ''}`}
              />
              {asI18n(s.label)}
            </li>
          ))}
        </ul>
        {onCancel ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Button variant="heroGhost" size="page" type="button" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}
