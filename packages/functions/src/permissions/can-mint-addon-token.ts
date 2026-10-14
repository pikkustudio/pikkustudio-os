import { pikkuPermission } from '#pikku/auth'
import { ADDONS_KEY, readInstalledAddons } from '../lib/addons-project.js'

export const canMintAddonToken = pikkuPermission<{ addon: string }>(async ({ studio }, { addon }, { session }) => {
  if (!session?.userId) return false
  const running = await studio.projects.open(ADDONS_KEY)
  const installed = await readInstalledAddons(running.worktree)
  return installed.some((entry) => entry.name === addon)
})
