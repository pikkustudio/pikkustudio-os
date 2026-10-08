import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { PikkuMark } from './PikkuSays'
export function PikkuSuggests({ title, text, yes = m.pikku_suggests__do_it_for_me(), no = m.pikku_suggests__not_now() }: { title: I18nString; text: I18nString; yes?: I18nString; no?: I18nString }) {
  return (
    <div className="flex items-start gap-4 rounded-card border border-dashed border-border bg-card p-5">
      <span data-hue="petrol" className="grid size-11 shrink-0 place-items-center rounded-full bg-hero text-hero-ink">
        <PikkuMark className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <b className="flex items-center gap-2 text-[17px] leading-[1.3]">
          <Sparkles className="size-4 text-muted-foreground" />
          {title}
        </b>
        <p className="max-w-ch54 text-[15px] leading-[1.45] text-ink-2 text-pretty">{text}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button variant="default" size="compact" type="button">
            {yes}
          </Button>
          <Button variant="bordered" size="compact" type="button">
            {no}
          </Button>
        </div>
      </div>
    </div>
  )
}
