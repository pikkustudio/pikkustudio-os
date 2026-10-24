import type { I18nNode, I18nString } from '@pikku/react'
import { Segmented } from './Segmented'

export function SegmentField({ label, options, value, onChange, note }: { label: I18nString; options: Array<[string, I18nNode]>; value: string; onChange: (v: string) => void; note?: I18nNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="block text-px13 font-bold text-muted-foreground">{label}</span>
      <Segmented label={label} value={value} onChange={onChange} options={options} />
      {note ? <span className="text-[13.5px] leading-[1.45] text-ink-2">{note}</span> : null}
    </div>
  )
}
