import { m } from '@/i18n/messages'
import { UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { NextCard } from './NextCard'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <circle cx="150" cy="104" r="22" className="fill-w6" opacity="0.92" />
      <rect x="116" y="132" width="68" height="34" rx="17" className="fill-w6" opacity="0.92" />
    </>
  )
}

export function AccountsHero({ count, onInvite }: { count: number | undefined; onInvite: () => void }) {
  const none = count === 0
  return (
    <NextCard
      label={m.accounts_hero__label()}
      hue="sea"
      art={<Art />}
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
