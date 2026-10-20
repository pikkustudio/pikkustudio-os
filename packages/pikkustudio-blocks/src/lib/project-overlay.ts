import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { Project } from '../blocks/ProjectCard'
import type { ListedProject } from '../blocks/TeamProjects'
import { ago } from './virtualUsers'

/** What a host adds to a project's card on the Projects screen. */
export type ProjectOverlay = Partial<Pick<Project, 'state' | 'note' | 'when' | 'usage' | 'live' | 'attention' | 'workingNow' | 'image' | 'repoUrl' | 'favourite' | 'visitedAt'>>

/** What a host knows about a listed project (studio:listProjects' `overview`, from a project decorator), as plain data. */
export type ProjectOverview = {
  state: 'progress' | 'live' | 'sketch' | null
  problem: 'setup_failed' | 'publish_failed' | 'not_answering' | 'visits_failing' | null
  livePlaces: number | null
  attention: number
  updatedAt: string | null
  visits: number | null
  image: string | null
  repoUrl: string | null
  favourite: boolean
  visitedAt: string | null
}

const PROBLEM = {
  setup_failed: () => m.project_state__setup_failed(),
  publish_failed: () => m.project_state__publish_failed(),
  not_answering: () => m.project_state__not_answering(),
  visits_failing: () => m.project_state__visits_failing(),
} as const

const compact = (n: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)

/** A listed project's overview as card fields. A project open or busy on this computer keeps its own state. */
export function overlayOf(p: ListedProject): ProjectOverlay {
  const o = p.overview
  if (!o) return {}
  const seen = { visitedAt: o.visitedAt ?? undefined, favourite: o.favourite }
  if (!o.state) return seen
  const keepLocal = p.location !== 'cloud' && (p.open || p.busy)
  return {
    ...(keepLocal ? {} : { state: o.state }),
    note: o.problem ? PROBLEM[o.problem]() : undefined,
    live: o.livePlaces !== null ? { places: o.livePlaces } : null,
    attention: o.attention || undefined,
    when: o.updatedAt ? ago(o.updatedAt) : undefined,
    usage: o.visits ? m.project_state__visits_week({ count: asI18n(compact(o.visits)) }) : undefined,
    image: o.image,
    repoUrl: o.repoUrl,
    ...seen,
  }
}
