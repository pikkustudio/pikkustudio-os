import { FileText, LayoutPanelTop, Palette } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { keep } from '../lib/links'
import { artifactWhen, type Artifact } from '../types/artifacts'

export const artifactIcons = { Design: Palette, Page: LayoutPanelTop, Document: FileText }

export function ArtifactRow({ item }: { item: Artifact }) {
  const Icon = artifactIcons[item.kind]
  return (
    <li>
    <Link {...keep} to="/artifacts/$id" params={{ id: item.id }} className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3.5 rounded-card border border-border bg-card px-3.5 py-2.5 text-foreground no-underline shadow-card hover:border-muted-foreground @min-[860px]/row:grid-cols-[2.75rem_minmax(0,1fr)_8.5rem]" aria-label={item.title}>
      <span title={item.kind} role="img" aria-label={item.kind} className="grid size-11 place-items-center rounded-lg bg-secondary text-ink-2">
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <b className="truncate text-[16px] leading-[1.3]">{item.title}</b>
        <span className="truncate text-[14px] text-ink-2">{item.summary}</span>
      </div>
      <span className="hidden text-[14px] text-muted-foreground @min-[860px]/row:block">{artifactWhen(item.at)}</span>
    </Link>
    </li>
  )
}
