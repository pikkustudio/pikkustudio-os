import { m } from '@/i18n/messages'
import { NextCard } from './NextCard'
import { AskPikku } from './AskPikku'
import { seconds } from '../screens/metrics-shared'

/** Calls the host cut off for running too long, with a way to ask Pikku to speed them up. */
export function MetricsSlowCalls({ hits, limitMs, names }: { hits: number; limitMs: number; names: string[] }) {
  return (
    <NextCard label={m.metrics_screen__how_answering()} hue="petrol" page="metrics" title={m.metrics_live__perf_verdict_cut()} why={m.metrics_live__perf_detail_cut({ count: hits, limit: seconds(limitMs) })}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="metrics-slow-calls">
        <AskPikku label={m.metrics_live__perf_fix()} prompt={m.metrics_live__perf_fix_prompt({ count: hits, limit: seconds(limitMs), names: names.slice(0, 3).join(', ') })} size="page" />
      </div>
    </NextCard>
  )
}
