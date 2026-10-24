import type { ReactNode } from 'react'
import { useSearch } from '@tanstack/react-router'

// Which team the URL is scoped to (see project-url.ts). The open edition has one: `local`.
export const LOCAL_TEAM = 'local'

export type TeamVerdict = 'ok' | 'pending' | 'missing' | 'unreachable' | { to: string }

export type TeamScopeProps = { team: string | undefined; children: (verdict: TeamVerdict, retry: () => void) => ReactNode }

export const teamVerdict = ({ team, teams, fallback, fetching }: { team: string | undefined; teams: string[]; fallback: string | undefined; fetching: boolean }): TeamVerdict => {
  if (!team) return fallback ? { to: fallback } : 'ok'
  if (teams.includes(team)) return 'ok'
  return fetching ? 'pending' : 'missing'
}

/**
 * When studio:account could not be read: a team URL says the account can't be reached (the backend fails a team's
 * account read rather than answering this computer); this computer and a URL without a team carry on.
 */
export const unreadableVerdict = (team: string | undefined): TeamVerdict => (team && team !== LOCAL_TEAM ? 'unreachable' : 'ok')

export const useTeamSlug = () => (useSearch({ strict: false }) as { team?: string }).team ?? ''
