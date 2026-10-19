import type { PanelId } from '../screens/OnboardingLayout'
import type { WorkspaceAboutProps } from '../blocks/ShellAccount'
import type { TeamScopeProps } from './team'
import type { Copy } from './copy'
import type { RawAudit, RawPerson } from './updates-feed'
import type { ReleaseDetail, ReleaseGroup, ReleasesView } from './releases'
import type { StageSettings } from './projectSecrets'
import type { I18nNode } from '@pikku/react'
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

export type Open = (panel: PanelId | '') => void

export type StageAuditPage = {
  readable: boolean
  events: RawAudit[]
  users: Record<string, RawPerson>
}

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

export type Slots = {
  SignInHero?: ComponentType<{ st: string; loading: boolean; open: Open; done: () => void }>
  SignInOffer?: ComponentType<{ loading: boolean; open: Open; done: () => void }>
  AiHero?: ComponentType<{ st: string; loading: boolean; open: Open; retry: () => void; done: () => void }>
  AiOffer?: ComponentType<{ open: Open }>
  /** Wording a host replaces; anything left out reads neutral. */
  copy?: Partial<Copy>
  PublishTarget?: ComponentType
  ShellAccount?: ComponentType<{ expanded: boolean; onOpen: () => void; onAccount: () => void; collapsed?: boolean }>
  WorkspaceAbout?: ComponentType<WorkspaceAboutProps>
  AccountName?: ComponentType
  TeamName?: ComponentType<{ children: (name: string) => ReactNode }>
  TeamScope?: ComponentType<TeamScopeProps>
  ProjectTargetProvider?: ComponentType<{ children: ReactNode }>
  ProjectTargetSwitcher?: ComponentType<{ collapsed: boolean }>
  ProjectNav?: ComponentType<{ itemClass: string; labelClass: string; collapsed: boolean }>
  TeamNav?: ComponentType<{ itemClass: string; labelClass: string; collapsed: boolean }>
  /** History of the deployed copy of a project; absent where nothing deploys. A hook, called every render. */
  useStageAudit?: (projectKey: string, refetchInterval: number) => { data?: StageAuditPage }
  /** Requests and speed of a published copy, by target name; null asks only where the site is. A hook, called every render. */
  useLiveMetrics?: (name: string | null, hours: number) => LiveMetrics
  /** How often each analytics event fired on a published copy over the last days; null when that copy is not published. A hook, called every render. */
  useAnalyticsEventCounts?: (stageName: string | null, days: number) => AnalyticsEventCounts | null
  useReleases?: (projectKey: string) => ReleasesView
  useReleaseDetail?: (projectKey: string, id: string, wanted: boolean) => ReleaseDetail
  /** The published copy's secrets and settings; null when the open copy is not a published one. A hook, called every render. */
  useStageSettings?: (projectKey: string, settingIds: string[]) => StageSettings | null
  /** What the next publish would change against what is live; null when unknown or nothing deploys. A hook, called every render. */
  useReleasePreview?: (projectKey: string) => ReleaseGroup[] | null
  /** One row saying how published versions go live, with its own form; absent where nothing deploys. */
  ReleaseMode?: ComponentType
  /** Recent messages the live copy sent to other services; absent where nothing deploys. */
  ReleaseSent?: ComponentType
  useLiveUpdates?: (queryKeys: readonly string[]) => void
  RailFoot?: ComponentType<{ collapsed: boolean }>
  LiveAppHealth?: ComponentType
  Workspaces?: ComponentType
  StageLogs?: ComponentType<{ name: string }>
  /** Where the project is published, shown in the chat panel above the message box. */
  ChatPublishStatus?: ComponentType<{ projectKey: string }>
  /**
   * The host's own place to bring a project in from, shown first in the New project "bring it in" panel.
   * It renders nothing when it cannot be reached and reports through onActive whether it is showing, so the
   * link import below stays the main way in when the host is offline.
   */
  ImportSource?: ComponentType<{ onImported: (project: string, team?: string) => void; onActive: (active: boolean) => void }>
  /** Starting from a terminal instead, folded under developer details in the same panel. */
  ImportDeveloper?: ComponentType
}

export const SlotsCtx = createContext<Slots>({})
export const useSlots = () => useContext(SlotsCtx)
