import type { PanelId } from '../screens/OnboardingLayout'
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

export type Open = (panel: PanelId | '') => void

export type Slots = {
  SignInOffer?: ComponentType<{ loading: boolean; open: Open }>
  AiOffer?: ComponentType<{ open: Open }>
  Pitch?: ComponentType<{ href: string; variant?: 'a' | 'b'; avatar: ReactNode; onClose: () => void }>
  PublishTarget?: ComponentType
}

export const SlotsCtx = createContext<Slots>({})
export const useSlots = () => useContext(SlotsCtx)
