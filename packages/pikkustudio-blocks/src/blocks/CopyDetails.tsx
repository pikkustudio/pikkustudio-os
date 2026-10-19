import { m } from '@/i18n/messages'
import type { I18nString } from '@pikku/react'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '../ui/button'

/** Copies a ready-made message about a problem, for places with no assistant to hand it to. */
export function CopyDetails({ text, hero }: { text: I18nString; hero?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant={hero ? 'hero' : 'bordered'}
      size={hero ? 'pageLg' : 'compact'}
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        })
      }}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? m.common__copied() : m.action_notice__copy()}
    </Button>
  )
}
