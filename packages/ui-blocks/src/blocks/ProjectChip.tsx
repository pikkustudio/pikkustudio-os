import { asI18n } from '@pikku/react'
import { cn } from '../lib/utils'

const tones = [
  { base: 'fill-w2', glow: 'fill-w5' },
  { base: 'fill-coral', glow: 'fill-warning' },
]

export function ProjectChip({ name, tone }: { name: string; tone: number }) {
  const t = tones[tone % tones.length]
  return (
    <span className="flex items-center gap-2.5 rounded-full bg-hero-ink/14 py-1.5 pe-4 ps-1.5 text-px15 font-bold">
      <span className="block size-9 overflow-hidden rounded-full">
        <svg viewBox="0 0 40 40" className="block size-full" aria-hidden="true">
          <rect width="40" height="40" className={t.base} />
          <circle cx="32" cy="8" r="20" className={cn(t.glow, 'opacity-90')} />
        </svg>
      </span>
      {asI18n(name)}
    </span>
  )
}
