import type { PanelId } from '../screens/OnboardingLayout'
import type { WorkspaceAboutProps } from '../blocks/ShellAccount'
import type { TeamScopeProps } from './team'
import type { Copy } from './copy'
import type { RawAudit, RawPerson } from './updates-feed'
import type { ReleaseDetail, ReleaseGroup, ReleasesView } from './releases'
import type { I18nNode } from '@pikku/react'
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

export type Open = (panel: PanelId | '') => void

export type StageAuditPage = {
  readable: boolean
  events: RawAudit[]
  users: Record<string, RawPerson>
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
  useReleases?: (projectKey: string) => ReleasesView
  useReleaseDetail?: (projectKey: string, id: string, wanted: boolean) => ReleaseDetail
  /** What the next publish would change against what is live; null when unknown or nothing deploys. A hook, called every render. */
  useReleasePreview?: (projectKey: string) => ReleaseGroup[] | null
  /** One row saying how published versions go live, with its own form; absent where nothing deploys. */
  ReleaseMode?: ComponentType
  /** Recent messages the live copy sent to other services; absent where nothing deploys. */
  ReleaseSent?: ComponentType
  useLiveUpdates?: (queryKeys: readonly string[]) => void
  RailFoot?: ComponentType<{ collapsed: boolean }>
  LiveAppHealth?: ComponentType
  StageLogs?: ComponentType<{ name: string }>
  /** Where the project is published, shown in the chat panel above the message box. */
  ChatPublishStatus?: ComponentType<{ projectKey: string }>
}

export const SlotsCtx = createContext<Slots>({})
export const useSlots = () => useContext(SlotsCtx)
