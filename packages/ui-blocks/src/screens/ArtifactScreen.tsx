import { useParams } from '@tanstack/react-router'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ArtifactOpen } from '../blocks/ArtifactOpen'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import type { Artifact } from '../types/artifacts'

export function ArtifactScreen() {
  const { id } = useParams({ strict: false })
  const key = useProjectKey()
  const all = useProjectQuery<{ artifacts: Artifact[] }>(key, 'console:listArtifacts', null)
  const one = useProjectQuery<{ artifact: Artifact | null }>(key, 'console:getArtifact', { id })
  return (
    <QueryState query={one} skeleton={<CardsSkeleton count={1} />}>
      {(data) => <ArtifactOpen key={id} all={all.data?.artifacts ?? []} item={data.artifact ?? undefined} />}
    </QueryState>
  )
}
