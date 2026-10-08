import type { I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Activity, ArrowUpRight, CreditCard, Server, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'

const features = () => [
  { icon: Sparkles, title: m.fabric_pitch__pick_the_ai_that(), text: m.fabric_pitch__switch_between_the_best(), tone: 'bg-accent text-accent-foreground' },
  { icon: CreditCard, title: m.fabric_pitch__a_stripe_sandbox_to(), text: m.fabric_pitch__take_pretend_payments_while(), tone: 'bg-indigo text-white' },
  { icon: Server, title: m.fabric_pitch__cheap_hosting(), text: m.fabric_pitch__put_your_app_online(), tone: 'bg-success-soft text-success-foreground' },
  { icon: Activity, title: m.fabric_pitch__watching_and_self_healing(), text: m.fabric_pitch__ai_keeps_an_eye(), tone: 'bg-secondary text-foreground' },
]

type Props = { avatar: I18nNode; href: string; onClose: () => void }

function FabricPitchList({ avatar, href, onClose }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
      <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
        {avatar}
        <p className="font-heading text-[17px] leading-[1.4] text-pretty">{m.fabric_pitch__studio_is_all_you()}</p>
      </div>
      <ul className="flex list-none flex-col">
        {features().map((f) => (
          <li key={f.title} className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${f.tone}`}>
              <f.icon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[16px]">{f.title}</b>
              <small className="text-[14px] text-muted-foreground">{f.text}</small>
            </div>
          </li>
        ))}
      </ul>
      <Button asChild variant="default" size="pageLg">
        <a href={href} target="_blank" rel="noreferrer">
          
          {m.fabric_pitch__see_what_fabric_costs()}
          <ArrowUpRight className="rtl:-scale-x-100 size-5" />
        </a>
      </Button>
      <Button variant="ghost" size="page" type="button" onClick={onClose}>
        
        {m.fabric_pitch__not_now()}
      </Button>
    </div>
  )
}

function FabricPitchTiles({ href, onClose }: Omit<Props, 'avatar'>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
      <section data-hue="teal" className="relative shrink-0 overflow-hidden rounded-[22px] bg-hero p-6 text-hero-ink" aria-label={m.fabric_pitch__what_fabric_is()}>
        <svg className="absolute inset-0 size-full" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
          <circle cx="380" cy="20" r="130" className="fill-w1" />
          <circle cx="330" cy="190" r="80" className="fill-w2" opacity=".7" />
          <circle cx="360" cy="110" r="22" className="fill-coral" />
        </svg>
        <div className="relative z-1 max-w-[16rem]">
          <h3 className="text-[26px] leading-[1.1] font-bold tracking-[-0.015em] text-balance">{m.fabric_pitch__fabric_is_where_your()}</h3>
          <p className="mt-2 text-[15px] text-hero-ink-2 text-pretty">{m.fabric_pitch__everything_after_the_build()}</p>
        </div>
      </section>
      <div className="grid shrink-0 grid-cols-2 gap-3">
        {features().map((f) => (
          <div key={f.title} className="flex flex-col gap-2 rounded-[18px] border border-border p-4">
            <span className={`grid size-10 place-items-center rounded-xl ${f.tone}`}>
              <f.icon className="size-5.5" />
            </span>
            <b className="text-[16px] leading-[1.25] text-balance">{f.title}</b>
            <p className="text-[14px] text-ink-2 text-pretty">{f.text}</p>
          </div>
        ))}
      </div>
      <Button asChild variant="default" size="pageLg">
        <a href={href} target="_blank" rel="noreferrer">
          
          {m.fabric_pitch__see_what_fabric_costs()}
          <ArrowUpRight className="rtl:-scale-x-100 size-5" />
        </a>
      </Button>
      <Button variant="ghost" size="page" type="button" onClick={onClose}>
        
        {m.fabric_pitch__not_now()}
      </Button>
    </div>
  )
}

// What Fabric adds: the one place the open package speaks about Fabric. Variant `b` shows tiles, otherwise a list.
export function FabricPitch({ variant, ...props }: Props & { variant?: 'a' | 'b' }) {
  return variant === 'b' ? <FabricPitchTiles href={props.href} onClose={props.onClose} /> : <FabricPitchList {...props} />
}
