import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { keep } from '../lib/links'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'
import { PreviewBar } from './PreviewBar'
import { ArtifactDesignView } from './ArtifactDesignView'
import { ArtifactPageView } from './ArtifactPageView'
import { ArtifactDocView } from './ArtifactDocView'
import type { Artifact } from '../types/artifacts'
import type { PageGroup } from './PageBreadcrumb'
import type { Device } from '../types/designTypes'

const kinds: Array<[Artifact['kind'], string]> = [['Design', 'Designs'], ['Page', 'Pages'], ['Document', 'Documents']]
const groupsOf = (all: Artifact[]): PageGroup[] => kinds.map(([kind, label]) => ({ app: kind, label, pages: all.filter((a) => a.kind === kind).map((a) => ({ id: a.id, name: a.title, text: a.summary })) }))

export function ArtifactOpen({ item, all }: { item?: Artifact; all: Artifact[] }) {
  const go = useNavigate()
  const [device, setDevice] = useState<Device>(item?.device ?? 'computer')
  const [reloadKey, setReloadKey] = useState(0)
  if (!item)
    return (
      <EmptyState layout="row" title={m.artifact_open__we_could_not_find()} text={m.artifact_open__it_may_have_been()}>
        <Button asChild variant="bordered" size="page">
          <Link {...keep} to="/artifacts">{m.artifact_open__see_all_artifacts()}</Link>
        </Button>
      </EmptyState>
    )
  return (
    <div className="flex h-full flex-col gap-3">
      <PreviewBar
        app={item.kind}
        page={item.id}
        noun="Artifact"
        groups={groupsOf(all)}
        device={device}
        hideDevice={item.kind !== 'Page'}
        tool=""
        tools={[]}
        onPick={(_, id) => go({ ...keep, to: '/artifacts/$id', params: { id } })}
        onDevice={setDevice}
        onTool={() => {}}
        onReload={() => setReloadKey((k) => k + 1)}
        actions={
          <Button asChild variant="bordered" size="compact">
            <Link {...keep} to="/artifacts">
              <ArrowLeft className="size-4.5" />
              
              {m.artifact_open__all_artifacts()}
            </Link>
          </Button>
        }
      />
      <div key={`${item.id}-${reloadKey}`} className="min-h-0 flex-1 overflow-auto">
        {item.kind === 'Design' ? <ArtifactDesignView item={item} /> : item.kind === 'Page' ? <ArtifactPageView item={item} device={device} /> : <ArtifactDocView item={item} />}
      </div>
    </div>
  )
}
