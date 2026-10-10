import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Shuffle, type LucideIcon } from 'lucide-react'

export type SlashCommand = { name: string; label: () => I18nString; hint: () => I18nString; Icon: LucideIcon }

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'experiment', label: () => m.slash_menu__experiment(), hint: () => m.slash_menu__experiment_hint(), Icon: Shuffle },
]

export const slashMatches = (draft: string): SlashCommand[] => {
  if (!draft.startsWith('/') || /\s/.test(draft)) return []
  const q = draft.slice(1).toLowerCase()
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(q))
}

export const slashOptionId = (name: string) => `slash-option-${name}`

export function SlashMenu({ items, active, onPick, onHover }: { items: SlashCommand[]; active: number; onPick: (c: SlashCommand) => void; onHover: (i: number) => void }) {
  if (!items.length) return null
  return (
    <ul id="slash-menu" role="listbox" aria-label={m.slash_menu__label()} className="absolute inset-x-5 bottom-full z-10 m-0 mb-2 list-none overflow-hidden rounded-[18px] border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
      {items.map((c, i) => (
        <li key={c.name} id={slashOptionId(c.name)} role="option" aria-selected={i === active}>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            onMouseEnter={() => onHover(i)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start aria-selected:bg-accent"
            aria-selected={i === active}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
              <c.Icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[15px] leading-[1.3]">/{asI18n(c.name)} <span className="font-normal text-muted-foreground">{c.label()}</span></b>
              <small className="block truncate text-[13px] leading-[1.3] text-muted-foreground">{c.hint()}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
