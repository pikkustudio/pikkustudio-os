import { createContext, useContext } from 'react'

export type AddonNavItem = { splat: string; label: string }
export type AddonNav = { title: string; items: readonly AddonNavItem[]; current: string }

export const AddonNavContext = createContext<AddonNav | null>(null)

export const useAddonNav = () => useContext(AddonNavContext)
