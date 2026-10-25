import { asI18n } from '@pikku/react'
import { ArtifactFrame } from './ArtifactFrame'
import type { Artifact } from '../types/artifacts'

export function ArtifactDesignView({ item }: { item: Artifact }) {
  return (
    <div className="flex h-full min-h-96 rounded-card border border-border bg-secondary p-6 shadow-card">
      <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <ArtifactFrame html={item.html ?? ''} title={asI18n(item.title)} />
      </div>
    </div>
  )
}
