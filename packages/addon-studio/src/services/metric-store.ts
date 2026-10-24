export type MetricKind = 'invocation' | 'process'

export interface MetricEntry {
  id: number
  at: number
  run: string
  source: string
  kind: MetricKind
  wireType: string | null
  wireId: string | null
  trace: string | null
  outcome: string | null
  durationMs: number | null
  functionMs: number | null
  httpMethod: string | null
  httpPath: string | null
  httpStatus: number | null
  errorName: string | null
  errorMessage: string | null
  tenantUserId: string | null
  tenantOrgId: string | null
  command: string | null
  cpuUsageUs: number | null
  cpuPct: number | null
  memMb: number | null
  heapMb: number | null
  loopLagMs: number | null
}

export type NewMetricEntry = Omit<MetricEntry, 'id'>

export interface MetricQuery {
  since?: number
  until?: number
  limit?: number
  kind?: MetricKind
  run?: string
  wireType?: string
  wireId?: string
  outcome?: string
  httpStatus?: number
  minDurationMs?: number
}

const COLUMNS: Record<keyof NewMetricEntry, string> = {
  at: 'at',
  run: 'run',
  source: 'source',
  kind: 'kind',
  wireType: 'wire_type',
  wireId: 'wire_id',
  trace: 'trace',
  outcome: 'outcome',
  durationMs: 'duration_ms',
  functionMs: 'function_ms',
  httpMethod: 'http_method',
  httpPath: 'http_path',
  httpStatus: 'http_status',
  errorName: 'error_name',
  errorMessage: 'error_message',
  tenantUserId: 'tenant_user_id',
  tenantOrgId: 'tenant_org_id',
  command: 'command',
  cpuUsageUs: 'cpu_usage_us',
  cpuPct: 'cpu_pct',
  memMb: 'mem_mb',
  heapMb: 'heap_mb',
  loopLagMs: 'loop_lag_ms',
}

const NUMERIC = new Set(['at', 'durationMs', 'functionMs', 'httpStatus', 'cpuUsageUs', 'cpuPct', 'memMb', 'heapMb', 'loopLagMs'])

export const metricColumns = COLUMNS

export const metricRow = (key: string, entry: NewMetricEntry) => ({
  project_id: key,
  ...Object.fromEntries((Object.keys(COLUMNS) as (keyof NewMetricEntry)[]).map((field) => [COLUMNS[field], entry[field]])),
})

export const metricFromRow = (row: Record<string, unknown>): MetricEntry => {
  const camel = (column: string) => column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  const read = (column: string) => row[column] ?? row[camel(column)] ?? null
  const entry: Record<string, unknown> = { id: Number(read('metric_id')) }
  for (const [field, column] of Object.entries(COLUMNS)) {
    const value = read(column)
    entry[field] = value === null ? null : NUMERIC.has(field) ? Number(value) : value
  }
  entry.at = Number(read('at'))
  return entry as unknown as MetricEntry
}

export const matchesMetric = (entry: MetricEntry, q: MetricQuery) =>
  (q.since === undefined || entry.at >= q.since) &&
  (q.until === undefined || entry.at <= q.until) &&
  (q.kind === undefined || entry.kind === q.kind) &&
  (q.run === undefined || entry.run === q.run) &&
  (q.wireType === undefined || entry.wireType === q.wireType) &&
  (q.wireId === undefined || entry.wireId === q.wireId) &&
  (q.outcome === undefined || entry.outcome === q.outcome) &&
  (q.httpStatus === undefined || entry.httpStatus === q.httpStatus) &&
  (q.minDurationMs === undefined || (entry.durationMs ?? 0) >= q.minDurationMs)

const pick = (o: Record<string, unknown>, ...names: string[]) => names.map((n) => o[n]).find((v) => v !== undefined && v !== null)

const str = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v))

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

const whole = (v: unknown) => {
  const n = num(v)
  return n === null ? null : Math.round(n)
}

const timeOf = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN
  if (!Number.isFinite(n)) return fallback
  return n > 1e14 ? Math.round(n / 1000) : n < 1e11 ? n * 1000 : n
}

export const parseMetricLine = (line: string, run: string, source: string, at: number): NewMetricEntry | null => {
  if (line[0] !== '{' || !line.includes('__pikku_telemetry')) return null
  let o: Record<string, unknown>
  try {
    o = JSON.parse(line)
  } catch {
    return null
  }
  if (!o || typeof o !== 'object' || Array.isArray(o) || !o.__pikku_telemetry) return null
  const kind: MetricKind = o.type === 'process' ? 'process' : 'invocation'
  return {
    at: timeOf(pick(o, '_timestamp', 'time', 'timestamp', 'ts', 'at'), at),
    run,
    source,
    kind,
    wireType: str(pick(o, 'wiretype', 'wireType')),
    wireId: str(pick(o, 'wireid', 'wireId')),
    trace: str(pick(o, 'traceid', 'traceId')),
    outcome: str(o.outcome),
    durationMs: whole(pick(o, 'totalduration', 'totalDuration')),
    functionMs: whole(pick(o, 'functionduration', 'functionDuration')),
    httpMethod: str(pick(o, 'httpmethod', 'httpMethod', 'method')),
    httpPath: str(pick(o, 'httppath', 'httpPath', 'path')),
    httpStatus: whole(pick(o, 'httpstatus', 'httpStatus')),
    errorName: str(pick(o, 'errorname', 'errorName')),
    errorMessage: str(pick(o, 'errormessage', 'errorMessage')),
    tenantUserId: str(pick(o, 'tenantuserid', 'pikkuuserid', 'pikkuUserId')),
    tenantOrgId: str(pick(o, 'tenantorgid', 'orgid')),
    command: str(o.command),
    cpuUsageUs: whole(pick(o, 'cpuusageusec', 'cpuUsageUsec')),
    cpuPct: num(pick(o, 'cpupct', 'cpuPct')),
    memMb: num(pick(o, 'memmb', 'memMb')),
    heapMb: num(pick(o, 'heapmb', 'heapMb')),
    loopLagMs: num(pick(o, 'looplagms', 'loopLagMs')),
  }
}
