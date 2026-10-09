import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { NextCard } from './NextCard'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="274" cy="165" r="9" className="fill-coral" />
      <rect x="128" y="86" width="84" height="104" rx="12" className="fill-w6" opacity="0.92" />
      <rect x="142" y="106" width="44" height="7" rx="3.5" className="fill-w2" />
      <rect x="142" y="124" width="56" height="7" rx="3.5" className="fill-w3" />
      <rect x="142" y="142" width="36" height="7" rx="3.5" className="fill-w2" />
      <rect x="142" y="160" width="50" height="7" rx="3.5" className="fill-w3" />
    </>
  )
}

export function CodeHero({ title, why, children }: { title: I18nString; why: I18nString; children?: I18nNode }) {
  return (
    <NextCard label={m.code_hero__label()} hue="sea" art={<Art />} title={title} why={why}>
      {children}
    </NextCard>
  )
}
