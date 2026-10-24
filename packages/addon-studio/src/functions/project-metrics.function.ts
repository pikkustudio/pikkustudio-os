import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectMetricsInput = z.object({
  key: z.string(),
  since: z.number().optional(),
  until: z.number().optional(),
  limit: z.number().optional(),
  kind: z.enum(['invocation', 'process']).optional(),
  run: z.string().optional(),
  wireType: z.string().optional(),
  wireId: z.string().optional(),
  outcome: z.string().optional(),
  httpStatus: z.number().optional(),
  minDurationMs: z.number().optional(),
})

const nullableString = z.string().nullable()
const nullableNumber = z.number().nullable()

export const ProjectMetricsOutput = z.object({
  metrics: z.array(
    z.object({
      id: z.number(),
      at: z.number(),
      run: z.string(),
      source: z.string(),
      kind: z.enum(['invocation', 'process']),
      wireType: nullableString,
      wireId: nullableString,
      trace: nullableString,
      outcome: nullableString,
      durationMs: nullableNumber,
      functionMs: nullableNumber,
      httpMethod: nullableString,
      httpPath: nullableString,
      httpStatus: nullableNumber,
      errorName: nullableString,
      errorMessage: nullableString,
      tenantUserId: nullableString,
      tenantOrgId: nullableString,
      command: nullableString,
      cpuUsageUs: nullableNumber,
      cpuPct: nullableNumber,
      memMb: nullableNumber,
      heapMb: nullableNumber,
      loopLagMs: nullableNumber,
    })
  ),
})

export const projectMetrics = pikkuSessionlessFunc({
  expose: true,
  description: "A project's recent invocation and process metrics, newest first, filterable by kind, run, wire, outcome, status and duration.",
  input: ProjectMetricsInput,
  output: ProjectMetricsOutput,
  func: async ({ studioLogs }, { key, limit, ...query }) => ({
    metrics: await studioLogs.metrics(key, { ...query, limit: Math.min(limit ?? 500, 5000) }),
  }),
})
