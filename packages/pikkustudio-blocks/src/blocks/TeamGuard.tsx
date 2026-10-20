import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { isTeamScoped } from '../lib/project-url'
import { useShellAccount } from '../lib/account'
import { LOCAL_TEAM, teamVerdict, useTeamSlug, type TeamScopeProps, type TeamVerdict } from '../lib/team'
import { NotFoundPage } from './NotFoundPage'
import { StudioLoading } from './StudioLoading'

// The URL's team must be `local` or one of the signed-in account's teams; a URL without one takes the current one.
// While studio:account is first read the page waits; if it cannot be read, the page shows and its own reads fail.
function TeamScope({ team, children }: TeamScopeProps) {
  const account = useShellAccount()
  if (account.isPending) return children('pending')
  if (account.isError) return children('ok')
  const teams = [LOCAL_TEAM, ...account.data.teams.map((t) => t.slug)]
  return children(teamVerdict({ team, teams, fallback: account.data.currentTeam ?? LOCAL_TEAM, fetching: account.isFetching }))
}

function Gate({ verdict, onTeam, children }: { verdict: TeamVerdict; onTeam: (slug: string) => void; children: ReactNode }) {
  const to = typeof verdict === 'object' ? verdict.to : undefined
  useEffect(() => {
    if (to) onTeam(to)
  }, [to])
  if (verdict === 'missing') return <NotFoundPage />
  if (verdict === 'pending' || to) return <StudioLoading />
  return children
}

// Puts the team into a URL that lacks it, so every page under a team reads /<team>/...
export function TeamGuard({ children }: { children: ReactNode }) {
  const team = useTeamSlug() || undefined
  const scoped = useLocation({ select: (l) => isTeamScoped(l.pathname) })
  const navigate = useNavigate()
  if (!scoped) return children
  const onTeam = (slug: string) => {
    if (slug !== team) navigate({ to: '.', search: ((prev: object) => ({ ...prev, team: slug })) as never, replace: true })
  }
  return <TeamScope team={team}>{(verdict) => <Gate verdict={verdict} onTeam={onTeam}>{children}</Gate>}</TeamScope>
}
