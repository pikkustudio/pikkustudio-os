import { m } from '@/i18n/messages'
import { NextCard } from './NextCard'

/** Nothing ran in the window yet. */
export function MetricsEmpty() {
  return (
    <NextCard label={m.metrics_screen__how_answering()} hue="teal" page="metrics" title={m.metrics_screen__empty_title()} why={m.metrics_screen__empty_text()}>
      <span className="hidden" data-testid="metrics-empty" />
    </NextCard>
  )
}
