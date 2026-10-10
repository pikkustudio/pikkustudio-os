import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Package } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { usedIn, type SurfaceDoc, type SurfaceLeaf, type SurfaceUsage } from '../lib/surface'
import { Dot, RowCard, RowStack } from './RowCard'
import { SidePanel } from './SidePanel'

export function SurfaceReference({ doc, usage, onOpen }: { doc: SurfaceDoc; usage: SurfaceUsage | undefined; onOpen: (leaf: SurfaceLeaf) => void }) {
  const leaves = doc.entryPoints.flatMap((e) => e.leaves)
  const steps = [...new Set(leaves.map((l) => l.step))]
  return (
    <div className="flex flex-col gap-5">
      {steps.map((step) => (
        <section key={step} className="flex flex-col gap-2" aria-label={asI18n(step)}>
          <h3 className="px-1 text-px14 font-bold text-muted-foreground">{asI18n(step)}</h3>
          <RowStack>
            {leaves
              .filter((l) => l.step === step)
              .map((l) => {
                const used = usedIn(usage, l)
                return (
                  <RowCard
                    key={l.specifier}
                    tile={<Package className="size-5.5" />}
                    title={asI18n(l.name)}
                    caption={asI18n(l.summary)}
                    note={<code dir="ltr" className="font-mono">{asI18n(l.specifier)}</code>}
                  >
                    {used === null ? null : used > 0 ? <Dot tone="ok">{m.surface__ref_used({ count: used })}</Dot> : <Dot tone="quiet">{m.surface__ref_unused()}</Dot>}
                    <Button variant="bordered" size="compact" type="button" onClick={() => onOpen(l)}>
                      {m.surface__ref_open({ count: l.symbols.length })}
                    </Button>
                  </RowCard>
                )
              })}
          </RowStack>
        </section>
      ))}
    </div>
  )
}

export function SurfaceLeafPanel({ leaf, usage, onClose }: { leaf: SurfaceLeaf; usage: SurfaceUsage | undefined; onClose: () => void }) {
  const per = usage?.bySpecifier[leaf.specifier] ?? {}
  return (
    <SidePanel icon={Package} label={asI18n(leaf.name)} title={asI18n(leaf.name)} sub={asI18n(leaf.summary)} onClose={onClose}>
      <code dir="ltr" className="font-mono text-px14 break-all">{asI18n(leaf.specifier)}</code>
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
        {leaf.symbols.map((s) => {
          const u = per[s.name]
          return (
            <li key={s.name} className="flex flex-col gap-1.5 py-3">
              <span className="flex flex-wrap items-center gap-2">
                <b className="font-mono text-px15" dir="ltr">{asI18n(s.name)}</b>
                <Badge variant="tag">{asI18n(s.kind)}</Badge>
                {s.deprecated ? <Badge variant="warn">{m.surface__ref_retiring()}</Badge> : null}
              </span>
              {s.summary ? <small className="text-px14 text-ink-2">{asI18n(s.summary)}</small> : null}
              {s.deprecated ? <small className="text-px14 text-warning-ink">{asI18n(s.deprecated)}</small> : null}
              {s.docs ? (
                <details className="text-px14 text-ink-2">
                  <summary className="cursor-pointer font-semibold">{m.surface__ref_docs()}</summary>
                  <p className="mt-1.5 whitespace-pre-wrap">{asI18n(s.docs)}</p>
                </details>
              ) : null}
              {u && u.imports > 0 ? (
                <details className="text-px14 text-ink-2">
                  <summary className="cursor-pointer font-semibold">{m.surface__ref_used({ count: u.imports })}</summary>
                  <ul className="mt-1.5 flex list-none flex-col gap-0.5 p-0">
                    {u.files.map((f) => (
                      <li key={f}><code dir="ltr" className="font-mono text-px13">{asI18n(f)}</code></li>
                    ))}
                  </ul>
                </details>
              ) : usage ? (
                <small className="text-px13 text-muted-foreground">{m.surface__ref_unused()}</small>
              ) : null}
            </li>
          )
        })}
      </ul>
    </SidePanel>
  )
}
