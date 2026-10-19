import { m } from '@/i18n/messages'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { NextCard } from './NextCard'

export function PermissionsHero({ count, onCreate }: { count: number | undefined; onCreate: () => void }) {
  const none = count === 0
  return (
    <NextCard
      label={m.permissions_hero__label()}
      hue="teal"
      page="permissions"
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
