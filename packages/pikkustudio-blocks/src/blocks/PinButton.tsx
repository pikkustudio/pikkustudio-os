import { m } from '@/i18n/messages'
import { Pin } from 'lucide-react'
import { Button } from '../ui/button'
import { useCurrentMovable, usePins } from '../lib/pins'

export function PinButton({ variant = 'bordered' }: { variant?: 'bordered' | 'bar' }) {
  const id = useCurrentMovable()
  const { pins, toggle } = usePins()
  if (!id) return null
  const on = pins.includes(id)
  const label = on ? m.pin_button__unpin_label() : m.pin_button__pin_label()
  return (
    <Button variant={variant} size={variant === 'bar' ? 'bar' : 'compact'} type="button" aria-pressed={on} aria-label={label} title={label} onClick={() => toggle(id)}>
      <Pin className={on ? 'size-4.5 fill-current' : 'size-4.5'} />
      {variant === 'bar' ? null : on ? m.pin_button__pinned() : m.pin_button__pin()}
    </Button>
  )
}
