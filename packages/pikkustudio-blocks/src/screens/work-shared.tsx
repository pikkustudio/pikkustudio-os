import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState, type ComponentType } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../ui/input'
import { RowCard, RowStack } from '../blocks/RowCard'
import { useProjectQuery } from '../lib/projectRpc'
import { useDeveloperDetails } from '../lib/developer-details'

type Wire = { name: string; pikkuFuncId: string; packageName?: string; title?: string; summary?: string; description?: string }
export type TimedWire = Wire & { schedule: string }
export type JobWire = Wire & { config?: { batchSize?: number } }
type Fn = { pikkuFuncId: string; title?: string; summary?: string; description?: string }
type WorkMeta = { functions?: Fn[]; schedulerMeta?: Record<string, TimedWire>; queueMeta?: Record<string, JobWire> }

/** Same query, and so the same cache entry, as the other screens that read the project's meta. */
export const useWorkMeta = (key: string) => useProjectQuery<WorkMeta>(key, 'console:getAllMeta', {})

/** Names come from the project's own code, so they are not ours to translate. */
const nice = (name: string) => {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.:]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const plain = (text: string | undefined) => {
  const t = text?.replace(/^\s*(cron job|queue worker|scheduled task):\s*/i, '').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : undefined
}

export type WorkItem = { id: string; title: string; what?: string; addon?: string; tech: Array<[I18nString, string]> }

export function toWorkItems<W extends Wire>(wires: Record<string, W> | undefined, fns: Fn[] | undefined, tech: (w: W) => Array<[I18nString, string]>): WorkItem[] {
  return Object.entries(wires ?? {})
    .map(([id, w]) => {
      const fn = fns?.find((f) => f.pikkuFuncId === w.pikkuFuncId)
      return {
        id,
        title: w.title || fn?.title || nice(w.name || id),
        what: plain(w.description || w.summary || fn?.description || fn?.summary),
        addon: w.packageName,
        tech: tech(w),
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

const Group = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

/** The project's own items, then those an add-on brings, each as its own card; developer detail follows the shared switch in the page head. */
export function WorkList({ items, icon: Icon, own, side, search, noDescription }: { items: WorkItem[]; icon: ComponentType<{ className?: string }>; own: I18nString; side: (id: string) => I18nNode; search: I18nString; noDescription: I18nString }) {
  const [term, setTerm] = useState('')
  const [technical] = useDeveloperDetails()
  const needle = term.trim().toLowerCase()
  const shown = needle ? items.filter((i) => [i.id, i.title, i.what].some((v) => v?.toLowerCase().includes(needle))) : items
  const mine = shown.filter((i) => !i.addon)
  const theirs = shown.filter((i) => i.addon)

  const rows = (list: WorkItem[]) => (
    <RowStack>
      {list.map((i) => (
        <RowCard
          key={i.id}
          tile={<Icon className="size-5" />}
          title={asI18n(i.title)}
          caption={i.what ? asI18n(i.what) : noDescription}
          below={
            technical ? (
              <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-xl bg-secondary px-4 py-3">
                {i.tech.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-px14 text-ink-2">{label}</dt>
                    <dd className="m-0 min-w-0">
                      <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(value)}</code>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : undefined
          }
        >
          {side(i.id)}
        </RowCard>
      ))}
    </RowStack>
  )

  return (
    <>
      {items.length > 5 ? (
        <label className="relative max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={search} aria-label={search} className="h-11.5 rounded-full ps-11" />
        </label>
      ) : null}
      {shown.length === 0 ? <p className="px-1 text-px15 text-ink-2">{m.work_list__no_matches({ query: term.trim() })}</p> : null}
      {mine.length ? <Group title={own}>{rows(mine)}</Group> : null}
      {theirs.length ? <Group title={m.work_list__from_addons()}>{rows(theirs)}</Group> : null}
    </>
  )
}

export function WorkSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-secondary" />
      ))}
    </div>
  )
}
