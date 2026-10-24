import { m } from '@/i18n/messages'
import { PageHead } from './PageHead'
import type { Note } from '../types/knowledge'
import { useProjectName } from '../lib/project'

export function KnowledgeHead({ notes, linkCount }: { notes: Note[]; linkCount: number }) {
  const projectName = useProjectName()
  return (
    <PageHead size="lead" crumb={projectName} title={m.knowledge_head__why_your_app_is()} text={m.knowledge_head__a_written_record_of()}>
      {notes.length ? (
        <div className="flex items-center gap-5 text-[15px] text-ink-2">
          <span>
            <b className="me-1 font-heading text-[20px] text-foreground tabular-nums">{notes.length}</b>{m.knowledge_head__notes()}
          </span>
          <span>
            <b className="me-1 font-heading text-[20px] text-foreground tabular-nums">{linkCount}</b>{m.knowledge_head__links()}
          </span>
        </div>
      ) : null}
    </PageHead>
  )
}
