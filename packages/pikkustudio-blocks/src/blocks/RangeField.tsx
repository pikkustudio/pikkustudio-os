import { asI18n, type I18nString } from '@pikku/react'
import { useId } from 'react'

export function RangeField({ label, min, max, value, unit, onChange }: { label: I18nString; min: number; max: number; value: number; unit: string; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2.5 pt-3.5 pb-3.75 text-px145 font-semibold">
        <label htmlFor={id}>{label}</label>
        <output className="min-w-11 text-end text-px13 font-bold text-muted-foreground">
          {value}
          {asI18n(unit)}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="h-6 w-full accent-primary" />
    </div>
  )
}
