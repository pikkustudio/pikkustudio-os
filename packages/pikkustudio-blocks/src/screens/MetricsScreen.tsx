import { m } from '@/i18n/messages'
import { useMemo } from 'react'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { TargetSwitch } from '../blocks/TargetSwitch'
import { MetricsVerdict } from '../blocks/MetricsVerdict'
import { MetricsTraffic } from '../blocks/MetricsTraffic'
import { MetricsFunctions } from '../blocks/MetricsFunctions'
import { MetricsFailures } from '../blocks/MetricsFailures'
import { MetricsError } from '../blocks/MetricsError'
import { MetricsLoading } from '../blocks/MetricsLoading'
import { MetricsEmpty } from '../blocks/MetricsEmpty'
import { MetricsColumns } from '../blocks/MetricsColumns'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { LOCAL_WORKSPACE, useProjectTarget } from '../lib/project-target'
import { AnalyticsEvents } from './metrics-live'
import { BARS, kept, problemsOf, slowestOf, useMetricsWindow, type MetricsSummary } from './metrics-shared'

export const StudioMetricsScreen = () => <MetricsScreen scope="studio" />

/** How the project answered, for whichever copy is open: this computer, a cloud sandbox or a published stage. */
export function MetricsScreen({ scope = 'app' }: { scope?: 'app' | 'studio' }) {
  const projectKey = useProjectKey()
  const key = scope === 'studio' ? 'studio' : projectKey
  const project = useProjectTarget()
  const target = scope === 'studio' ? { kind: 'workspace' as const, name: LOCAL_WORKSPACE } : { kind: project.kind, name: project.name }
  const remote = target.kind === 'stage' || target.name !== LOCAL_WORKSPACE
  const { range, setRange, from, to, options } = useMetricsWindow(remote)
  const summary = usePikkuQuery('studio:projectMetricsSummary', { key, target, since: from, until: to, buckets: BARS }, { enabled: !!key, placeholderData: kept } as never)
  const data = summary.data as MetricsSummary | undefined
  const problems = useMemo(() => problemsOf(data?.failures ?? []), [data])
  const slow = useMemo(() => slowestOf(data?.functions ?? []), [data])

  return (
    <Page gap="snug">
      <PageHead crumb={scope === 'studio' ? m.metrics_screen__crumb_studio() : m.metrics_screen__crumb_app()} title={scope === 'studio' ? m.metrics_screen__title_studio() : m.metrics_screen__title_app()} text={scope === 'studio' ? m.metrics_screen__text_studio() : m.metrics_screen__text_app()} size="lead" developerDetails>
        {scope === 'app' ? <TargetSwitch /> : null}
        <Segmented label={m.metrics_screen__time_range()} value={range} options={options} onChange={setRange} />
      </PageHead>

      {summary.isError ? (
        <MetricsError error={summary.error} retry={() => void summary.refetch()} retrying={summary.isFetching} />
      ) : summary.isPending || !data ? (
        <MetricsLoading why={scope === 'studio' ? m.metrics_screen__text_studio() : m.metrics_screen__text_app()} />
      ) : !data.totals.requests ? (
        <MetricsEmpty />
      ) : (
        <>
          <MetricsVerdict scope={scope} totals={data.totals} problems={problems} />
          <MetricsTraffic traffic={data.traffic} from={from} to={to} />
          <MetricsColumns>
            <MetricsFunctions scope={scope} slow={slow} />
            <MetricsFailures scope={scope} problems={problems} />
          </MetricsColumns>
        </>
      )}
      {scope === 'app' ? <AnalyticsEvents stage={target.kind === 'stage' ? target.name : undefined} /> : null}
    </Page>
  )
}
