import type { ReactNode } from 'react'
import { useSearch } from '@tanstack/react-router'

// Which team the URL is scoped to (see project-url.ts). The open edition has one: `local`.
export const LOCAL_TEAM = 'local'

export type TeamVerdict = 'ok' | 'pending' | 'missing' | { to: string }

export type TeamScopeProps = { team: string | undefined; children: (verdict: TeamVerdict) => ReactNode }

export const teamVerdict = ({ team, teams, fallback, fetching }: { team: string | undefined; teams: string[]; fallback: string | undefined; fetching: boolean }): TeamVerdict => {
  if (!team) return fallback ? { to: fallback } : 'ok'
  if (teams.includes(team)) return 'ok'
  return fetching ? 'pending' : 'missing'
}

export const useTeamSlug = () => (useSearch({ strict: false }) as { team?: string }).team ?? ''
