import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { isTeamScoped } from '../lib/project-url'
import { useShellAccount } from '../lib/account'
import { LOCAL_TEAM, teamVerdict, unreadableVerdict, useTeamSlug, type TeamScopeProps, type TeamVerdict } from '../lib/team'
import { AccountUnreachable } from './AccountUnreachable'
import { NotFoundPage } from './NotFoundPage'
import { StudioLoading } from './StudioLoading'

// The URL's team must be `local` or one of the signed-in account's teams; a URL without one takes the current one.
// While studio:account is first read the page waits; if it cannot be read, a team's page says the account can't be
// reached (with a retry), and this computer's pages show as usual.
function TeamScope({ team, children }: TeamScopeProps) {
  const account = useShellAccount()
  const retry = () => void account.refetch()
  if (account.isPending) return children('pending', retry)
  if (account.isError) return children(unreadableVerdict(team), retry)
  const teams = [LOCAL_TEAM, ...account.data.teams.map((t) => t.slug)]
  return children(teamVerdict({ team, teams, fallback: account.data.currentTeam ?? LOCAL_TEAM, fetching: account.isFetching }), retry)
}

function Gate({ verdict, onTeam, retry, children }: { verdict: TeamVerdict; onTeam: (slug: string) => void; retry: () => void; children: ReactNode }) {
  const to = typeof verdict === 'object' ? verdict.to : undefined
  useEffect(() => {
    if (to) onTeam(to)
  }, [to])
  if (verdict === 'missing') return <NotFoundPage />
  if (verdict === 'unreachable') return <AccountUnreachable onRetry={retry} />
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
  return <TeamScope team={team}>{(verdict, retry) => <Gate verdict={verdict} onTeam={onTeam} retry={retry}>{children}</Gate>}</TeamScope>
}
