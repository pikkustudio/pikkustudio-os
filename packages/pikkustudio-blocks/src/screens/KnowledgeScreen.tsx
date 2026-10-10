import { useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { KnowledgeBrowser } from '../blocks/KnowledgeBrowser'
import { KnowledgeHead } from '../blocks/KnowledgeHead'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { knowledgeGraph, notesFromBundle, type KnowledgeBundle } from '../lib/knowledge'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import type { Intake } from '../lib/interview'
import { Page } from '../blocks/Page'
import { KnowledgeInterview } from './KnowledgeInterview'

function Knowledge({ bundle, interview }: { bundle: KnowledgeBundle | null; interview: boolean }) {
  const { notes, missing, order } = useMemo(() => notesFromBundle(bundle ?? { notes: [], sections: [] }), [bundle])
  const { linkCount } = knowledgeGraph(notes, missing)
  const { note } = useSearch({ strict: false }) as { note?: string }
  return (
    <>
      {interview ? null : <KnowledgeHead notes={notes} linkCount={linkCount} />}
      <KnowledgeBrowser notes={notes} missing={missing} order={order} note={note} />
    </>
  )
}

export function KnowledgeScreen() {
  const key = useProjectKey()
  const bundle = useProjectQuery<KnowledgeBundle | null>(key, 'console:getKnowledge', {}, { refetchInterval: 5000 })
  const projectKey = key
  const intake = usePikkuQuery('studio:projectIntake' as never, { key: projectKey } as never, { enabled: !!projectKey } as never) as unknown as { data?: Intake }
  const interview = intake.data?.path === 'interview' && !intake.data.done
  return (
    <Page gap="snug">
      {interview ? <KnowledgeInterview /> : null}
      <QueryState query={bundle} skeleton={<CardsSkeleton count={3} />}>
        {(data) => <Knowledge bundle={data} interview={!!interview} />}
      </QueryState>
    </Page>
  )
}
