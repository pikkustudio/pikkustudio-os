import { useSearch } from '@tanstack/react-router'

// Which team the URL is scoped to (see project-url.ts). The open edition has one: `local`.
export const LOCAL_TEAM = 'local'

export type TeamScopeProps = { team: string | undefined; onTeam: (slug: string) => void }

export const useTeamSlug = () => (useSearch({ strict: false }) as { team?: string }).team ?? ''
