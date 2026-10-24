import { ForbiddenError } from '@pikku/core/errors'
import { pikkuState } from '@pikku/core/state'

type WiredAddon = { uses?: Record<string, string> }

export const usedAddonNames = (caller: string): string[] => {
  const wired = pikkuState(null, 'addons', 'packages').get(caller) as WiredAddon | undefined
  return Object.values(wired?.uses ?? {})
}

export function assertAddonMayReach(
  caller: string,
  rpcName: string | undefined,
  usedBy: (caller: string) => string[] = usedAddonNames
): void {
  if (!rpcName) return
  const colon = rpcName.indexOf(':')
  const target = colon > 0 ? rpcName.slice(0, colon) : ''
  if (target === caller || (target && usedBy(caller).includes(target))) return
  throw new ForbiddenError(`Addon '${caller}' cannot call '${rpcName}': it does not list that add-on in its uses.`)
}
