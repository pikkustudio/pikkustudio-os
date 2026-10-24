import { m } from '@/i18n/messages'
import { UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { NextCard } from './NextCard'

export function AccountsHero({ count, onInvite }: { count: number | undefined; onInvite: () => void }) {
  const none = count === 0
  return (
    <NextCard
      label={m.accounts_hero__label()}
      hue="sea"
      page="accounts"
      title={none ? m.accounts_hero__empty_title() : m.accounts_hero__title()}
      why={none ? m.accounts_hero__empty_text() : m.accounts_hero__text()}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button variant="hero" size="pageLg" type="button" onClick={onInvite}>
          <UserPlus className="size-4.5" />
          {m.accounts_hero__invite()}
        </Button>
        {count ? (
          <span className="inline-flex items-center gap-2.5 text-px16 font-bold">
            <span className="size-3 shrink-0 rounded-full bg-success ring-4 ring-hero-ink/20" />
            {m.accounts_hero__count({ count })}
          </span>
        ) : null}
      </div>
    </NextCard>
  )
}
