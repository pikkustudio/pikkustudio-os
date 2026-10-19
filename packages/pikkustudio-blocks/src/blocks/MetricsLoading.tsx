import { m } from '@/i18n/messages'
import type { I18nString } from '@pikku/react'
import { NextCard } from './NextCard'

/** While the first numbers load. */
export function MetricsLoading({ why }: { why: I18nString }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3.5">
      <NextCard label={m.metrics_screen__how_answering()} hue="teal" page="metrics" title={m.metrics_screen__loading_title()} why={why} />
      <div className="h-40 animate-pulse rounded-card border border-border bg-secondary" />
    </div>
  )
}
