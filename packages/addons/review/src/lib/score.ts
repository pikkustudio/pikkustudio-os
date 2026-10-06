import {
  DEFAULT_WEIGHTS,
  PLUMBING_SERVICES,
  SERVICES_OVERREACH,
  type Candidate,
  type ChangeKind,
  type ScoreComponent,
  type ScoreWeights,
  type VerdictKind,
} from './types.js'
import type { RuntimeSignal } from '../services/runtime-signals.interface.js'

type MetaEntry = Record<string, any>
type FunctionsMeta = Record<string, MetaEntry>

export const isReviewable = (id: string, meta: MetaEntry): boolean => {
  if (meta.functionType && meta.functionType !== 'user') return false
  if (!meta.sourceFile) return false
  if (meta.sourceFile.endsWith('.gen.ts')) return false
  if (meta.services && meta.services.optimized === false) return false
  if (meta.scenario) return false
  return true
}

export const clusterIdFor = (id: string, meta: MetaEntry): string =>
  meta.contractHash ?? `${meta.inputHash ?? 'x'}:${meta.outputHash ?? 'x'}:${meta.name ?? id}`

const servicesOf = (meta: MetaEntry): string[] => meta.services?.services ?? []
const wiresOf = (meta: MetaEntry): string[] => meta.wires?.wires ?? []

export const componentsFor = (
  meta: MetaEntry,
  clusterSize: number,
  w: ScoreWeights,
): ScoreComponent[] => {
  const out: ScoreComponent[] = []
  const push = (label: string, points: number) => {
    if (points !== 0) out.push({ label, points })
  }

  const services = servicesOf(meta)
  const wires = wiresOf(meta)
  const scopes: string[] = meta.scopes ?? []
  const permissions: unknown[] = meta.permissions ?? []
  const middleware: unknown[] = meta.middleware ?? []

  push(`services ×${services.length}`, Math.min(services.length, w.serviceCap) * w.perService)
  push(`wires ×${wires.length}`, wires.length * w.perWire)
  if (meta.workflowQueued) push('workflowQueued', w.workflowQueued)
  if (meta.workflowRetries) push(`retries ${meta.workflowRetries}`, w.workflowRetries)
  if (meta.workflowTimeout) push(`timeout ${meta.workflowTimeout}`, w.workflowTimeout)
  if (meta.scenarioStep) push('scenarioStep', w.scenarioStep)
  if (meta.mcp) push('mcp', w.mcp)
  if (meta.deploy === 'server') push('deploy server', w.deployServer)
  push(`scopes ×${scopes.length}`, scopes.length * w.perScope)
  push(`permissions ×${permissions.length}`, permissions.length * w.perPermission)
  if (meta.permissionsInBody) push('permissionsInBody', w.permissionsInBody)
  if (meta.audit) push('audit', w.audit)
  push(`middleware ×${middleware.length}`, middleware.length * w.perMiddleware)

  const open = meta.sessionless && scopes.length === 0 && !meta.auth && !meta.permissionsInBody
  if (open && meta.expose) push('open surface', w.openSurface)

  const plumbing = services.length > 0 && services.every((s) => PLUMBING_SERVICES.has(s))
  if (plumbing && wires.length === 0) push('plumbing only', w.plumbingPenalty)

  push(`cluster ×${clusterSize}`, Math.min((clusterSize - 1) * w.perExtraInstance, w.clusterCap))

  return out
}

/**
 * The reject reasons this candidate could plausibly earn, derived from the same
 * inputs the score is, not by parsing its labels. Three at most: a picker that
 * also offers "keep" has four slots, and a list long enough to read is a list
 * nobody reads.
 */
export const suggestedReasonsFor = (
  meta: MetaEntry,
  clusterSize: number,
  signal: RuntimeSignal | undefined,
): string[] => {
  const services = servicesOf(meta)
  const wires = wiresOf(meta)
  const scopes: string[] = meta.scopes ?? []
  const suggested: string[] = []

  const open = meta.sessionless && scopes.length === 0 && !meta.auth && !meta.permissionsInBody
  if (open && meta.expose) suggested.push('open-surface')
  if (meta.permissionsInBody) suggested.push('permissions-in-body')
  if (!meta.outputSchemaName) suggested.push('untyped-output')

  const plumbing = services.length > 0 && services.every((s) => PLUMBING_SERVICES.has(s))
  if (plumbing && wires.length === 0) suggested.push('plumbing-only')
  if (services.length > SERVICES_OVERREACH) suggested.push('services-overreach')
  if (clusterSize > 1) suggested.push('duplicated-logic')

  if (signal && signal.requests > 0) {
    if (signal.errors > 0) suggested.push('swallowed-error')
    if (signal.avgDurationMs !== null && signal.avgDurationMs > DEFAULT_WEIGHTS.slowMs) {
      suggested.push('blocking-work')
    }
  }

  return suggested.slice(0, 3)
}

export interface MetaDiff {
  added: Set<string>
  contract: Set<string>
  implementation: Set<string>
  removed: string[]
}

/**
 * Semantic diff of two meta blobs. `contract` means the interface moved;
 * `implementation` means only the body did. Nothing textual survives here,
 * so reformatting and moved files produce an empty diff.
 */
export const diffMeta = (next: FunctionsMeta, prev: FunctionsMeta): MetaDiff => {
  const added = new Set<string>()
  const contract = new Set<string>()
  const implementation = new Set<string>()

  for (const [id, entry] of Object.entries(next)) {
    const before = prev[id]
    if (!before) {
      added.add(id)
      continue
    }
    if ((before.contractHash ?? null) !== (entry.contractHash ?? null)) {
      contract.add(id)
      continue
    }
    if ((before.implementationHash ?? null) !== (entry.implementationHash ?? null)) {
      implementation.add(id)
    }
  }

  const removed = Object.keys(prev).filter((id) => !next[id])
  return { added, contract, implementation, removed }
}

const changeOf = (id: string, d: MetaDiff): ChangeKind | null => {
  if (d.added.has(id)) return 'added'
  if (d.contract.has(id)) return 'contract'
  if (d.implementation.has(id)) return 'implementation'
  return null
}

/**
 * The key a verdict is filed under. Matches the store's identity — target plus
 * the version read — so a body rewrite reopens the question rather than
 * inheriting the old answer.
 */
export const verdictKeyFor = (target: {
  projectId: string | null
  targetKind: string
  targetId: string
  implementationHash: string | null
}): string =>
  [
    target.projectId ?? 'platform',
    target.targetKind,
    target.targetId,
    target.implementationHash ?? 'unversioned',
  ].join('\u0000')

export interface RankOptions {
  weights?: Partial<ScoreWeights>
  projectId?: string | null
  judged?: Map<string, VerdictKind>
  commentCounts?: Map<string, number>
  changedSince?: FunctionsMeta
  signals?: Record<string, RuntimeSignal>
}

/**
 * Runtime evidence outranks the static guess. A function nothing has ever run
 * is discounted rather than excluded — it may simply be new.
 */
const signalComponents = (signal: RuntimeSignal | undefined, w: ScoreWeights): ScoreComponent[] => {
  if (!signal) return []
  if (signal.requests === 0) {
    return [{ label: 'never run', points: w.neverRun }]
  }

  const components: ScoreComponent[] = []
  const errorRate = (signal.errors / signal.requests) * 100
  if (errorRate > 0) {
    components.push({
      label: `errors ${errorRate.toFixed(1)}%`,
      points: Math.min(Math.round(errorRate * w.perErrorRatePoint), w.errorRateCap),
    })
  }
  if (signal.avgDurationMs !== null && signal.avgDurationMs > w.slowMs) {
    const over = signal.avgDurationMs / w.slowMs
    components.push({
      label: `slow ${Math.round(signal.avgDurationMs)}ms`,
      points: Math.min(Math.round(over * 6), w.slowCap),
    })
  }
  return components
}

export const rank = (meta: FunctionsMeta, options: RankOptions = {}): Candidate[] => {
  const w = { ...DEFAULT_WEIGHTS, ...options.weights }
  const judged = options.judged ?? new Map<string, VerdictKind>()
  const d = options.changedSince ? diffMeta(meta, options.changedSince) : null

  const clusters = new Map<string, Array<[string, MetaEntry]>>()
  for (const [id, entry] of Object.entries(meta)) {
    if (!isReviewable(id, entry)) continue
    if (d && !changeOf(id, d)) continue
    const cid = clusterIdFor(id, entry)
    const bucket = clusters.get(cid)
    if (bucket) bucket.push([id, entry])
    else clusters.set(cid, [[id, entry]])
  }

  const out: Candidate[] = []
  for (const [clusterId, members] of clusters) {
    const [id, entry] = members
      .slice()
      .sort((a, b) => servicesOf(b[1]).length - servicesOf(a[1]).length)[0]!

    const components = componentsFor(entry, members.length, w)
    const change = d ? changeOf(id, d) : null
    if (change === 'added') components.push({ label: 'added', points: w.changeAdded })
    if (change === 'contract')
      components.push({ label: 'contract moved', points: w.changeContract })
    if (change === 'implementation') {
      components.push({ label: 'body rewritten', points: w.changeImplementation })
    }

    const key = verdictKeyFor({
      projectId: options.projectId ?? null,
      targetKind: 'function',
      targetId: entry.pikkuFuncId ?? id,
      implementationHash: entry.implementationHash ?? null,
    })

    for (const component of signalComponents(options.signals?.[id], w)) {
      components.push(component)
    }

    const judgedAs = judged.get(key) ?? null
    let score = components.reduce((n, c) => n + c.points, 0)
    if (judgedAs) score += w.judgedDecay

    out.push({
      clusterId,
      targetKind: 'function',
      pikkuFuncId: entry.pikkuFuncId ?? id,
      name: entry.name ?? id,
      sourceFile: entry.sourceFile,
      bodyStart: entry.bodyStart ?? 0,
      bodyEnd: entry.bodyEnd ?? 0,
      contractHash: entry.contractHash ?? null,
      implementationHash: entry.implementationHash ?? null,
      services: servicesOf(entry),
      wires: wiresOf(entry),
      change,
      score,
      components,
      clusterSize: members.length,
      members: members.map(([memberId]) => memberId),
      suggestedReasons: suggestedReasonsFor(entry, members.length, options.signals?.[id]),
      judgedAs,
      commentCount: options.commentCounts?.get(entry.pikkuFuncId ?? id) ?? 0,
      ui: null,
    })
  }

  return out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}
