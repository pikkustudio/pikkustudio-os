import type { PanelId } from '../screens/OnboardingLayout'
import type { WorkspaceAboutProps } from '../blocks/ShellAccount'
import type { TeamScopeProps } from './team'
import type { Copy } from './copy'
import type { RawAudit, RawPerson } from './updates-feed'
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
  /** History of the deployed copy of a project; absent where nothing deploys. A hook, called every render. */
  useStageAudit?: (projectKey: string, refetchInterval: number) => { data?: StageAuditPage }
  useLiveUpdates?: (queryKeys: readonly string[]) => void
  RailFoot?: ComponentType<{ collapsed: boolean }>
}

export const SlotsCtx = createContext<Slots>({})
export const useSlots = () => useContext(SlotsCtx)
