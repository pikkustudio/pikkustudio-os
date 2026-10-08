import { m } from '@/i18n/messages'
import { Pin } from 'lucide-react'
import { Button } from '../ui/button'
import { useCurrentFixed, useCurrentMovable, usePins } from '../lib/pins'

export function PinButton({ variant = 'bordered' }: { variant?: 'bordered' | 'bar' }) {
  const id = useCurrentMovable()
  const { pins, toggle } = usePins()
  const fixed = useCurrentFixed()
  if (!id && !fixed) return null
  if (!id) {
    return (
      <Button variant={variant} size={variant === 'bar' ? 'bar' : 'compact'} type="button" aria-pressed disabled aria-label={m.pin_button__always()} title={m.pin_button__always()}>
        <Pin className="size-4.5 fill-current" />
        {variant === 'bar' ? null : m.pin_button__pinned()}
      </Button>
    )
  }
  const on = pins.includes(id)
  const label = on ? m.pin_button__unpin_label() : m.pin_button__pin_label()
  return (
    <Button variant={variant} size={variant === 'bar' ? 'bar' : 'compact'} type="button" aria-pressed={on} aria-label={label} title={label} onClick={() => toggle(id)}>
      <Pin className={on ? 'size-4.5 fill-current' : 'size-4.5'} />
      {variant === 'bar' ? null : on ? m.pin_button__pinned() : m.pin_button__pin()}
    </Button>
  )
}
