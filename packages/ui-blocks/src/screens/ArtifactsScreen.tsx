import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { ArtifactsGallery } from '../blocks/ArtifactsGallery'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { ShellCtx } from '../lib/shell'
import type { Artifact } from '../types/artifacts'

export function ArtifactsScreen() {
  const projectName = useProjectName()
  const key = useProjectKey()
  const { view, say } = useContext(ShellCtx)
  const artifacts = useProjectQuery<{ artifacts: Artifact[] }>(key, 'console:listArtifacts', null, { refetchInterval: 4000 })
  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.artifacts_screen__title()} text={m.artifacts_screen__text()} size="lead" />
      <QueryState query={artifacts} skeleton={<CardsSkeleton count={3} />}>
        {(data) => <ArtifactsGallery key={view} view={view} items={data.artifacts} onAsk={say} />}
      </QueryState>
    </Page>
  )
}
