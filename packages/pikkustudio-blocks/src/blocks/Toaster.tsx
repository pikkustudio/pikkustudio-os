import { m } from '@/i18n/messages'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { dismiss, errorText, toast, useToasts } from '../lib/toast'

export function Toaster() {
  const client = useQueryClient()
  const items = useToasts()
  useEffect(() => {
    const onQuery = client.getQueryCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error') toast(errorText(e.action.error))
    })
    const onMutation = client.getMutationCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error') toast(errorText(e.action.error))
    })
    return () => {
      onQuery()
      onMutation()
    }
  }, [client])
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-60 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-foreground py-2.5 pr-2.5 pl-5 text-px15 font-semibold text-background shadow-lg">
          <span className="min-w-0 flex-1">{t.text}</span>
          <button type="button" aria-label={m.toaster__dismiss()} onClick={() => dismiss(t.id)} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-background/15">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
