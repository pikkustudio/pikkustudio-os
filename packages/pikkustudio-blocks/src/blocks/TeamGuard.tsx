import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { isTeamScoped } from '../lib/project-url'
import { useSlot } from '../lib/studio-slots'
import { LOCAL_TEAM, teamVerdict, useTeamSlug, type TeamScopeProps, type TeamVerdict } from '../lib/team'
import { NotFoundPage } from './NotFoundPage'
import { StudioLoading } from './StudioLoading'

function LocalTeamScope({ team, children }: TeamScopeProps) {
  return children(teamVerdict({ team, teams: [LOCAL_TEAM], fallback: LOCAL_TEAM, fetching: false }))
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
  const Scope = useSlot('team.scope', LocalTeamScope)
  if (!scoped) return children
  const onTeam = (slug: string) => {
    if (slug !== team) navigate({ to: '.', search: ((prev: object) => ({ ...prev, team: slug })) as never, replace: true })
  }
  return <Scope team={team}>{(verdict) => <Gate verdict={verdict} onTeam={onTeam}>{children}</Gate>}</Scope>
}
