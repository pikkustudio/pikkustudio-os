import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { LOCAL_TARGET, SourceKindSchema, TargetSchema, kindsOf, pickSource, sourceContext } from '../lib/target-sources.js'
import { facetsOf, type LogFacets, type LogLine } from '../services/log-source.js'

const Level = z.enum(['error', 'warn', 'info'])

export const ProjectLogEntriesInput = z.object({
  key: z.string(),
  target: TargetSchema.optional(),
  since: z.string().optional(),
  minutes: z.number().int().min(1).max(43200).optional(),
  limit: z.number().int().min(1).max(2000).optional(),
  level: Level.optional(),
  search: z.string().optional(),
  wire: z.string().optional(),
  source: z.enum(['server', 'website']).optional(),
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

export const LogFacetsSchema = z.object({
  levels: z.object({ error: z.number(), warn: z.number(), info: z.number() }),
  functions: z.array(z.string()),
  wires: z.array(z.string()),
})

export const ProjectLogEntriesOutput = z.object({
  logs: z.array(LogLineSchema),
  facets: LogFacetsSchema,
  kinds: z.array(SourceKindSchema),
})

type Output = z.infer<typeof ProjectLogEntriesOutput>
type OlderOutput = { facets?: LogFacets; entries?: { at: number; level: LogLine['level']; source: string; wire: string | null; fn: string | null; ms: number | null; trace: string | null; text: string }[] }

const fromOlder = (out: Output | OlderOutput | null): LogLine[] =>
  !out ? [] : 'logs' in out ? out.logs : (out.entries ?? []).map((e) => ({ timestamp: new Date(e.at).toISOString(), level: e.level, source: e.source, functionName: e.fn ?? '', message: e.text, traceId: e.trace ?? undefined, wire: e.wire, ms: e.ms }))

export const projectLogEntries = pikkuFunc({
  expose: true,
  readonly: true,
  description: "A project's recent log lines, newest first, from this computer, a cloud sandbox or a published stage. Filter by level, text, function, wire, source, trace or tenant; facets count what each filter can be set to over the same window.",
  input: ProjectLogEntriesInput,
  output: ProjectLogEntriesOutput,
  func: async ({ logSources, metricSources, studioProjects }, { key, target = LOCAL_TARGET, minutes, ...query }, { session }) => {
    const kinds = kindsOf(logSources, metricSources)
    const since = minutes ? new Date(Date.now() - minutes * 60_000).toISOString() : query.since
    const filters = { ...query, since }
    const picked = pickSource(logSources, key, target)
    // The project's own workspace answers first; a contributed source only when that workspace can't.
    const source = 'delegate' in picked ? picked.fallback : picked.source
    if ('delegate' in picked || !source) {
      const out = await studioProjects.workspaceStudio<Output | OlderOutput>(key, 'projectLogEntries', { ...filters, target: LOCAL_TARGET })
      if (out || !source) {
        const logs = fromOlder(out)
        return { logs, facets: out?.facets ?? facetsOf(logs), kinds }
      }
    }
    const ctx = await sourceContext(studioProjects, key, target, session)
    const [logs, facets] = await Promise.all([
      source.list(ctx, { ...filters, limit: Math.min(query.limit ?? 500, 2000) }),
      source.facets ? source.facets(ctx, { since }) : source.list(ctx, { since, limit: 2000 }).then(facetsOf),
    ])
    return { logs, facets, kinds }
  },
})
