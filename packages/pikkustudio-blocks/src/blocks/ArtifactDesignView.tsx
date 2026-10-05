import { ArtifactFrame } from './ArtifactFrame'
import type { Artifact } from '../types/artifacts'

export function ArtifactDesignView({ item }: { item: Artifact }) {
  return (
    <div className="grid place-items-center rounded-card border border-border bg-secondary p-6 shadow-card">
      <div className="aspect-[8/5] w-full max-w-[860px] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <ArtifactFrame html={item.html ?? ''} title={item.title} />
      </div>
    </div>
  )
}
