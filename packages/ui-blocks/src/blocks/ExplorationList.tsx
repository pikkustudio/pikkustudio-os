import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { ChevronRight, Sparkles } from 'lucide-react'
import { Link } from './Link'
import { keep } from '../lib/links'
import { artifactWhen, type Artifact } from '../types/artifacts'

const uidOf = (a: Artifact) => a.exploration ?? 'first'

/** The design explorations in a project, newest first: each is its own set of directions, opened by its id. */
export function ExplorationList({ items }: { items: Artifact[] }) {
  const groups = new Map<string, Artifact[]>()
  for (const a of items) if (a.kind === 'Design') groups.set(uidOf(a), [...(groups.get(uidOf(a)) ?? []), a])
  const rounds = [...groups.entries()]
    .map(([uid, list]) => ({ uid, list: list.sort((a, b) => a.id.localeCompare(b.id)), at: Math.max(...list.map((a) => a.at)) }))
    .sort((a, b) => b.at - a.at)
  if (!rounds.length) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{m.exploration_list__title()}</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rounds.map(({ uid, list, at }) => (
          <li key={uid}>
            <Link {...keep} to="/artifacts/explore/$uid" params={{ uid }} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3.5 rounded-card border border-border bg-card px-3.5 py-2.5 text-foreground no-underline shadow-card hover:border-muted-foreground">
              <span className="grid size-11 place-items-center rounded-lg bg-secondary text-ink-2">
                <Sparkles className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <b className="truncate text-[16px] leading-[1.3]">{asI18n(list[0]!.title)}</b>
                <span className="truncate text-[14px] text-ink-2">{m.exploration_list__meta({ count: list.length, when: artifactWhen(at) })}</span>
              </div>
              <ChevronRight className="size-5 text-muted-foreground rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
