import type { I18nString } from '@pikku/react'
import { useState } from 'react'
import { Button } from '../ui/button'

export function SureButton({
  label,
  question,
  yes,
  keep,
  busy,
  onSure,
}: {
  label: I18nString
  question: I18nString
  yes: I18nString
  keep: I18nString
  busy: boolean
  onSure: () => void
}) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <Button data-testid="sure_button__ask" variant="destructive" onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span data-testid="sure_button__question">{question}</span>
      <Button data-testid="sure_button__yes" variant="destructive" disabled={busy} onClick={onSure}>
        {yes}
      </Button>
      <Button data-testid="sure_button__keep" variant="outline" onClick={() => setAsking(false)}>
        {keep}
      </Button>
    </div>
  )
}
