import { m } from '@/i18n/messages'
import { NextCard } from './NextCard'

export function AccountHero({ name }: { name: string | undefined }) {
  return (
    <NextCard
      label={m.account_hero__label()}
      hue="sea"
      page="account"
      title={name ? m.account_hero__title_named({ name }) : m.account_hero__title()}
      why={m.account_hero__why()}
    />
  )
}
