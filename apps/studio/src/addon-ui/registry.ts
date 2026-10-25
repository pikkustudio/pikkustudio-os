import { installedAddons as generated } from '@project/functions/installed-addons'
import type { ComponentType } from 'react'

export type AddonScreenDef = {
  path: string
  title: string
  nav?: { area: string; icon: string; order: number; badge?: string }
  scopes?: readonly string[]
  /** A first-party addon's screen in place of a core one (scripts/gen-addons.mjs allows it only for those). */
  replaces?: boolean
  /** 'bare' (the only one definePlugin allows) renders without the shell. */
  layout?: string
  /** The agent the screen opens (see NavScreen); agentTitle and agentDescription are message keys. */
  agent?: string
  agentTitle?: string
  agentDescription?: string
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
