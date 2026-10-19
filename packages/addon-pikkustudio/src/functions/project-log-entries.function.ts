import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { LOCAL_TARGET, SourceKindSchema, TargetSchema, kindsOf, pickSource, sourceContext } from '../lib/target-sources.js'
import type { LogLine } from '../services/log-source.js'

const Level = z.enum(['error', 'warn', 'info'])

export const ProjectLogEntriesInput = z.object({
  key: z.string(),
  target: TargetSchema.optional(),
  since: z.string().optional(),
  limit: z.number().int().min(1).max(2000).optional(),
  level: Level.optional(),
  search: z.string().optional(),
  functionName: z.string().optional(),
  traceId: z.string().optional(),
  tenantOrgId: z.string().optional(),
  tenantUserId: z.string().optional(),
})

export const LogLineSchema = z.object({
  timestamp: z.string(),
  level: Level,
  source: z.string().optional(),
  functionName: z.string(),
  message: z.string(),
  traceId: z.string().optional(),
  tenantOrgId: z.string().nullable().optional(),
  tenantUserId: z.string().nullable().optional(),
  wire: z.string().nullable(),
  ms: z.number().nullable(),
})

export const ProjectLogEntriesOutput = z.object({
  logs: z.array(LogLineSchema),
  kinds: z.array(SourceKindSchema),
})

type Output = z.infer<typeof ProjectLogEntriesOutput>
type OlderOutput = { entries?: { at: number; level: LogLine['level']; source: string; wire: string | null; fn: string | null; ms: number | null; trace: string | null; text: string }[] }

const fromOlder = (out: Output | OlderOutput | null): LogLine[] =>
  !out ? [] : 'logs' in out ? out.logs : (out.entries ?? []).map((e) => ({ timestamp: new Date(e.at).toISOString(), level: e.level, source: e.source, functionName: e.fn ?? '', message: e.text, traceId: e.trace ?? undefined, wire: e.wire, ms: e.ms }))

export const projectLogEntries = pikkuFunc({
  expose: true,
  readonly: true,
  description: "A project's recent log lines, newest first, from this computer, a cloud sandbox or a published stage. Filter by level, text, function, trace or tenant.",
  input: ProjectLogEntriesInput,
  output: ProjectLogEntriesOutput,
  func: async ({ logSources, metricSources, studioProjects }, { key, target = LOCAL_TARGET, ...query }, { session }) => {
    const kinds = kindsOf(logSources, metricSources)
    const picked = pickSource(logSources, key, target)
    if ('delegate' in picked) return { logs: fromOlder(await studioProjects.workspaceStudio<Output | OlderOutput>(key, 'projectLogEntries', { ...query, target: LOCAL_TARGET, since: query.since })), kinds }
    const ctx = await sourceContext(studioProjects, key, target, session)
    return { logs: await picked.source.list(ctx, { ...query, limit: Math.min(query.limit ?? 500, 2000) }), kinds }
  },
})
