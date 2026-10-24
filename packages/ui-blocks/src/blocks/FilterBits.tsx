import type { I18nString } from '@pikku/react'
import { Button } from '../ui/button'

export const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export function Chip({ on, count, onClick, title, children }: { on: boolean; count: number; onClick: () => void; title?: I18nString; children: I18nString }) {
  return (
    <Button variant="filter" size="filter" type="button" aria-pressed={on} disabled={!on && count === 0} title={title} onClick={onClick} className="max-w-full">
      <span className="truncate">{children}</span>
      <span className={on ? 'opacity-80' : 'text-muted-foreground'}>{count}</span>
    </Button>
  )
}

export function Group({ question, children }: { question: I18nString; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={question} className="flex min-w-0 flex-col gap-2">
      <h3 className="text-px14 font-bold text-muted-foreground">{question}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
