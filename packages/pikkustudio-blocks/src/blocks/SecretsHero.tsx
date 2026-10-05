import { m } from '@/i18n/messages'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { NextCard } from './NextCard'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <rect x="138" y="112" width="64" height="48" rx="12" className="fill-w6" opacity="0.92" />
      <path d="M152 112V98a18 18 0 0 1 36 0v14" className="stroke-w6" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="170" cy="136" r="6" className="fill-w2" />
    </>
  )
}

export function SecretsHero({ count, onAdd }: { count: number | undefined; onAdd: () => void }) {
  const none = count === 0
  return (
    <NextCard
      label={m.secrets_hero__secrets()}
      hue="petrol"
      art={<Art />}
      title={none ? m.secrets_hero__keep_your_passwords_in() : m.secrets_hero__your_secrets_are_locked()}
      why={
        none
          ? m.secrets_hero__add_a_password_or()
          : m.secrets_hero__they_were_locked_in()
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button variant="hero" size="pageLg" type="button" onClick={onAdd}>
          <Plus className="size-4.5" />
          
          {m.secrets_hero__add_a_secret()}
        </Button>
        {count ? (
          <span className="inline-flex items-center gap-2.5 text-px16 font-bold">
            <span className="size-3 shrink-0 rounded-full bg-success ring-4 ring-hero-ink/20" />
            {count === 1 ? m.secrets_hero__1_secret_saved() : `${count} secrets saved`}
          </span>
        ) : null}
      </div>
    </NextCard>
  )
}
