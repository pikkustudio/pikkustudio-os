import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'

export function Segmented({ label, value, options, onChange }: { label: I18nString; value: string; options: Array<[string, I18nNode, boolean?, I18nString?]>; onChange: (value: string) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-full bg-secondary p-0.75 h-10 items-center" role="group" aria-label={label}>
      {options.map(([id, text, off, name]) => (
        <Button key={id} variant="segment" size="segment" type="button" aria-pressed={value === id} disabled={off} aria-label={name} title={off ? m.segmented__not_written_yet() : name} onClick={() => onChange(id)}>
          {text}
        </Button>
      ))}
    </div>
  )
}
