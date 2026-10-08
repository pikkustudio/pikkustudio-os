import type { ReactNode, Ref } from 'react'
import { Check } from 'lucide-react'
import { Button } from '../ui/button'
import { AiSpinner } from './Spinner'

export type OpeningStep = { label: string; state: 'done' | 'now' | 'wait' | (string & {}); ai?: boolean }

export const openingH1 = 'max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance'
export const openingLead = 'mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty'

export function OpeningStage({ children, sectionRef, label = 'Our recommendation' }: { children: ReactNode; sectionRef?: Ref<HTMLElement>; label?: string }) {
  return (
    <section
      ref={sectionRef}
      data-hue="sea"
      className="relative grid min-h-95 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] overflow-hidden rounded-[30px] bg-hero text-hero-ink group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
      aria-label={label}
    >
      <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">{children}</div>
      <div className="relative min-h-55 group-data-open/shell:min-h-0" aria-hidden="true">
        <svg className="absolute inset-0 size-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
          <circle cx="368" cy="48" r="248" className="fill-w1" />
          <circle cx="16" cy="408" r="231" className="fill-w2" />
          <circle cx="248" cy="440" r="160" className="fill-w3" opacity=".55" />
          <rect x="70" y="80" width="260" height="56" rx="28" className="fill-w6" />
          <rect x="110" y="156" width="230" height="56" rx="28" className="fill-w5" />
          <rect x="70" y="232" width="190" height="56" rx="28" className="fill-w6" opacity=".92" />
          <circle cx="330" cy="330" r="48" className="fill-coral" />
          <circle cx="330" cy="330" r="62" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        </svg>
      </div>
    </section>
  )
}

export function MachineOpening({ title, lead, steps, onCancel, cancelLabel = 'Cancel', icon }: { title: string; lead: string; steps: OpeningStep[]; onCancel?: () => void; cancelLabel?: string; icon?: ReactNode }) {
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
              {s.state === 'done' ? (
                <span className="grid size-7.5 shrink-0 place-items-center rounded-full bg-hero-ink text-hero">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              ) : s.state === 'now' && s.ai ? (
                <span className="grid size-7.5 shrink-0 place-items-center text-hero-ink">
                  <AiSpinner className="size-7.5" />
                </span>
              ) : s.state === 'now' ? (
                <span className="size-7.5 shrink-0 animate-[spin_0.9s_linear_infinite] rounded-full border-[2.5px] border-hero-ink border-r-transparent" />
              ) : (
                <span className="size-7.5 shrink-0 rounded-full border-2 border-dashed border-hero-ink" />
              )}
              {s.label}
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
