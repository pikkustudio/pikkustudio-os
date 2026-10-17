import type { PanelId } from '../screens/OnboardingLayout'
import type { WorkspaceAboutProps } from '../blocks/ShellAccount'
import type { TeamScopeProps } from './team'
import type { Copy } from './copy'
import type { RawAudit, RawPerson } from './updates-feed'
import type { ReleaseDetail, ReleasesView } from './releases'
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

export type Slots = {
  SignInHero?: ComponentType<{ st: string; loading: boolean; open: Open; done: () => void }>
  SignInOffer?: ComponentType<{ loading: boolean; open: Open; done: () => void }>
  AiHero?: ComponentType<{ st: string; loading: boolean; open: Open; retry: () => void; done: () => void }>
  AiOffer?: ComponentType<{ open: Open }>
  /** Wording a host replaces; anything left out reads neutral. */
  copy?: Partial<Copy>
  PublishTarget?: ComponentType
  ShellAccount?: ComponentType<{ expanded: boolean; onOpen: () => void; onAccount: () => void }>
  WorkspaceAbout?: ComponentType<WorkspaceAboutProps>
  AccountName?: ComponentType
  TeamName?: ComponentType<{ children: (name: string) => ReactNode }>
  TeamScope?: ComponentType<TeamScopeProps>
  ProjectTargetProvider?: ComponentType<{ children: ReactNode }>
  ProjectTargetSwitcher?: ComponentType<{ collapsed: boolean }>
  ProjectNav?: ComponentType<{ itemClass: string; labelClass: string; collapsed: boolean }>
  /** History of the deployed copy of a project; absent where nothing deploys. A hook, called every render. */
  useStageAudit?: (projectKey: string, refetchInterval: number) => { data?: StageAuditPage }
  /** Requests and speed of a published copy, by target name; null asks only where the site is. A hook, called every render. */
  useLiveMetrics?: (name: string | null, hours: number) => LiveMetrics
  useReleases?: (projectKey: string) => ReleasesView
  useReleaseDetail?: (projectKey: string, id: string, wanted: boolean) => ReleaseDetail
  /** The published copy's secrets and settings; null when the open copy is not a published one. A hook, called every render. */
  useStageSettings?: (projectKey: string, settingIds: string[]) => StageSettings | null
  useLiveUpdates?: (queryKeys: readonly string[]) => void
  RailFoot?: ComponentType<{ collapsed: boolean }>
  LiveAppHealth?: ComponentType
  StageLogs?: ComponentType<{ name: string }>
  /** Where the project is published, shown in the chat panel above the message box. */
  ChatPublishStatus?: ComponentType<{ projectKey: string }>
}

export const SlotsCtx = createContext<Slots>({})
export const useSlots = () => useContext(SlotsCtx)
