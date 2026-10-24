import { m } from '@/i18n/messages'
import { Section } from './Section'
import { Bars, seconds, type MetricsSummary } from '../screens/metrics-shared'

const calls = (n: number) => m.metrics_traffic__calls({ n: Math.round(n) })

/** How many calls came in over the window, and how long they took. */
export function MetricsTraffic({ traffic, from, to }: { traffic: MetricsSummary['traffic']; from: number; to: number }) {
  const requests = traffic.map((b): [number, number] => [b.at, b.requests])
  const speed = traffic.filter((b) => b.requests).map((b): [number, number] => [b.at, b.avgMs])
  return (
    <Section title={m.performance_screen__over_time()} sub={m.metrics_traffic__sub()}>
      <div className="grid gap-4 lg:grid-cols-2" data-testid="metrics-traffic">
        <Bars title={m.metrics_screen__things_asked()} hue="teal" points={requests} from={from} to={to} top={Math.max(1, ...traffic.map((b) => b.requests))} say={calls} />
        <Bars title={m.metrics_screen__how_fast()} hue="petrol" points={speed} from={from} to={to} top={Math.max(1, ...traffic.map((b) => b.avgMs)) * 1.1} say={seconds} />
      </div>
    </Section>
  )
}
