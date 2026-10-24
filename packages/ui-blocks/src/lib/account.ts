import { keepPreviousData, type UseQueryResult } from '@tanstack/react-query'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import type { Account, AccountTeam } from './onboarding'
import { useTeamSlug } from './team'

// studio:account for the team in the URL: who is signed in, their teams, the current one and their scopes in it.
// The rail reads it on every page, so it stays fresh for a minute and keeps the last answer while the team changes:
// the foot and the nav never blank out between pages.
export const ACCOUNT_STALE_MS = 60_000

export const useShellAccount = () => {
  const team = useTeamSlug() || undefined
  return usePikkuQuery('studio:account', { team }, { staleTime: ACCOUNT_STALE_MS, placeholderData: keepPreviousData } as never) as UseQueryResult<Account>
}

/** The team the URL names, or the account's current one; null on this computer. */
export const useCurrentTeam = (): AccountTeam | null => {
  const account = useShellAccount().data
  return account?.teams.find((t) => t.slug === account.currentTeam) ?? null
}
