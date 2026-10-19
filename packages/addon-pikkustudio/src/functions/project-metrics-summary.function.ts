import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { LOCAL_TARGET, SourceKindSchema, TargetSchema, kindsOf, pickSource, sourceContext } from '../lib/target-sources.js'
import type { Failure, MetricsSummary } from '../services/log-source.js'

export const ProjectMetricsSummaryInput = z.object({
  key: z.string(),
  target: TargetSchema.optional(),
  since: z.number(),
  until: z.number(),
  buckets: z.number().int().min(1).max(200).optional(),
})

export const ProjectMetricsSummaryOutput = z.object({
  totals: z.object({ requests: z.number(), errors: z.number(), avgMs: z.number().nullable(), maxMs: z.number().nullable() }),
  traffic: z.array(z.object({ at: z.number(), requests: z.number(), errors: z.number(), avgMs: z.number(), maxMs: z.number() })),
  functions: z.array(z.object({ name: z.string(), wire: z.string().nullable(), requests: z.number(), errors: z.number(), avgMs: z.number().nullable(), lastRun: z.number().nullable() })),
  failures: z.array(z.object({ functionName: z.string(), wire: z.string().nullable(), message: z.string(), count: z.number(), last: z.number().nullable() })),
  kinds: z.array(SourceKindSchema),
})

type Output = z.infer<typeof ProjectMetricsSummaryOutput>

const FAILURES = 6

export const projectMetricsSummary = pikkuFunc({
  expose: true,
  readonly: true,
  description: 'How a project answered over a time window: totals, traffic over time, each function, and what failed. Works for this computer, a cloud sandbox or a published stage.',
  input: ProjectMetricsSummaryInput,
  output: ProjectMetricsSummaryOutput,
  func: async ({ logSources, metricSources, studioProjects }, { key, target = LOCAL_TARGET, since, until, buckets }, { session }) => {
    const kinds = kindsOf(logSources, metricSources)
    const metrics = pickSource(metricSources, key, target)
    if ('delegate' in metrics) {
      const remote = await studioProjects.workspaceStudio<Output>(key, 'projectMetricsSummary', { target: LOCAL_TARGET, since, until, buckets })
      return remote ? { ...remote, kinds } : { totals: { requests: 0, errors: 0, avgMs: null, maxMs: null }, traffic: [], functions: [], failures: [], kinds }
    }
    const ctx = await sourceContext(studioProjects, key, target, session)
    const logs = logSources?.[metrics.kind]
    const [summary, failures]: [MetricsSummary, Failure[]] = await Promise.all([metrics.source.summary(ctx, { since, until, buckets }), logs ? logs.failures(ctx, { since, limit: FAILURES }) : Promise.resolve([])])
    return { ...summary, failures, kinds }
  },
})
