import { matchScreen, splitAddonPath } from './match'
import type { AddonScreenDef, InstalledAddon } from './registry'

export type ResolvedAddonScreen = {
  addon: InstalledAddon
  screen: AddonScreenDef
  params: Record<string, string>
}

export const resolveAddonScreen = (
  addons: readonly InstalledAddon[],
  splat: string
): ResolvedAddonScreen | null => {
  const { name, subpath } = splitAddonPath(splat)
  const addon = addons.find((candidate) => candidate.name === name)
  if (!addon) return null
  const match = matchScreen(addon.screens, subpath)
  return match ? { addon, screen: match.screen, params: match.params } : null
}
