import { createContext, useContext } from 'react'

export type AddonNavItem = { splat: string; label: string; to?: string }
export type AddonNav = { title: string; items: readonly AddonNavItem[]; current: string; back?: { to: string; label: string } }

export const AddonNavContext = createContext<AddonNav | null>(null)

export const useAddonNav = () => useContext(AddonNavContext)
