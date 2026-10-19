import type { PanelId } from '../screens/OnboardingLayout'
import type { Copy } from './copy'
import type { ReleaseDetail, ReleaseGroup, ReleasesView } from './releases'
import type { StageSettings } from './projectSecrets'
import { createContext, useContext } from 'react'

export type Open = (panel: PanelId | '') => void

export type LiveTraffic = { at: number; requests: number; errors: number; avgMs: number; maxMs: number }
export type LiveFunction = { name: string; requests: number; errors: number; avgMs: number | null; lastRun: number | null }
export type LiveMetrics = {
  /** The target name of the published site, or null where nothing is published. */
  site: string | null
  found: boolean
  published: boolean
  publishing: boolean
  isPending: boolean
  error: unknown
  isFetching: boolean
  retry: () => void
  traffic: LiveTraffic[]
  functions: LiveFunction[]
  slowHits: number
  slowLimitMs: number
}

export type AnalyticsEventCount = { total: number; signedIn: number; series: { day: string; count: number }[] }
export type AnalyticsEventCounts = {
  /** By event name; an event missing here never fired in the window. */
  counts: Record<string, AnalyticsEventCount>
  isPending: boolean
  error: unknown
  isFetching: boolean
  retry: () => void
}

// What is left of the old host slots: hooks the screens call, which move to backend sources keyed by target kind.
// Component slots are declared in ../studio.slots.ts.
export type Slots = {
  /** Wording a host replaces; anything left out reads neutral. */
  copy?: Partial<Copy>
  /** Requests and speed of a published copy for the Performance screen, by target name; null asks only where the site is. Logs and Metrics read contributed sources instead. A hook, called every render. */
  useLiveMetrics?: (name: string | null, hours: number) => LiveMetrics
  /** How often each analytics event fired on a published copy over the last days; null when that copy is not published. A hook, called every render. */
  useAnalyticsEventCounts?: (stageName: string | null, days: number) => AnalyticsEventCounts | null
  useReleases?: (projectKey: string) => ReleasesView
  useReleaseDetail?: (projectKey: string, id: string, wanted: boolean) => ReleaseDetail
  /** The published copy's secrets and settings; null when the open copy is not a published one. A hook, called every render. */
  useStageSettings?: (projectKey: string, settingIds: string[]) => StageSettings | null
  /** What the next publish would change against what is live; null when unknown or nothing deploys. A hook, called every render. */
  useReleasePreview?: (projectKey: string) => ReleaseGroup[] | null
  useLiveUpdates?: (queryKeys: readonly string[]) => void
}

export const SlotsCtx = createContext<Slots>({})
export const useSlots = () => useContext(SlotsCtx)
