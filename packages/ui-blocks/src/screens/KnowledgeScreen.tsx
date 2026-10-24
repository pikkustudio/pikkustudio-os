import { useParams } from '@tanstack/react-router'
import { useMemo } from 'react'
import { KnowledgeBrowser } from '../blocks/KnowledgeBrowser'
import { KnowledgeHead } from '../blocks/KnowledgeHead'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { knowledgeGraph, notesFromBundle, type KnowledgeBundle } from '../lib/knowledge'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { Page } from '../blocks/Page'

function Knowledge({ bundle }: { bundle: KnowledgeBundle | null }) {
  const { notes, missing, order } = useMemo(() => notesFromBundle(bundle ?? { notes: [], sections: [] }), [bundle])
  const { linkCount } = knowledgeGraph(notes, missing)
  const note = (useParams({ strict: false }) as { _splat?: string })._splat || undefined
  return (
    <>
      <KnowledgeHead notes={notes} linkCount={linkCount} />
      <KnowledgeBrowser notes={notes} missing={missing} order={order} note={note} />
    </>
  )
}

export function KnowledgeScreen() {
  const key = useProjectKey()
  const bundle = useProjectQuery<KnowledgeBundle | null>(key, 'console:getKnowledge', {}, { refetchInterval: 5000 })
  return (
    <Page gap="snug">
      <QueryState query={bundle} skeleton={<CardsSkeleton count={3} />}>
        {(data) => <Knowledge bundle={data} />}
      </QueryState>
    </Page>
  )
}
