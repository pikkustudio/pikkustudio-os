import type { I18nNode, I18nString } from '@pikku/react'
import type { I18nProps } from '../lib/i18n-props'
import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

function Accordion({ className, ...props }: I18nProps<React.ComponentProps<'div'>>) {
  return <div data-slot="accordion" className={cn('flex flex-col border-t border-border', className)} {...props} />
}

function AccordionItem({ title, defaultOpen = false, className, children }: { title: I18nString; defaultOpen?: boolean; className?: string; children: I18nNode }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const id = React.useId()
  return (
    <div data-slot="accordion-item" data-state={open ? 'open' : 'closed'} className={cn('group border-b border-border', className)}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 py-4 text-start text-px16 font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {title}
          <ChevronDown className="size-4.5 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
        </button>
      </h3>
      <div id={id} role="region" hidden={!open} className="pb-5 text-px15 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export { Accordion, AccordionItem }
