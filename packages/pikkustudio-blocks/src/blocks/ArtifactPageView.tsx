import { asI18n } from '@pikku/react'
import { ArtifactFrame } from './ArtifactFrame'
import type { Artifact } from '../types/artifacts'

export function ArtifactPageView({ item, device }: { item: Artifact; device: 'computer' | 'tablet' | 'phone' }) {
  return (
    <div className="grid min-h-full place-items-center rounded-card border border-border bg-secondary p-6 shadow-card">
      {device === 'computer' ? (
        <div className="w-full max-w-[860px] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-border bg-secondary px-3 py-2">
            <i className="size-2.5 rounded-full bg-[#FF6F61]" />
            <i className="size-2.5 rounded-full bg-[#FFC83D]" />
            <i className="size-2.5 rounded-full bg-[#00767E]" />
            <span className="ms-3 h-5 flex-1 truncate rounded-full bg-card px-3 text-[12px] leading-5 text-muted-foreground">{asI18n(item.title)}</span>
          </div>
          <div className="aspect-[8/5]">
            <ArtifactFrame html={item.html ?? ''} title={asI18n(item.title)} />
          </div>
        </div>
      ) : (
        <div className={`max-w-full overflow-hidden rounded-[2rem] border-[10px] border-foreground bg-card shadow-lg ${device === 'tablet' ? 'w-[28rem]' : 'w-[20rem]'}`}>
          <div className="h-130 overflow-hidden">
            <ArtifactFrame html={item.html ?? ''} title={asI18n(item.title)} />
          </div>
        </div>
      )}
    </div>
  )
}
