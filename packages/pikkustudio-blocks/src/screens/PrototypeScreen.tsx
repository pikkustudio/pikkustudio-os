import { useSearch } from '@tanstack/react-router'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ArtifactOpen } from '../blocks/ArtifactOpen'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import type { Artifact } from '../types/artifacts'

export function PrototypeScreen() {
  const key = useProjectKey()
  const { item } = useSearch({ strict: false }) as { item?: string }
  const all = useProjectQuery<{ artifacts: Artifact[] }>(key, 'console:listArtifacts', null, { refetchInterval: 4000 })
  return (
    <QueryState query={all} skeleton={<CardsSkeleton count={1} />}>
      {({ artifacts }) => {
        const pages = artifacts.filter((a) => a.kind !== 'Document')
        const one = pages.find((a) => a.id === item) ?? pages[0]
        return <ArtifactOpen key={one?.id} all={pages} item={one} />
      }}
    </QueryState>
  )
}
