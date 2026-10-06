export type UiUnitKind = 'component' | 'hook' | 'context'

/**
 * One reviewable unit of frontend code. The counts are what a rubric can score
 * without a model reading the file, so the queue ranks the same way every time.
 */
export interface UiEntry {
  uiId: string
  name: string
  unit: UiUnitKind
  sourceFile: string
  bodyStart: number
  bodyEnd: number
  lines: number
  contractHash: string | null
  implementationHash: string | null
  hooks: string[]
  rpcs: string[]
  propCount: number
  jsxDepth: number
  effects: number
  effectsWithoutDeps: number
  conditionalHooks: number
  stateFromProps: number
  fetchInEffect: number
  queriesWithoutError: number
  queriesWithoutPending: number
  mutationsWithoutError: number
  broadInvalidations: number
  hardcodedText: number
  rawNavigations: number
  anyCasts: number
  untypedProps: boolean
}

export type UiMeta = Record<string, UiEntry>

export const LARGE_COMPONENT_LINES = 220
export const HOOK_OVERREACH = 8

export interface UiScoreWeights {
  perLineOver: number
  largeCap: number
  perHookOver: number
  hookCap: number
  perRpc: number
  rpcCap: number
  perEffect: number
  effectWithoutDeps: number
  conditionalHook: number
  stateFromProps: number
  fetchInEffect: number
  queryWithoutError: number
  queryWithoutPending: number
  mutationWithoutError: number
  broadInvalidation: number
  perHardcodedText: number
  hardcodedTextCap: number
  rawNavigation: number
  perAnyCast: number
  anyCastCap: number
  untypedProps: number
  deepJsx: number
  jsxDepthLimit: number
  perPropOver: number
  propLimit: number
  propCap: number
  judgedDecay: number
  changeAdded: number
  changeContract: number
  changeImplementation: number
}

export const DEFAULT_UI_WEIGHTS: UiScoreWeights = {
  perLineOver: 0.12,
  largeCap: 30,
  perHookOver: 4,
  hookCap: 20,
  perRpc: 6,
  rpcCap: 18,
  perEffect: 5,
  effectWithoutDeps: 20,
  conditionalHook: 40,
  stateFromProps: 26,
  fetchInEffect: 24,
  queryWithoutError: 14,
  queryWithoutPending: 9,
  mutationWithoutError: 16,
  broadInvalidation: 18,
  perHardcodedText: 3,
  hardcodedTextCap: 21,
  rawNavigation: 12,
  perAnyCast: 5,
  anyCastCap: 15,
  untypedProps: 10,
  deepJsx: 12,
  jsxDepthLimit: 9,
  perPropOver: 3,
  propLimit: 7,
  propCap: 15,
  judgedDecay: -1000,
  changeAdded: 20,
  changeContract: 26,
  changeImplementation: 10,
}
