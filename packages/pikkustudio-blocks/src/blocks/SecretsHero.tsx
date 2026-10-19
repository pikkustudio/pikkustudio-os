import { m } from '@/i18n/messages'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { NextCard } from './NextCard'

export function SecretsHero({ count, onAdd }: { count: number | undefined; onAdd: () => void }) {
  const none = count === 0
  return (
    <NextCard
      label={m.secrets_hero__secrets()}
      hue="petrol"
      page="secrets"
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
            {m.secrets_hero__saved({ count })}
          </span>
        ) : null}
      </div>
    </NextCard>
  )
}
