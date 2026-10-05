import { useState } from 'react'
import { Input } from '../ui/input'

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="block text-px13 font-bold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value}
          aria-label={label}
          onChange={(e) => {
            setDraft(null)
            onChange(e.target.value)
          }}
          className="size-11 cursor-pointer rounded-full border-[1.5px] border-input bg-card p-0.5"
        />
        <Input
          shape="field"
          value={draft ?? value}
          aria-label={`${label} code`}
          className="h-10 font-mono text-px14 md:text-px14"
          onChange={(e) => {
            setDraft(e.target.value)
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value)
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  )
}
