import { installedAddons as generated } from '@project/functions/installed-addons'
import type { ComponentType } from 'react'

export type AddonScreenDef = {
  path: string
  title: string
  nav?: boolean
  scopes?: readonly string[]
  component?: () => Promise<{ default: ComponentType<{ params: Record<string, string>; navigate: (path: string) => void }> }>
  app?: string
}

export type InstalledAddon = {
  name: string
  title: string
  icon?: string
  screens: readonly AddonScreenDef[]
}

export const installedAddons: readonly InstalledAddon[] = generated
