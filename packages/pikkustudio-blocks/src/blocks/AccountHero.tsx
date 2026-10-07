import { m } from '@/i18n/messages'
import { NextCard } from './NextCard'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <circle cx="170" cy="92" r="26" className="fill-w6" opacity="0.92" />
      <path d="M124 170a46 46 0 0 1 92 0z" className="fill-w6" opacity="0.92" />
    </>
  )
}

export function AccountHero({ name }: { name: string | undefined }) {
  return (
    <NextCard
      label={m.account_hero__label()}
      hue="sea"
      art={<Art />}
      title={name ? m.account_hero__title_named({ name }) : m.account_hero__title()}
      why={m.account_hero__why()}
    />
  )
}
