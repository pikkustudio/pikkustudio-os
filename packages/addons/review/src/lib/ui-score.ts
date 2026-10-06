import {
  DEFAULT_UI_WEIGHTS,
  HOOK_OVERREACH,
  LARGE_COMPONENT_LINES,
  type UiEntry,
  type UiMeta,
  type UiScoreWeights,
} from './ui-types.js'
import { verdictKeyFor } from './score.js'
import type { Candidate, ChangeKind, ScoreComponent, TargetKind, VerdictKind } from './types.js'

const TARGET_KIND: Record<UiEntry['unit'], TargetKind> = {
  component: 'component',
  hook: 'hook',
  context: 'context',
}

export const uiComponentsFor = (entry: UiEntry, w: UiScoreWeights): ScoreComponent[] => {
  const out: ScoreComponent[] = []
  const push = (label: string, points: number) => {
    if (points !== 0) out.push({ label, points: Math.round(points * 10) / 10 })
  }

  const over = Math.max(entry.lines - LARGE_COMPONENT_LINES, 0)
  push(`${entry.lines} lines`, Math.min(over * w.perLineOver, w.largeCap))

  const hooksOver = Math.max(entry.hooks.length - HOOK_OVERREACH, 0)
  push(`hooks ×${entry.hooks.length}`, Math.min(hooksOver * w.perHookOver, w.hookCap))

  push(`rpcs ×${entry.rpcs.length}`, Math.min(entry.rpcs.length * w.perRpc, w.rpcCap))
  push(`effects ×${entry.effects}`, entry.effects * w.perEffect)
  push(
    `effects without deps ×${entry.effectsWithoutDeps}`,
    entry.effectsWithoutDeps * w.effectWithoutDeps,
  )
  push(`conditional hooks ×${entry.conditionalHooks}`, entry.conditionalHooks * w.conditionalHook)
  push(`state from props ×${entry.stateFromProps}`, entry.stateFromProps * w.stateFromProps)
  push(`fetch in effect ×${entry.fetchInEffect}`, entry.fetchInEffect * w.fetchInEffect)
  push(
    `queries without error ×${entry.queriesWithoutError}`,
    entry.queriesWithoutError * w.queryWithoutError,
  )
  push(
    `queries without pending ×${entry.queriesWithoutPending}`,
    entry.queriesWithoutPending * w.queryWithoutPending,
  )
  push(
    `mutations without error ×${entry.mutationsWithoutError}`,
    entry.mutationsWithoutError * w.mutationWithoutError,
  )
  push(
    `broad invalidations ×${entry.broadInvalidations}`,
    entry.broadInvalidations * w.broadInvalidation,
  )
  push(
    `hardcoded copy ×${entry.hardcodedText}`,
    Math.min(entry.hardcodedText * w.perHardcodedText, w.hardcodedTextCap),
  )
  push(`raw navigation ×${entry.rawNavigations}`, entry.rawNavigations * w.rawNavigation)
  push(`any casts ×${entry.anyCasts}`, Math.min(entry.anyCasts * w.perAnyCast, w.anyCastCap))
  if (entry.untypedProps) push('untyped props', w.untypedProps)
  if (entry.jsxDepth > w.jsxDepthLimit) push(`jsx depth ${entry.jsxDepth}`, w.deepJsx)

  const propsOver = Math.max(entry.propCount - w.propLimit, 0)
  push(`props ×${entry.propCount}`, Math.min(propsOver * w.perPropOver, w.propCap))

  return out
}

/**
 * Three at most, same as the function queue: a picker that also offers "keep"
 * has four slots, and a list long enough to read is a list nobody reads.
 */
export const uiSuggestedReasonsFor = (entry: UiEntry): string[] => {
  const suggested: string[] = []

  if (entry.conditionalHooks > 0) suggested.push('conditional-hook')
  if (entry.effectsWithoutDeps > 0) suggested.push('effect-without-deps')
  if (entry.stateFromProps > 0) suggested.push('state-from-props')
  if (entry.fetchInEffect > 0) suggested.push('fetch-in-effect')
  if (entry.broadInvalidations > 0) suggested.push('broad-invalidation')
  if (entry.mutationsWithoutError > 0) suggested.push('unhandled-mutation')
  if (entry.queriesWithoutError > 0) suggested.push('no-error-state')
  if (entry.queriesWithoutPending > 0) suggested.push('no-loading-state')
  if (entry.untypedProps) suggested.push('untyped-props')
  if (entry.hardcodedText > 0) suggested.push('hardcoded-copy')
  if (entry.rawNavigations > 0) suggested.push('raw-navigation')
  if (entry.lines > LARGE_COMPONENT_LINES) suggested.push('component-too-large')
  if (entry.rpcs.length > 0 && entry.jsxDepth > 6) suggested.push('mixed-concerns')

  return suggested.slice(0, 3)
}

export interface UiDiff {
  added: Set<string>
  contract: Set<string>
  implementation: Set<string>
}

export const diffUiMeta = (next: UiMeta, prev: UiMeta): UiDiff => {
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

  return { added, contract, implementation }
}

const changeOf = (id: string, d: UiDiff): ChangeKind | null => {
  if (d.added.has(id)) return 'added'
  if (d.contract.has(id)) return 'contract'
  if (d.implementation.has(id)) return 'implementation'
  return null
}

export interface RankUiOptions {
  weights?: Partial<UiScoreWeights>
  projectId?: string | null
  judged?: Map<string, VerdictKind>
  commentCounts?: Map<string, number>
  changedSince?: UiMeta
}

export const rankUi = (meta: UiMeta, options: RankUiOptions = {}): Candidate[] => {
  const w = { ...DEFAULT_UI_WEIGHTS, ...options.weights }
  const judged = options.judged ?? new Map<string, VerdictKind>()
  const d = options.changedSince ? diffUiMeta(meta, options.changedSince) : null

  const out: Candidate[] = []
  for (const [id, entry] of Object.entries(meta)) {
    const change = d ? changeOf(id, d) : null
    if (d && !change) continue

    const components = uiComponentsFor(entry, w)
    if (change === 'added') components.push({ label: 'added', points: w.changeAdded })
    if (change === 'contract') components.push({ label: 'props moved', points: w.changeContract })
    if (change === 'implementation') {
      components.push({ label: 'body rewritten', points: w.changeImplementation })
    }

    const targetKind = TARGET_KIND[entry.unit]
    const key = verdictKeyFor({
      projectId: options.projectId ?? null,
      targetKind,
      targetId: entry.uiId,
      implementationHash: entry.implementationHash,
    })

    const judgedAs = judged.get(key) ?? null
    let score = components.reduce((n, c) => n + c.points, 0)
    if (judgedAs) score += w.judgedDecay

    out.push({
      clusterId: entry.uiId,
      targetKind,
      pikkuFuncId: entry.uiId,
      name: entry.name,
      sourceFile: entry.sourceFile,
      bodyStart: entry.bodyStart,
      bodyEnd: entry.bodyEnd,
      contractHash: entry.contractHash,
      implementationHash: entry.implementationHash,
      services: [],
      wires: [],
      change,
      score: Math.round(score * 10) / 10,
      components,
      clusterSize: 1,
      members: [entry.uiId],
      suggestedReasons: uiSuggestedReasonsFor(entry),
      judgedAs,
      commentCount: options.commentCounts?.get(entry.uiId) ?? 0,
      ui: {
        unit: entry.unit,
        lines: entry.lines,
        hooks: entry.hooks,
        rpcs: entry.rpcs,
      },
    })
  }

  return out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}
