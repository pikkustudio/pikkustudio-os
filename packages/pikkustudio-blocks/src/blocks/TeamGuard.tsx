import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { isTeamScoped } from '../lib/project-url'
import { useSlots } from '../lib/slots'
import { LOCAL_TEAM, useTeamSlug, type TeamScopeProps } from '../lib/team'

function LocalTeamScope({ team, onTeam }: TeamScopeProps) {
  useEffect(() => {
    if (team !== LOCAL_TEAM) onTeam(LOCAL_TEAM)
  }, [team])
  return null
}

// Puts the team into a URL that lacks it, or corrects one the person cannot be in, so every
// page under a team reads /<team>/... and old /<owner>/<project> links land in the right place.
export function TeamGuard() {
  const team = useTeamSlug() || undefined
  const scoped = useLocation({ select: (l) => isTeamScoped(l.pathname) })
  const navigate = useNavigate()
  const Scope = useSlots().TeamScope ?? LocalTeamScope
  if (!scoped) return null
  const onTeam = (slug: string) => {
    if (slug !== team) navigate({ to: '.', search: ((prev: object) => ({ ...prev, team: slug })) as never, replace: true })
  }
  return <Scope team={team} onTeam={onTeam} />
}
