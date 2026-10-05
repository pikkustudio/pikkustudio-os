import { m } from '@/i18n/messages'
import { useState } from 'react'
import { KeyRound, Pencil } from 'lucide-react'
import { Button } from '../ui/button'

export function SecretsList({
  names,
  removing,
  onChange,
  onRemove,
}: {
  names: string[]
  removing: boolean
  onChange: (name: string) => void
  onRemove: (name: string) => void
}) {
  const [confirm, setConfirm] = useState<string | null>(null)
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {names.map((name) => (
        <li key={name} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-card border border-border bg-card px-3.5 py-2.5 shadow-card">
          <span role="img" aria-label={m.secrets_list__secret()} className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
            <KeyRound className="size-5" />
          </span>
          <div className="flex min-w-48 flex-1 flex-col">
            <b className="truncate text-[16px] leading-[1.3]">{name}</b>
            <span className="text-[14px] text-ink-2">{m.secrets_list__locked_only_your_projects()}</span>
          </div>
          <div className="flex items-center gap-2">
            {confirm === name ? (
              <>
                <Button type="button" variant="destructive" size="compact" disabled={removing} onClick={() => { onRemove(name); setConfirm(null) }}>
                  
                  {m.secrets_list__remove_it_for_good()}
                </Button>
                <Button type="button" variant="ghost" size="compactTight" onClick={() => setConfirm(null)}>
                  
                  {m.secrets_list__keep_it()}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="bordered" size="compact" onClick={() => onChange(name)}>
                  <Pencil className="size-4" />
                  
                  {m.secrets_list__change()}
                </Button>
                <Button type="button" variant="ghost" size="compactTight" onClick={() => setConfirm(name)}>
                  
                  {m.secrets_list__remove()}
                </Button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
