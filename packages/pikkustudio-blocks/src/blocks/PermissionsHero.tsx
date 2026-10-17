import { m } from '@/i18n/messages'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { NextCard } from './NextCard'

function Art() {
  return (
    <>
      <circle cx="220" cy="50" r="118" className="fill-w1" />
      <circle cx="60" cy="185" r="96" className="fill-w2" />
      <circle cx="175" cy="135" r="56" className="fill-w3" />
      <circle cx="268" cy="168" r="9" className="fill-coral" />
      <rect x="140" y="96" width="70" height="80" rx="16" className="fill-w6" opacity="0.92" />
      <circle cx="175" cy="96" r="24" className="fill-none stroke-w6" strokeWidth="9" opacity="0.92" />
    </>
  )
}

export function PermissionsHero({ count, onCreate }: { count: number | undefined; onCreate: () => void }) {
  const none = count === 0
  return (
    <NextCard
      label={m.permissions_hero__label()}
      hue="teal"
      art={<Art />}
      title={none ? m.permissions_hero__empty_title() : m.permissions_hero__title()}
      why={none ? m.permissions_hero__empty_text() : m.permissions_hero__text()}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button variant="hero" size="pageLg" type="button" onClick={onCreate}>
          <Plus className="size-4.5" />
          {m.permissions_hero__create()}
        </Button>
        {count ? (
          <span className="inline-flex items-center gap-2.5 text-px16 font-bold">
            <span className="size-3 shrink-0 rounded-full bg-success ring-4 ring-hero-ink/20" />
            {m.permissions_hero__count({ n: count })}
          </span>
        ) : null}
      </div>
    </NextCard>
  )
}
