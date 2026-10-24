import type { I18nNode, I18nString } from '@pikku/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { useContext } from 'react'
import { Search } from 'lucide-react'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { PinButton } from './PinButton'
import { usePublishPageTitle } from '../lib/page-title'

const head = cva('flex flex-wrap justify-between gap-5', {
  variants: { align: { start: 'items-start', end: 'items-end' } },
  defaultVariants: { align: 'start' },
})

const body = cva('', {
  variants: { width: { fill: 'shrink grow basis-130', fit: '' } },
  defaultVariants: { width: 'fill' },
})

const lead = cva('text-pretty text-ink-2', {
  variants: { size: { default: 'mt-2 max-w-[64ch] text-[16px]', lead: 'mt-1.5 max-w-ch62 text-[17px]' } },
  defaultVariants: { size: 'default' },
})

export function PageHead({ crumb, title, text, children, size, width, ...v }: { crumb?: I18nNode; title: I18nString; text?: I18nNode; children?: I18nNode } & VariantProps<typeof head> & VariantProps<typeof lead> & VariantProps<typeof body>) {
  usePublishPageTitle(title)
  const { openFind } = useContext(ShellCtx)
  return (
    <div data-testid="page-head" className={head(v)}>
      <div className={body({ width })}>
        <div className="mb-1 text-[14px] font-semibold text-muted-foreground">{crumb}</div>
        <h1 className="text-[40px] leading-[1.08] font-bold tracking-[-0.012em] text-balance">{title}</h1>
        {text ? <p className={lead({ size })}>{text}</p> : null}
      </div>
      <div className="flex items-start gap-2.5">
        {children}
        <button type="button" onClick={() => openFind?.()} aria-keyshortcuts="Meta+K Control+K" aria-label={m.shell_layout__find_a_page()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-2.5 text-[13px] text-muted-foreground transition-colors duration-140 hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden @min-[900px]/app:inline">{m.shell_layout__find_a_page()}</span>
          <kbd className="hidden rounded border border-border px-1 text-[11px] leading-4 @min-[900px]/app:inline">{m.shell_layout__find_shortcut()}</kbd>
        </button>
        <PinButton />
      </div>
    </div>
  )
}
