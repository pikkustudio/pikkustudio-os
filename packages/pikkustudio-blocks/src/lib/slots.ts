import type { PanelId } from '../screens/OnboardingLayout'
import type { WorkspaceAboutProps } from '../blocks/ShellAccount'
import type { TeamScopeProps } from './team'
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

export type Open = (panel: PanelId | '') => void

export type Slots = {
  SignInHero?: ComponentType<{ st: string; loading: boolean; open: Open; done: () => void }>
  SignInOffer?: ComponentType<{ loading: boolean; open: Open; done: () => void }>
  AiHero?: ComponentType<{ st: string; loading: boolean; open: Open; retry: () => void; done: () => void }>
  AiOffer?: ComponentType<{ open: Open }>
  Pitch?: ComponentType<{ href: string; variant?: 'a' | 'b'; avatar: ReactNode; onClose: () => void }>
  PublishTarget?: ComponentType
  ShellAccount?: ComponentType<{ expanded: boolean; onOpen: () => void; onAccount: () => void }>
  WorkspaceAbout?: ComponentType<WorkspaceAboutProps>
  AccountName?: ComponentType
  TeamScope?: ComponentType<TeamScopeProps>
}

export const SlotsCtx = createContext<Slots>({})
export const useSlots = () => useContext(SlotsCtx)
