import type { I18nNode } from '@pikku/react'
import { useNavigate } from '@tanstack/react-router'
import { useProjectTarget } from '../lib/project-target'
import { ProjectRunGate } from './ProjectRunGate'

export function TargetRunGate({ children }: { children: I18nNode }) {
  const target = useProjectTarget()
  const navigate = useNavigate()
  if (target.kind !== 'stage') return <ProjectRunGate>{children}</ProjectRunGate>
  const wayOut = {
    name: target.name,
    onPublish: () => void navigate({ to: '/publish' as never, search: ((prev: object) => prev) as never }),
    onWorkspace: () => target.openWorkspace?.(),
  }
  return <ProjectRunGate target={{ kind: 'stage', live: target.live ?? false, wayOut }}>{children}</ProjectRunGate>
}
