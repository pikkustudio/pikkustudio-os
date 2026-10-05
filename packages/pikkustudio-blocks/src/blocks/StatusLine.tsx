import { Check, CircleAlert } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

const line = cva('inline-flex min-h-6 items-center gap-2 text-px145 leading-[1.35] font-bold', {
  variants: {
    tone: { ok: 'text-success-foreground', bad: 'text-destructive-foreground', wait: 'text-ink-2', hero: 'text-hero-ink' },
  },
  defaultVariants: { tone: 'wait' },
})

export function StatusLine({ text, tone, onHero }: { text: string; onHero?: boolean } & VariantProps<typeof line>) {
  return (
    <span className={line({ tone: onHero ? 'hero' : tone })} role="status">
      {tone === 'ok' ? <Check className="size-4.5" strokeWidth={2.5} /> : null}
      {tone === 'bad' ? <CircleAlert className="size-4.5" strokeWidth={2.5} /> : null}
      {tone === 'wait' || !tone ? <i className="size-4 shrink-0 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-r-transparent" /> : null}
      <span>{text}</span>
    </span>
  )
}
